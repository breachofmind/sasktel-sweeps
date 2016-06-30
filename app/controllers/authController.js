"use strict";

var ExpressMVC = require('express-mvc');
var Controller = ExpressMVC.Controller;

Controller.create('authController', function(controller)
{
    return {
        login: function(request,response)
        {
            if (request.user) {
                response.redirect('/admin');
            }
            return response.view('login').set('title',"Login");
        },


        logout: function(request,response)
        {
            request.logout();
            response.redirect('/login');
        },


        authenticate: function(request,response,next)
        {
            var passport = ExpressMVC.Application.instance.passport;

            passport.authenticate('local', function(err,user,info)
            {
                if (err) return next(err);

                if (! user) {
                    return response.smart({success:false, error:info.message}, 401);
                }

                request.logIn(user, function(err) {

                    if (err) {
                        return response.smart({success:false, error:err}, 401);
                    }

                    return response.smart({success:true, user:user, redirect:"/admin"}, 200);
                });

            })(request,response,next);

            return true;
        }
    }
});