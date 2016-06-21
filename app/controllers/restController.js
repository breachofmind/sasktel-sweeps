"use strict";
var ExpressMVC = require('express-mvc');

var Controller  = ExpressMVC.Controller;
var Model       = ExpressMVC.Model;
var Paginator   = ExpressMVC.Paginator;

var csv = require('csv');

Controller.create('restController', function(controller)
{
    var Class,Object,blueprint;

    /**
     * Resolve the model parameter with the model class.
     */
    controller.bind('model', function(value,request,response)
    {
        blueprint = Model.get(value.toLowerCase());

        if (! blueprint) {
            return response.api({error:`Model "${value}" doesn't exist.`}, 404);
        }

        if (blueprint.expose == false && ! request.user) {
            return response.api({error:`You must be logged in to view "${value}" models.`}, 401);
        }

        return Class = blueprint.model;
    });

    /**
     * Resolve the id of the model with the object.
     */
    controller.bind('id', function(value,request)
    {
        if (Class && value) {
            return Object = Class.findOne({_id: value}).exec();
        }
    });



    return {

        /**
         * Say Hello.
         *
         * GET /api/v1/
         */
        index: function(request,response)
        {
            return "Express MVC API v1";
        },

        /**
         * Fetches an object by ID.
         *
         * GET /api/v1/{model}/{id}
         */
        fetchOne: function(request,response)
        {
            return Object.then(function(data) {

                return response.api(data,200);

            }, function(err) {

                return response.api({error:err},400);
            })
        },

        /**
         * Fetches an array of objects, with pagination.
         *
         * GET /api/v1/{model}
         */
        fetchAll: function(request,response)
        {
            return Paginator.make(blueprint,request,response).execute();
        },

        /**
         * Create a new search.
         *
         * POST /api/v1/{model}/search
         */
        search: function(request,response)
        {
            if (! request.user) {
                return response.api({error:`You are not authorized to perform this operation.`}, 401);
            }

            var search = request.body;

            return Class.find(search.where).populate(blueprint.population).sort(search.sort).exec().then(function(data)
            {
                return response.api(data,200);

            }, function(err) {

                return response.api({error:err},400);
            });

        },

        /**
         * Download a report.
         *
         * GET /api/v1/{model}/report?s=searchCriteriaBase64
         */
        report: function(request,response)
        {
            if (! request.user) {
                return response.api({error:`You are not authorized to perform this operation.`}, 401);
            }

            var string = new Buffer(request.query.s, 'base64').toString();
            var search = JSON.parse(string);

            // Conduct the search
            return Class.find(search.where || null).populate(blueprint.population).sort(search.sort || null).exec().then(function(data)
            {
                response.setHeader('Content-disposition', 'attachment; filename='+blueprint.name+".csv");
                response.setHeader('Content-type', 'text/csv');


                var input = data.toCSV(true);

                csv.stringify(input, function(err,output) {
                    response.smart(output,200);
                });

            }, function(err) {

                return response.api({error:err},400);
            });
        },


        /**
         * Update a model.
         *
         * PUT /api/{model}/{id}
         */
        update: function(request,response)
        {
            if (request.body._id) delete request.body._id; // Mongoose has problems with this.

            if (! request.user) {
                return response.api({error:`You are not authorized to perform this operation.`}, 401);
            }

            request.body.modified_at = Date.now();

            return Class
                .findByIdAndUpdate(request.params.id, request.body, {new:true})
                .populate(blueprint.population)
                .exec()
                .then(function(data) {

                    return response.api(data,200);

                }, function(err){

                    return response.api({error:err},400);
                });
        },


        /**
         * Create a new model.
         *
         * POST /api/{model}
         */
        create: function(request,response)
        {
            if (! request.user) {
                return response.api({error:`You are not authorized to perform this operation.`}, 401);
            }

            var model = new Class (request.body);

            return model.save().then(function(data)
            {
                return response.api(data,200);

            }, function(err) {

                return response.api({error:err},400);

            });
        },

        /**
         * Deletes an object by ID.
         *
         * DELETE /api/{model}/{id}
         */
        trash: function(request,response)
        {
            if (! request.user) {
                return response.api({error:`You are not authorized to perform this operation.`}, 401);
            }

            return params.Model.remove({_id:request.params.id}).then(function(results) {
                var data = {
                    results: results,
                    objectId : params.id
                };
                return response.api(data,200);

            }, function(err) {

                return response.api({error:err},400);

            });
        }

    }
});