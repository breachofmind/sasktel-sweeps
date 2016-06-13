(function () {

    var bstar = {};

    window.bstar = bstar;

    bstar.app = angular.module('app', ['ngRoute']);

    /**
     * Queue a document.ready callback.
     * @param callback function
     * @returns void
     */
    var init = [setupAjaxHeaders];
    bstar.ready = function(callback) {
        init.push(callback);
    };

    /**
     * Return the value of the csrf field.
     * Required for any ajax POST operations.
     * @returns {string}
     */
    bstar.csrfToken = function() {
        return $('meta[name="csrf-token"]').attr('content');
    };

    /**
     * Attaches a crsf token to all AJAX headers.
     * @returns void
     */
    function setupAjaxHeaders()
    {
        $.ajaxSetup({
            headers: {
                'X-CSRF-TOKEN': bstar.csrfToken()
            }
        });
    }

    /**
     * Fire when DOM loaded.
     */
    $(document).ready(function()
    {
        init.forEach(function(callback) {
            callback();
        })
    });
})();