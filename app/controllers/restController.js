"use strict";
var ExpressMVC = require('express-mvc');

var Controller  = ExpressMVC.Controller;
var Model       = ExpressMVC.Model;
var utils       = ExpressMVC.utils;

var csv = require('csv');

Controller.create('restController', function(controller, app)
{
    var Class,
        object,
        blueprint;

    /**
     * Resolve the model parameter with the model class.
     */
    controller.bind('model', function(value,request,response)
    {
        blueprint = Model.get(value);

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
            return object = Class.findOne({_id: value});
        }
    });

    controller.query('p', function(value,request)
    {
        request.query.filter = blueprint.paging(utils.fromBase64(value));
    });

    function reportParser()
    {
        if (blueprint.name == "Submission") {
            return function(row) {
                row.support_assoc_0 = row.support_assocs[0] || "";
                row.support_assoc_1 = row.support_assocs[1] || "";
                return row;
            }
        }
        return null;
    }

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
            return object.exec().then(function(data) {

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
            var paging = {
                count:      0,
                total:      0,
                limit:      app.config.limit || 10000,
                filter:     request.getQuery('filter', null),
                sort:       request.getQuery('sort', blueprint.range()),
                next:       null
            };
            /**
             * Sets up the paging object with the next URL string.
             * @param data array
             * @returns object
             */
            paging.setNext = function(data)
            {
                if (data.length) {
                    var lastValue = data[data.length-1][blueprint.key];
                }
                this.count = data.length;
                this.next = this.total > this.limit
                    ? utils.toBase64(lastValue.toString())
                    : null;

                return this;
            };

            // Find the total record count first, then find the range.
            return Class.count(paging.filter).exec().then(function(count) {

                paging.total = count;

                var promise = Class
                    .find       (paging.filter)
                    .sort       (paging.sort)
                    .limit      (paging.limit)
                    .populate   (blueprint.population)
                    .exec();

                // After finding the count, find the records.
                return promise.then(function(data) {

                    paging.setNext(data);

                    return response.api(data,200, {pagination: paging});

                }, function(err) {

                    // Model.find() error
                    return response.api({error:err},400);
                });

            }, function(err) {

                // Model.count() error
                return response.api({error:err},400);
            });
        },

        /**
         * Create a new search.
         *
         * POST /api/v1/{model}/search
         */
        search: function(request,response)
        {
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
            var string = new Buffer(request.query.s, 'base64').toString();
            var search = JSON.parse(string);

            // Conduct the search
            return Class.find(search.where || null).populate(blueprint.population).sort(search.sort || null).exec().then(function(data)
            {
                response.setHeader('Content-disposition', 'attachment; filename='+blueprint.name+".csv");
                response.setHeader('Content-type', 'text/csv');

                var input = data.toCSV(blueprint.labels, true, reportParser());

                csv.stringify(input, function(err,output) {
                    response.smart(output,200);
                });
                return true;

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
            return Class.remove({_id:request.params.id}).then(function(results) {
                var data = {
                    results: results,
                    objectId : request.params.id
                };
                return response.api(data,200);

            }, function(err) {

                return response.api({error:err},400);

            });
        }

    }
});