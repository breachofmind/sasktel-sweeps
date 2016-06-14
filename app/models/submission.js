var Model = require('express-mvc').Model;

var Submission = Model.create('Submission', {

    accepted: Boolean,
    pending: Boolean,

    customer_name:      { type: String, required:true},
    sale_date:          { type: Date,   required:true},
    business_priority:  { type: String, required:true},
    details:            { type: String, required:true},

    type:               { type: String, required:true}, // SMB|Corp/Govt
    manager_id:         { type: Model.types.ObjectId, required:true },
    account_rep_id:     { type: Model.types.ObjectId },
    sales_assoc_id:     { type: Model.types.ObjectId },
    support_rep_id:     { type: Model.types.ObjectId },
    support_assocs:     { type: Array, default: [] },

    created_at:         { type: Date, default: Date.now },
    modified_at:        { type: Date, default: Date.now },

});

// Only logged-in user can view using the API.
Submission.expose = false;