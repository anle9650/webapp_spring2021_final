const User = require("../models/user");
const passport = require("passport");
const jsonWebToken = require("jsonwebtoken"),
httpStatus = require("http-status-codes");

let getUserParams = body => {
    return {
        name:{
            first: body.first,
            last: body.last,
        },
        userName: body.userName,
        email: body.email,
        gender: body.gender,
        DOB: body.DoB,
        city: body.city,
        state: body.state,
        biography: body.bio,
        securityQuestion: body.ddQuestions,
        securityAnswer: body.securityAnswer,
    };
};

module.exports = {
    index: (req, res, next) => {
        User.find({})
            .then(users => {
                res.locals.users = users;
                next();
            })
            .catch(error => {
                console.log(`Error fetching users: ${error.message}`)
                next(error);
            });
    },

    getLoginPage: (req,res) =>{

        res.render("users/login",{
            errorMessage: ""
        });
    },
    new: (req,res) =>{
        res.render("users/new");
    },
    create: (req, res, next) => {
        if(req.skip) return next();
        
        let newUser = getUserParams(req.body);


        User.register(newUser, req.body.password, (error, user)=> {
            if(user){
                req.flash("success", "User Account successfully created!");
                console.log("Successfully created user account!");
                res.locals.redirect = "/users/login";
                next();
            }
            else{
                req.flash("error",`failed to create user account: ${error.message}`);
                console.log(`failed to make user Account: ${error.message}`);
                res.locals.redirect = "/users/new";
                next();
            }
        });
    },

    validate: (req,res,next) => {
        req.sanitizeBody("email").normalizeEmail({
            all_lowercase: true
        }).trim();
        req.check("email", "Email is invalid").isEmail();
        req.check("first", "First name cannot be empty").notEmpty();
        req.check("last", "Last name cannot be empty").notEmpty();
        req.check("userName", "Username cannot be empty").notEmpty();
        req.check("gender", "Gender cannot be empty").notEmpty();
        req.check("DoB", "Date of birth cannot be empty").notEmpty();
        req.check("state", "State cannot be empty").notEmpty();
        req.check("ddQuestions", "Security question cannot be empty").notEmpty();
        req.check("securityAnswer", "Answer cannot be empty").notEmpty();
        req.check("password","password cannot be empty").notEmpty();
        req.check("confirmPassword", "Passwords must match.").equals(req.body.password);

        req.getValidationResult().then((error) => {
            if(!error.isEmpty()){
                let messages = error.array().map( e => e.msg);
                req.flash("error",messages.join(" and "));
                req.skip = true;
                console.log("VALIDATION WAS NOT PASSED!");
                res.locals.redirect = "/users/new";
                
                next();
            }
            else{
                console.log("passed validation");
                next();
            }
        });
    },
    authenticate: passport.authenticate("local", {
        failureRedirect: "/users/login",
        failureFlash: "Login failed! check your email or password! ",
        successRedirect: "/home",
        successFlash: "Logged in!",
    }),

    logout : (req,res,next) => {
        req.logout();
        req.flash("success","you have been logged out!");
        res.locals.redirect = "/users/login";
        next();
    },
    redirectView: (req, res, next) => {
        let redirectPath = res.locals.redirect;
        if (redirectPath != undefined) res.redirect(redirectPath);
        else next();
    },

    edit: (req, res, next) => {
        let userId = req.params.id;
        
        User.findById(userId)
            .then(user => {
                res.render("users/edit", { user: user });
            })
            .catch(error => {
                
                console.log(`error fetching user by id: ${error.message}`);
                next(error);
            })
    },

    update: (req, res, next) => {
        if(req.skip) return next();

        let userId = req.params.id,
            userParams = getUserParams(req.body);
        User.findOneAndUpdate(userId, {
            $set: userParams
            
        })
            .then(user => {
                res.locals.user = user;
                res.locals.redirect = `/users/${user._id}`;
                next();
            })
            .catch(error => {  
                console.log(`error fetching user by id: ${error.message}`);
                next();
            })
    },

    show: (req, res, next) => {
        let userId= req.params.id;
        User.findById(userId)
        .then(user => {
            res.locals.user = user;
            next();
        })
        .catch(error => {
            console.log(`Error fetching user by ID: ${error.message}`);
            next(error);
        });
    },

    showView: (req, res) => {
        res.render("users/show");
    },

    delete: (req, res, next) => {
        let userId = req.params.id;
        User.findByIdAndRemove(userId)
            .then(() => {
                res.locals.redirect = "/users";
                next();
            })
            .catch(error => {
                console.log(`error fetching user by id: ${error.message}`);
            })
    },

    apiAuthenticate: (req, res, next) => {
        passport.authenticate("local", (errors, user) => {
            if (user) {
                let signedToken = jsonWebToken.sign(
                    {
                        data: user._id,
                        exp: new Date().setDate(new Date().getDate() + 1)
                    },
                    "secret_encoding_passphrase"
                );
                res.json({
                    success: true,
                    token: signedToken
                });
            } else
                res.json({
                    success: false,
                    message: "Could not authenticate user."
                });
        })(req, res, next);
    },

    verifyJWT: (req, res, next) => {
        let token = req.headers.token;
        if (token) {
            jsonWebToken.verify(
                token,
                "secret_encoding_passphrase",
                (errors, payload) => {
                    if (payload) {
                        User.findById(payload.data).then(user => {
                            if (user) {
                                next();
                            } else {
                                res.status(httStatus.FORBIDDEN).json({
                                    error: true,
                                    message: "No User account found."
                                });
                            }
                        });
                    } else {
                        res.status(httpStatus.UNAUTHORIZED).json({
                            error: true,
                            message: "Cannot verify API token."
                        });
                        next();
                    }
                }
            );
        } else {
            res.status(httpStatus.UNAUTHORIZED).json({
                error: true,
                message: "Provide Token."
            });
        }
    },

    filterUserFollows: (req, res, next) => {
        let currentUser = res.locals.currentUser;
        var users = res.locals.users;

        if (currentUser) {
            // Remove the current user from the list of users.
            for (var i = 0; i < users.length; i++) {
                if (users[i]._id.equals(currentUser._id)) {
                    users.splice(i, 1)
                }
            }
            // Map each user to indicate whether the current user is following that user or not.
            let mappedFollows = users.map((aUser) => {
                let userFollows = currentUser.follows.some((followedUser) => {
                    return followedUser.equals(aUser._id);
                });
                return Object.assign(aUser.toObject(), {following: userFollows});
            });
            res.locals.users = mappedFollows;
            next();
        } else {
            next();
        }
    },

    respondJSON: (req, res) => {
        res.json({
            status: httpStatus.OK,
            data: res.locals
        });
    },

    follow: (req, res, next) => {
        let userId = req.params.id,
            currentUser = req.user;
        
        if (currentUser) {
            User.findByIdAndUpdate(currentUser, {
                $addToSet: {
                    follows: userId
                }
            })
                .then(() => {
                    res.locals.success = true;
                    next();
                })
                .catch(error => {
                    next(error);
                });
        } else {
            next(new Error("User must log in."));
        }
    },

    unfollow: (req, res, next) => {
        let userId = req.params.id,
            currentUser = req.user;
        
        if (currentUser) {
            User.findByIdAndUpdate(currentUser, {
                $pull: {
                    follows: userId
                }
            })
                .then(() => {
                    res.locals.success = true;
                    next();
                })
                .catch(error => {
                    next(error);
                });
        } else {
            next(new Error("User must log in."));
        }
    },

    errorJSON: (error, req, res, next) => {
        let errorObject;

        if (error) {
            errorObject = {
                status: httpStatus.INTERNAL_SERVER_ERROR,
                message: error.message
            };
        } else {
            errorObject = {
                status: httpStatus.INTERNAL_SERVER_ERROR,
                message: "Unknown Error."
            };
        }

        res.json(errorObject);
    } 
};// end of module.exports 