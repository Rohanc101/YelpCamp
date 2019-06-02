//jshint esversion:6
const express = require("express");
const router = express.Router();
const Campground = require("../models/campground");
const middleware = require("../middleware");
const multer = require('multer');
const NodeGeocoder = require('node-geocoder');
const Review = require("../models/review");
const Comment = require("../models/comment");
const Notification = require("../models/notification");
const User = require("../models/user");

const options = {
    provider: 'google',

    // Optional depending on the providers
    httpAdapter: 'https', // Default
    apiKey: process.env.GEOCODER_API_KEY, // for Mapquest, OpenCage, Google Premier
    formatter: null // 'gpx', 'string', ...
};

const geocoder = NodeGeocoder(options);
//=====cloudinary config ======
const storage = multer.diskStorage({
    filename: function (req, file, callback) {
        callback(null, Date.now() + file.originalname);
    }
});
const imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
const upload = multer({
    storage: storage,
    fileFilter: imageFilter
});

const cloudinary = require("cloudinary");
cloudinary.config({
    cloud_name: 'yelpcamptest',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

//=======ROUTES=======
router.get("/", (req, res) => {
    var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    var noMatch = null;
    if (req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({
            name: regex
        }).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
            Campground.count({
                name: regex
            }).exec(function (err, count) {
                if (err) {
                    console.log(err);
                    res.redirect("back");
                } else {
                    if (allCampgrounds.length < 1) {
                        noMatch = "No campgrounds match that query, please try again.";
                    }
                    res.render("campgrounds/index", {
                        campgrounds: allCampgrounds,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: req.query.search
                    });
                }
            });
        });
    } else {
        // get all campgrounds from DB
        Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
            Campground.count().exec(function (err, count) {
                if (err) {
                    console.log(err);
                } else {
                    res.render("campgrounds/index", {
                        campgrounds: allCampgrounds,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: false
                    });
                }
            });
        });
    }
});
//===== Create New Campground=====
router.post("/", middleware.isLoggedIn, upload.single('image'), (req, res) => {
    const name = req.body.name;
    const desc = req.body.description;
    const price = req.body.price;
    const author = {
        id: req.user._id,
        username: req.user.username,
    };
    geocoder.geocode(req.body.location, async function (err, data) {
        if (err || !data.length) {
            req.flash('error', err.message);
            console.log(err);
            return res.redirect('back');
        }
        var lat = data[0].latitude;
        var lng = data[0].longitude;
        var location = data[0].formattedAddress;
        var result = await cloudinary.uploader.upload(req.file.path);
        const image = result.secure_url;
        const imageId = result.public_id;
        const newCampground = {
            name: name,
            image: image,
            imageId: imageId,
            description: desc,
            author: author,
            price: price,
            location: location,
            lat: lat,
            lng: lng,
        };
        //
        try {
            let campground = await Campground.create(newCampground);
            let user = await User.findById(req.user._id).populate('followers').exec();
            let newNotification = {
                username: req.user.username,
                campgroundId: campground.id
            }
            for (const follower of user.followers) {
                let notification = await Notification.create(newNotification);
                follower.notifications.push(notification);
                follower.save();
            }

            //redirect back to campgrounds page
            res.redirect(`/campgrounds/${campground.id}`);
        } catch (err) {
            req.flash('error', err.message);
            res.redirect('back');
        }
    });
});
//======Show new campground page=====
router.get("/new", middleware.isLoggedIn, (req, res) => {
    res.render("campgrounds/new");
});

router.get("/:id", function (req, res) {
    //find the campground with provided ID
    Campground.findById(req.params.id).populate("comments").populate({
        path: "reviews",
        options: {
            sort: {
                createdAt: -1
            }
        }
    }).exec(function (err, foundCampground) {
        if (err) {
            console.log(err);
        } else {
            //render show template with that campground
            res.render("campgrounds/show", {
                campground: foundCampground
            });
        }
    });
});
//=====Edit campground Route=====
router.get("/:id/edit", middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findById(req.params.id, (err, foundCampground) => {
        res.render("campgrounds/edit", {
            campground: foundCampground
        });
    });
});
//=====update route=====
router.put("/:id", middleware.checkCampgroundOwnership, upload.single('image'), (req, res) => {
    delete req.body.campground.rating;
    if (req.file) {
        cloudinary.uploader.destroy(req.body.campground.imageId, (err) => {
            if (err) {
                req.flash("error", err.message);
            }
            cloudinary.v2.uploader.upload(req.file.path, (err, result) => {
                if (err) {
                    req.flash("error", err.message);
                }
                return campground.imageId = result.public_id, campground.image = result.secure_url;
            });
        });
    }
    geocoder.geocode(req.body.location, function (err, data) {
        if (err || !data.length) {
            req.flash('error', 'Invalid address');
            return res.redirect('back');
        }
        req.body.campground.lat = data[0].latitude;
        req.body.campground.lng = data[0].longitude;
        req.body.campground.location = data[0].formattedAddress;
        Campground.findByIdAndUpdate(req.params.id, req.body.campground, (err, updatedCampround) => {
            if (err) {
                req.flash("error", err.message);
                res.redirect("/campgrounds");
            } else {
                req.flash("success", "Successfully Updated!!!");
                res.redirect("/campgrounds/" + req.params.id);
            }
        });
    });
});
//=====delete route=====
router.delete("/:id", middleware.checkCampgroundOwnership, function (req, res) {
    Campground.findById(req.params.id, function (err, campground) {
        if (err) {
            res.redirect("/campgrounds");
        } else {
            // deletes all comments associated with the campground
            Comment.deleteOne({
                "_id": {
                    $in: campground.comments
                }
            }, function (err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/campgrounds");
                }
                // deletes all reviews associated with the campground
                Review.deleteOne({
                    "_id": {
                        $in: campground.reviews
                    }
                }, function (err) {
                    if (err) {
                        console.log(err);
                        return res.redirect("/campgrounds");
                    }
                    //  delete the campground
                    campground.deleteOne();
                    req.flash("success", "Campground deleted successfully!");
                    res.redirect("/campgrounds");
                });
            });
        }
    });
});
//=====middleware=====
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
module.exports = router;