"use strict";

var Controller = require('express-mvc').Controller;

Controller.create('indexController', function(controller)
{
    // Specify your global variables or controller bindings up here.
    var globals = {
        message: "Enjoy yourself"
    };

    // Return your controller methods here.
    return {
        index: function(request,response)
        {
            return response.view('index').and(globals);
        }
    }
});