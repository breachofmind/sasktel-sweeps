var ExpressMVC = require('express-mvc');

var Auth = ExpressMVC.Auth;
var Model = ExpressMVC.Model;
var utils = ExpressMVC.utils;

var User = Model.create('User', {

    first_name:     String,
    last_name:      String,
    email:          String,
    password:       String,
    created_at:     { type: Date, default: Date.now },
    modified_at:    { type: Date, default: Date.now }

}).methods({

    /**
     * Checks the hashed password and salt.
     * @param password string
     * @returns {boolean}
     */
    isValid: function(password)
    {
        if (! password) {
            return false;
        }
        return this.password == Auth.encrypt(password,this.created_at.getTime().toString());
    },

    /**
     * Return the user's full name.
     * @returns {string}
     */
    name: function()
    {
        return [this.first_name,this.last_name].join(" ");
    }

})
    .guard('password')
    .appends('name');

User.title = "name";

// Don't expose to API.
User.expose = false;