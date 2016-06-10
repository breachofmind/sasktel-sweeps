"use strict";

var Controller = require('express-mvc').Controller;

Controller.create('adminController', function(controller)
{

    // Return your controller methods here.
    return {
        index: function(request,response)
        {
            return response.view('admin/index');
        }
    }
});