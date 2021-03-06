var Model = require('express-mvc').Model;

var Media = Model.create('Media', {
    file_name:      { type: String, required:true},
    file_type:      { type: String, required:true },
    title:          String,
    meta:           Model.types.Mixed,
    occurred_at:    { type: Date, default: Date.now },
    created_at:     { type: Date, default: Date.now },
    modified_at:    { type: Date, default: Date.now }

});

Media.title = "file_name";