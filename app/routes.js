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
            return response.redirect('/login');
        }
        next();
    };
    var authApiMiddleware = function(request,response,next)
    {
        if (! request.user) {
            return response.api({error:`You are not authorized to perform this operation.`}, 401);
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
    router.get      ('/api/v1/:model/report',   authApiMiddleware, dispatch('restController','report'));
    router.post     ('/api/v1/:model/search',   authApiMiddleware, dispatch('restController','search'));
    router.post     ('/api/v1/:model',          authApiMiddleware, dispatch('restController','create'));
    router.get      ('/api/v1/:model/:id',      dispatch('restController','fetchOne'));
    router.put      ('/api/v1/:model/:id',      authApiMiddleware, dispatch('restController','update'));
    router.delete   ('/api/v1/:model/:id',      authApiMiddleware, dispatch('restController','trash'));

    Template.defaults = function(template) {
        template.meta('robots', 'noindex,nofollow');
        template.style('baseCss', '/base.css');
        template.style('libCss', '/lib.css');
        template.style('appCss', '/app.css');
        template.script('libJs', '/lib.js');
        template.script('srcJs', '/src.js');
        template.style('materialIcons', 'https://fonts.googleapis.com/icon?family=Material+Icons');
    };

    // Application routes.
    router.get('/',       dispatch('indexController','index'));
    router.get('/people', dispatch('indexController','people'));
    router.post('/submit', dispatch('indexController','submit'));
    router.get('/submit', function(request,response) {
        response.redirect('/');
    });
    router.get('/admin',        authMiddleware, dispatch('adminController','index'));
    router.get('/admin/users',  authMiddleware, dispatch('adminController','users'));
    router.post('/admin/users', authMiddleware, dispatch('adminController','createUser'));
};