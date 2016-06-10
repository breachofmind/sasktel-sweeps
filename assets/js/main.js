(function () {

    var bstar = {};

    window.bstar = bstar;

    bstar.app = angular.module('app', ['ngRoute']);

    var init = [setupAjaxHeaders];
    bstar.ready = function(callback) {
        init.push(callback);
    };

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


    $(document).ready(function() {

        init.forEach(function(callback) {
            callback();
        })
    });
})();