var mvc = require('express-mvc');

mvc.Application.root = __dirname + "/app/";


var app = mvc.Application.create();

app.bootstrap().server();