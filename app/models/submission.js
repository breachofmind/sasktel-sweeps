var Model = require('express-mvc').Model;

var Submission = Model.create('Submission', {

    accepted: Boolean,
    pending: Boolean,

    customer_name:      { type: String, required:true},
    sale_date:          { type: Date,   required:true},
    business_priority:  { type: String, required:true},
    details:            { type: String, required:true},

    type:               { type: String, required:true}, // SMB|Corp/Govt
    manager_id:         { type: Model.types.ObjectId, ref: 'Person', required:true },
    account_rep_id:     { type: Model.types.ObjectId, ref: 'Person' },
    sales_assoc_id:     { type: Model.types.ObjectId, ref: 'Person' },
    support_rep_id:     { type: Model.types.ObjectId, ref: 'Person' },
    support_assocs:     { type: Array, default: [] },

    created_at:         { type: Date, default: Date.now },
    modified_at:        { type: Date, default: Date.now },

}).populate(['manager_id','account_rep_id','sales_assoc_id','support_rep_id']);

// Only logged-in user can view using the API.
Submission.expose = false;