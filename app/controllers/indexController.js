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
            var data = {errorBag:[]};

            var submission = new Submission(input);

            submission.save().then(function(data) {

                return response.view('submit').and(data);

            }, function(err) {

                data.errorBag.push(err);
                return response.view('index').and(data);
            });


        }
    }
});