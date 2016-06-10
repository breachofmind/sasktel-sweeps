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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJsb2dpbkN0cmwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InNyYy5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgYnN0YXIgPSB7fTtcblxuICAgIHdpbmRvdy5ic3RhciA9IGJzdGFyO1xuXG4gICAgYnN0YXIuYXBwID0gYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsnbmdSb3V0ZSddKTtcblxuICAgIHZhciBpbml0ID0gW3NldHVwQWpheEhlYWRlcnNdO1xuICAgIGJzdGFyLnJlYWR5ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgaW5pdC5wdXNoKGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYnN0YXIuY3NyZlRva2VuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAkKCdtZXRhW25hbWU9XCJjc3JmLXRva2VuXCJdJykuYXR0cignY29udGVudCcpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBhIGNyc2YgdG9rZW4gdG8gYWxsIEFKQVggaGVhZGVycy5cbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0dXBBamF4SGVhZGVycygpXG4gICAge1xuICAgICAgICAkLmFqYXhTZXR1cCh7XG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgJ1gtQ1NSRi1UT0tFTic6IGJzdGFyLmNzcmZUb2tlbigpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgaW5pdC5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9KVxuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKGFwcCkge1xuXG4gICAgYXBwLmNvbnRyb2xsZXIoJ2xvZ2luQ3RybCcsIExvZ2luRm9ybUNvbnRyb2xsZXIpO1xuXG4gICAgdmFyIGxvZ2luVXJsID0gXCIvbG9naW5cIjtcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHVzZXIgbG9naW4uXG4gICAgICogQHNlZSB2aWV3cy9sb2dpbi5lanNcbiAgICAgKiBAcGFyYW0gJHNjb3BlXG4gICAgICogQHBhcmFtICRodHRwXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gTG9naW5Gb3JtQ29udHJvbGxlcigkc2NvcGUsJGh0dHAsJGxvY2F0aW9uLCR0aW1lb3V0KVxuICAgIHtcbiAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSBmYWxzZTtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgICRzY29wZS5ndWVzdCA9IHtcbiAgICAgICAgICAgIHVzZXJuYW1lOiBudWxsLFxuICAgICAgICAgICAgcGFzc3dvcmQ6IG51bGwsXG4gICAgICAgICAgICBfY3NyZjogbnVsbFxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zdWJtaXQgPSBmdW5jdGlvbigkZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJHNjb3BlLmd1ZXN0Ll9jc3JmID0gYnN0YXIuY3NyZlRva2VuKCk7XG4gICAgICAgICAgICAkc2NvcGUuc3VibWl0dGluZyA9IHRydWU7XG5cbiAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgJGh0dHAucG9zdChsb2dpblVybCwgJHNjb3BlLmd1ZXN0KVxuICAgICAgICAgICAgICAgICAgICAuc3VjY2Vzcyhsb2dpblN1Y2Nlc3MpXG4gICAgICAgICAgICAgICAgICAgIC5lcnJvcihsb2dpbkVycm9yKTtcbiAgICAgICAgICAgIH0sMjAwMCk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBsb2dpblN1Y2Nlc3MoZGF0YSkge1xuICAgICAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChkYXRhLnJlZGlyZWN0KSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZGF0YS5yZWRpcmVjdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGxvZ2luRXJyb3IoZXJyKSB7XG4gICAgICAgICAgICAkc2NvcGUuc3VibWl0dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gZXJyLmVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG59KShic3Rhci5hcHApOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
