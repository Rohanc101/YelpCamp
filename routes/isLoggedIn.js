//=====middleware=====
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");
}
exports.isLoggedIn = isLoggedIn;
