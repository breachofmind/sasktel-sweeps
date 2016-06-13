"use strict";

var Controller = require('express-mvc').Controller;

Controller.create('indexController', function(controller)
{

    return {
        index: function(request,response)
        {
            return response.view('index');
        },

        /**
         * POST /submit
         * @param request
         * @param response
         */
        submit: function(request,response)
        {
            return response.view('submit')
        }
    }
});