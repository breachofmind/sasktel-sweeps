"use strict";

var ExpressMVC = require('express-mvc');
var Controller = ExpressMVC.Controller;
var Model = ExpressMVC.Model;

Controller.create('indexController', function(controller)
{
    var Submission = Model.Submission;
    var Person = Model.Person;

    return {
        index: function(request,response)
        {
            return response.view('index');
        },

        people: function(request,response)
        {
            if (! request.ajax) {
                return null;
            }
            return Person.find().sort({last_name:1}).exec();
        },

        /**
         * POST /submit
         * @param request
         * @param response
         */
        submit: function(request,response)
        {
            var input = request.body;

            input.pending = true;
            input.approved = false;
            input.sale_date = new Date(input.sale_date);

            console.log(input);

            var submission = new Submission(input);

            submission.save().then(function(data) {

                return response.smart(data,200);

            }, function(err) {

                return response.smart({error:"There was an error.", response:err},401);
            });


        }
    }
});