var Template = require('express-mvc').Template;

/**
 * Provides some routes for the application.
 * @param app Application
 * @param router Express
 * @param dispatch function
 */
module.exports = function(app,router,dispatch)
{
    var authMiddleware = function(request,response,next) {
        if (! request.user) {
            response.redirect('/login');
        }
        next();
    };

    // Authentication routes.
    router.get  ('/login',  dispatch('authController', 'login'));
    router.get  ('/logout', dispatch('authController', 'logout'));
    router.post ('/login',  dispatch('authController', 'authenticate'));


    // RESTful api
    router.get      ('/api/v1',                 dispatch('restController','index'));
    router.get      ('/api/v1/:model',          dispatch('restController','fetchAll'));
    router.get      ('/api/v1/:model/report',   dispatch('restController','report'));
    router.post     ('/api/v1/:model',          dispatch('restController','create'));
    router.get      ('/api/v1/:model/:id',      dispatch('restController','fetchOne'));
    router.put      ('/api/v1/:model/:id',      dispatch('restController','update'));
    router.delete   ('/api/v1/:model/:id',      dispatch('restController','trash'));

    Template.defaults = function(template) {
        template.meta('robots', 'noindex,nofollow');
        template.style('baseCss', 'base.css');
        template.style('libCss', 'lib.css');
        template.style('appCss', 'app.css');
        template.script('libJs', 'lib.js');
        template.script('srcJs', 'src.js');
        template.style('materialIcons', 'https://fonts.googleapis.com/icon?family=Material+Icons');
    };

    // Application routes.
    router.get('/',       dispatch('indexController','index'));
    router.get('/people', dispatch('indexController','people'));
    router.post('/submit', dispatch('indexController','submit'));
    router.get('/submit', function(request,response) {
        response.redirect('/');
    });
    router.get('/admin',  authMiddleware, dispatch('adminController','index'));
};