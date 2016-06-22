var env = require('./env');

/**
 * Sample configuration file.
 * @type {{}}
 */
module.exports = {

    /**
     * Unique application key.
     * @var string
     */
    appKey: env.appKey,

    /**
     * The environment name.
     * @var string local|sit|uat|prod
     */
    environment: env.environment || "local",

    /**
     * The webserver base URL.
     * @var string
     */
    url: env.url || "http://localhost:8080",

    /**
     * The directory where static content is served.
     * @var string|null
     */
    static_uri: 'public',

    /**
     * The webserver port.
     * @var Number
     */
    port: env.port || 8080,

    /**
     * Mongo database.
     * @var string
     */
    db: env.db,

    /**
     * Enable livereload.
     * @var string|null
     */
    livereload: null,

    /**
     * View engine to use.
     * @var string ejs|pug|jade|hbs
     */
    view_engine: 'ejs',

    /**
     * Enable debug mode.
     * @var boolean
     */
    debug: env.debug || true,

    /**
     * The limit of models to return in REST api.
     * @var Number
     */
    limit: 10,


    /**
     * Files to require.
     * @var object
     */
    files: {
        models: ['user','media','person','submission'],
        controllers: ['authController','indexController','restController','adminController']
    }
};