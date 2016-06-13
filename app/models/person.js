var ExpressMVC = require('express-mvc');

var Model = ExpressMVC.Model;
var utils = ExpressMVC.utils;

Model.create('Person', {

    first_name:     String,
    last_name:      String,
    email:          String,
    phone:          String,
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
        return reverse ? this.last_name+", "+this.first_name : [this.first_name,this.last_name].join(" ");
    },

    toJSON: function()
    {
        var out = utils.compact(this, ['_id','first_name','last_name','email','phone','position','manager_id','created_at','modified_at']);
        out['name'] = this.name(true);
        out['_url'] = utils.url(`api/v1/person/${this.id}`);
        return out;
    }
});