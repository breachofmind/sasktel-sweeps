var Model = require('express-mvc').Model;

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
    name: function()
    {
        return [this.first_name,this.last_name].join(" ");
    }
});