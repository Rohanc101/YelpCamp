//jshint esversion:6
const express = require("express");
const router= express.Router({mergeParams: true});
const Campground=require("../models/campground");
const Comment= require("../models/comment");
const middleware=require("../middleware");
//=======COMMENTS ROUTES=======
router.get("/new",middleware.isLoggedIn,(req,res)=>{
    Campground.findById(req.params.id, (err, campground)=>{
        if (err) {
            console.log(err);
        } else {
            res.render("comments/new",{campground:campground});
        }
    });
});
router.post("/",middleware.isLoggedIn,(req,res)=>{
    Campground.findById(req.params.id,(err,campground)=>{
        if (err) {
            console.log(err);
            res.redirect("/campgrounds");
        } else {
            Comment.create(req.body.comment,(err,comment)=>{
                if (err) {
                    req.flash("error","something went wrong");
                    console.log(err);
                } else {
                    comment.author.id= req.user._id;
                    comment.author.username=req.user.username;
                    comment.author.avatar=req.user.avatar;
                    comment.save();
                    campground.comments.push(comment);
                    campground.save();
                    req.flash("success","successfully added comment");
                    res.redirect('/campgrounds/'+campground._id);
                }
            });
        }
    });
});
//=====comments edit=====
router.get("/:comment_id/edit",middleware.checkCommentOwnership,(req,res)=>{
    Campground.findById(req.params.id,(err,campground)=>{
        if (err) {
            res.redirect("back");
        } else {
            Comment.findById(req.params.comment_id,(err,foundComment)=>{
                if (err) {
                    res.redirect("back");
                } else {
                    res.render("comments/edit",{campground:campground,campground_id:req.params.id,comment:foundComment});
                }
            });
        }
    });
});
//=====comments update=====
router.put("/:comment_id",middleware.checkCommentOwnership,(req,res)=>{
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, (err,updatedComment)=>{
        if (err) {
            res.redirect("back");
        } else {
            res.redirect("/campgrounds/"+req.params.id);
        }
    });
});
//=====comments delete======
router.delete("/:comment_id",middleware.checkCommentOwnership,(req,res)=>{
    Comment.findByIdAndDelete(req.params.comment_id,(err)=>{
        if (err) {
            res.redirect("back");
        } else {
            req.flash("success","Comments deleted.");
            res.redirect("/campgrounds/"+ req.params.id);
        }
    });
});
//=====middleware=====
module.exports=router;