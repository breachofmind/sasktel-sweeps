var mongoose = require('mongoose');
var mvc = require('express-mvc');

require('./app/helpers');

mongoose.Promise = require('bluebird');

mvc.Application.root = __dirname + "/app/";

var app = mvc.Application.create();

app.bootstrap().server();