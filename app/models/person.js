var ExpressMVC = require('express-mvc');

var Model = ExpressMVC.Model;
var utils = ExpressMVC.utils;

var Person = Model.create('Person', {

    first_name:     String,
    last_name:      String,
    group:          String,
    position:       String,
    manager_id:     { type: Model.types.ObjectId, default:null},
    created_at:     { type: Date, default: Date.now },
    modified_at:    { type: Date, default: Date.now }

}).methods({
    /**
     * Return the user's full name.
     * @returns {string}
     */
    name: function(reverse)
    {
        return reverse ? this.last_name + ", " + this.first_name : [this.first_name, this.last_name].join(" ");
    }

}).appends(function(model) {
    return ['name', model.name(true)];
});

Person.title = 'name';