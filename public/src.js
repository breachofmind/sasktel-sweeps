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
(function (app) {

    app.controller('loginCtrl', LoginFormController);

    var loginUrl = "/login";

    /**
     * Handles the user login.
     * @see views/login.ejs
     * @param $scope
     * @param $http
     * @constructor
     */
    function LoginFormController($scope,$http,$location,$timeout)
    {
        $scope.submitting = false;

        $scope.error = null;

        $scope.guest = {
            username: null,
            password: null,
            _csrf: null
        };

        $scope.submit = function($event)
        {
            $event.preventDefault();
            $scope.guest._csrf = bstar.csrfToken();
            $scope.submitting = true;

            $timeout(function(){
                $http.post(loginUrl, $scope.guest)
                    .success(loginSuccess)
                    .error(loginError);
            },2000);

        };

        function loginSuccess(data) {
            $scope.submitting = false;
            if (data.redirect) {
                window.location = data.redirect;
            }
        }

        function loginError(err) {
            $scope.submitting = false;
            $scope.error = err.error;
        }
    }

})(bstar.app);
(function (app) {

    app.controller('submissionCtrl', SubmissionFormController);

    /**
     * Handles the user login.
     * @see views/login.ejs
     * @param $scope
     * @param $http
     * @constructor
     */
    function SubmissionFormController($scope,$http,$timeout)
    {
        // Form input
        $scope.in = {
            customer_name: null,
            sale_date: null,
        }
    }

})(bstar.app);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJsb2dpbkN0cmwuanMiLCJzdWJtaXNzaW9uQ3RybC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InNyYy5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgYnN0YXIgPSB7fTtcblxuICAgIHdpbmRvdy5ic3RhciA9IGJzdGFyO1xuXG4gICAgYnN0YXIuYXBwID0gYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsnbmdSb3V0ZSddKTtcblxuICAgIC8qKlxuICAgICAqIFF1ZXVlIGEgZG9jdW1lbnQucmVhZHkgY2FsbGJhY2suXG4gICAgICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMgdm9pZFxuICAgICAqL1xuICAgIHZhciBpbml0ID0gW3NldHVwQWpheEhlYWRlcnNdO1xuICAgIGJzdGFyLnJlYWR5ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgaW5pdC5wdXNoKGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSB2YWx1ZSBvZiB0aGUgY3NyZiBmaWVsZC5cbiAgICAgKiBSZXF1aXJlZCBmb3IgYW55IGFqYXggUE9TVCBvcGVyYXRpb25zLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgYnN0YXIuY3NyZlRva2VuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAkKCdtZXRhW25hbWU9XCJjc3JmLXRva2VuXCJdJykuYXR0cignY29udGVudCcpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBhIGNyc2YgdG9rZW4gdG8gYWxsIEFKQVggaGVhZGVycy5cbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0dXBBamF4SGVhZGVycygpXG4gICAge1xuICAgICAgICAkLmFqYXhTZXR1cCh7XG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgJ1gtQ1NSRi1UT0tFTic6IGJzdGFyLmNzcmZUb2tlbigpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZpcmUgd2hlbiBET00gbG9hZGVkLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIGluaXQuZm9yRWFjaChmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfSlcbiAgICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uIChhcHApIHtcblxuICAgIGFwcC5jb250cm9sbGVyKCdsb2dpbkN0cmwnLCBMb2dpbkZvcm1Db250cm9sbGVyKTtcblxuICAgIHZhciBsb2dpblVybCA9IFwiL2xvZ2luXCI7XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSB1c2VyIGxvZ2luLlxuICAgICAqIEBzZWUgdmlld3MvbG9naW4uZWpzXG4gICAgICogQHBhcmFtICRzY29wZVxuICAgICAqIEBwYXJhbSAkaHR0cFxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIExvZ2luRm9ybUNvbnRyb2xsZXIoJHNjb3BlLCRodHRwLCRsb2NhdGlvbiwkdGltZW91dClcbiAgICB7XG4gICAgICAgICRzY29wZS5zdWJtaXR0aW5nID0gZmFsc2U7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICAkc2NvcGUuZ3Vlc3QgPSB7XG4gICAgICAgICAgICB1c2VybmFtZTogbnVsbCxcbiAgICAgICAgICAgIHBhc3N3b3JkOiBudWxsLFxuICAgICAgICAgICAgX2NzcmY6IG51bGxcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24oJGV2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICRzY29wZS5ndWVzdC5fY3NyZiA9IGJzdGFyLmNzcmZUb2tlbigpO1xuICAgICAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSB0cnVlO1xuXG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICRodHRwLnBvc3QobG9naW5VcmwsICRzY29wZS5ndWVzdClcbiAgICAgICAgICAgICAgICAgICAgLnN1Y2Nlc3MobG9naW5TdWNjZXNzKVxuICAgICAgICAgICAgICAgICAgICAuZXJyb3IobG9naW5FcnJvcik7XG4gICAgICAgICAgICB9LDIwMDApO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gbG9naW5TdWNjZXNzKGRhdGEpIHtcbiAgICAgICAgICAgICRzY29wZS5zdWJtaXR0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoZGF0YS5yZWRpcmVjdCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGRhdGEucmVkaXJlY3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBsb2dpbkVycm9yKGVycikge1xuICAgICAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9IGVyci5lcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxufSkoYnN0YXIuYXBwKTsiLCIoZnVuY3Rpb24gKGFwcCkge1xuXG4gICAgYXBwLmNvbnRyb2xsZXIoJ3N1Ym1pc3Npb25DdHJsJywgU3VibWlzc2lvbkZvcm1Db250cm9sbGVyKTtcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHVzZXIgbG9naW4uXG4gICAgICogQHNlZSB2aWV3cy9sb2dpbi5lanNcbiAgICAgKiBAcGFyYW0gJHNjb3BlXG4gICAgICogQHBhcmFtICRodHRwXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gU3VibWlzc2lvbkZvcm1Db250cm9sbGVyKCRzY29wZSwkaHR0cCwkdGltZW91dClcbiAgICB7XG4gICAgICAgIC8vIEZvcm0gaW5wdXRcbiAgICAgICAgJHNjb3BlLmluID0ge1xuICAgICAgICAgICAgY3VzdG9tZXJfbmFtZTogbnVsbCxcbiAgICAgICAgICAgIHNhbGVfZGF0ZTogbnVsbCxcbiAgICAgICAgfVxuICAgIH1cblxufSkoYnN0YXIuYXBwKTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
