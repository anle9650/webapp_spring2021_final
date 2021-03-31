"use strict";

const User = require("../models/user");

exports.getSignupPage = (req, res) => {
    res.render("signup", {
        successMessage: "",
        errorMessage: ""
    });
};

exports.getLoginPage = (req, res) => {
    res.render("login", {
        errorMessage: ""
    });
};

exports.saveUser = (req, res) => {
    // Displays single error message if fields are not all entered, or if passwords don't match.
    // Still need to figure out how to change background color for each incorrect input.
    if (!req.body.txtFirstName || !req.body.txtLastName || !req.body.txtUserName || !req.body.txtEmail || !req.body.gender || !req.body.txtDOB || !req.body.txtCity || !req.body.txtState ||
        !req.body.txtPassword || !req.body.ddQuestions || !req.body.txtAnswer) {
        res.render("signup", {
            successMessage: "",
            errorMessage: "All fields must be entered."
        });
        return;
    }

    else if (req.body.txtPassword != req.body.txtConfirmPassword) {
        res.render("signup", {
            successMessage: "",
            errorMessage: "Passwords must match."
        });
        return;
    };

    let newUser = new User({
        firstName: req.body.txtFirstName,
        lastName: req.body.txtLastName,
        userName: req.body.txtUserName,
        email: req.body.txtEmail,
        gender: req.body.gender,
        DOB: req.body.txtDOB,
        city: req.body.txtCity,
        state: req.body.txtState,
        biography: req.body.txtBio,
        password: req.body.txtPassword,
        securityQuestion: req.body.ddQuestions,
        answer: req.body.txtAnswer
    });

    newUser.save()
        .then(result => {
            res.render("signup", {
                successMessage: "Your account has been successfully created!",
                errorMessage: ""
            })
        })
        .catch(error => {
            if (error) res.send(error);
        });
};

exports.verifyLogin = (req, res) => {
    User.findOne({
        "email": req.body.email
    })
    .where("password", req.body.password)
    .exec()
    .then((theUser) => {
        if (theUser) {
            res.render("home");
        }
        else {
            res.render("login", {
                errorMessage: "Invalid email or password."
            });
        }
    })
    .catch((theError) => {
        res.send(theError);
    });

};//end verifylogin