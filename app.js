//jshint esversion:6
require('dotenv').config();
const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const methodOverride = require('method-override');
const Campground = require('./models/campground');
const Comment = require('./models/comment');
const User = require('./models/user');
const commentRoutes = require("./routes/comments");
const reviewRoutes = require("./routes/reviews");
const campgroundRoutes = require("./routes/campgrounds");
const indexRoutes = require("./routes/index");
mongoose.connect('mongodb+srv://admin-rohan:Broadband65@cluster0-nfl7g.mongodb.net/yelpCampDB', {useNewUrlParser: true});
app.use(bodyParser.urlencoded({
    extended: true
}));
app.set("view engine", "ejs");
app.use(methodOverride("_method"));
app.use(flash());
app.use(express.static(__dirname + '/public'));

app.locals.moment = require('moment');
//=====================
//   Passport Config
//=====================
app.use(require("express-session")({
    secret: "Rusty is cutest dog",
    resave: false,
    saveUninitialized: false

}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(async (req, res, next) => {
    res.locals.currentUser = req.user;
    if (req.user) {
        try {
            let user = await User.findById(req.user._id).populate('notifications', null, {
                isRead: false
            }).exec();
            res.locals.notifications = user.notifications.reverse();
        } catch (err) {
            console.log(err.message);
        }
    }
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

//app.use("/campgrounds/:id/comments", commentRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use(indexRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);
app.use("/campgrounds/:id/reviews", reviewRoutes);

app.listen(process.env.PORT, process.env.IP, () => console.log("server started"));