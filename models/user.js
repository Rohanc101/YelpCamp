//jshint esversion:6
const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        require: true
    },
    password: String,
    avatar: String,
    firstName: String,
    lastName: String,
    email: {
        type: String,
        unique: true,
        require: true
    },
    resetPasswordToken: String,
    resetPasswordExpires: String,
    isAdmin: {
        type: Boolean,
        default: false
    },
    notifications: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Notification'
    }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
});
UserSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User", UserSchema);