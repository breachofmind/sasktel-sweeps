var Model = require('express-mvc').Model;

Model.create('Submission', {

    customer_name:      { type: String, required:true},
    sale_date:          { type: Date, required:true},
    business_priority:  { type: String, required:true},
    details:            { type: String, required:true},

    type:               { type: String, required:true}, // SMB|Corp/Govt
    manager_id:         { type: Model.types.ObjectId, required:true },
    account_rep_id:     { type: Model.types.ObjectId, required:true },
    sales_assoc_id:     { type: Model.types.ObjectId, required:true },
    support_rep_id:     { type: Model.types.ObjectId, required:true },
    support_assocs:     { type: Array, default: [] },

    created_at:         { type: Date, default: Date.now },
    modified_at:        { type: Date, default: Date.now }
});