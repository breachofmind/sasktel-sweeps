var mvc = require('express-mvc');

require('./app/helpers');

mvc.Application.root = __dirname + "/app/";

var app = mvc.Application.create();

app.bootstrap().server();