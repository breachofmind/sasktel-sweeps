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

    app.filter('team', function() {
        return function(people,manager_id) {
            var out = [];
            for (var i=0; i<people.length; i++) {
                if (people[i].manager_id != manager_id) {
                    continue;
                }
                out.push(people[i]);
            }
            return out;
        }
    });

    /**
     * Handles the user login.
     * @see views/login.ejs
     * @param $scope
     * @param $http
     * @constructor
     */
    function SubmissionFormController($scope,$http,$timeout)
    {
        $http.defaults.headers.common['X-REQUESTED-WITH'] = "XMLHttpRequest";

        $scope.types = [
            {value:"smb", text:"Small/Medium Business"},
            {value:"corpgovt", text:"Corporate/Government"},
        ]

        // Form input
        $scope.input = {
            customer_name: null,
            sale_date: null,
            sale_type: "smb",
            manager_id: null,
            account_rep_id: null,
            sales_assoc_id: null,
            sales_rep_id: null,
            support_assocs: []
        };

        $scope.people = [];

        $scope.salesRepName = null;

        $scope.addSalesRep = function()
        {
            $scope.input.support_assocs.push($scope.salesRepName);
        };

        $scope.removeSalesRep = function(index)
        {
            $scope.input.support_assocs.splice(index,1);
        };



        $http.get('/people').success(function(data) {
            $scope.people = data;
        });
    }

})(bstar.app);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJsb2dpbkN0cmwuanMiLCJzdWJtaXNzaW9uQ3RybC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoic3JjLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBic3RhciA9IHt9O1xuXG4gICAgd2luZG93LmJzdGFyID0gYnN0YXI7XG5cbiAgICBic3Rhci5hcHAgPSBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWyduZ1JvdXRlJ10pO1xuXG4gICAgLyoqXG4gICAgICogUXVldWUgYSBkb2N1bWVudC5yZWFkeSBjYWxsYmFjay5cbiAgICAgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgdmFyIGluaXQgPSBbc2V0dXBBamF4SGVhZGVyc107XG4gICAgYnN0YXIucmVhZHkgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICBpbml0LnB1c2goY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBjc3JmIGZpZWxkLlxuICAgICAqIFJlcXVpcmVkIGZvciBhbnkgYWpheCBQT1NUIG9wZXJhdGlvbnMuXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBic3Rhci5jc3JmVG9rZW4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICQoJ21ldGFbbmFtZT1cImNzcmYtdG9rZW5cIl0nKS5hdHRyKCdjb250ZW50Jyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGEgY3JzZiB0b2tlbiB0byBhbGwgQUpBWCBoZWFkZXJzLlxuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzZXR1cEFqYXhIZWFkZXJzKClcbiAgICB7XG4gICAgICAgICQuYWpheFNldHVwKHtcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAnWC1DU1JGLVRPS0VOJzogYnN0YXIuY3NyZlRva2VuKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlyZSB3aGVuIERPTSBsb2FkZWQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgaW5pdC5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9KVxuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKGFwcCkge1xuXG4gICAgYXBwLmNvbnRyb2xsZXIoJ2xvZ2luQ3RybCcsIExvZ2luRm9ybUNvbnRyb2xsZXIpO1xuXG4gICAgdmFyIGxvZ2luVXJsID0gXCIvbG9naW5cIjtcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHVzZXIgbG9naW4uXG4gICAgICogQHNlZSB2aWV3cy9sb2dpbi5lanNcbiAgICAgKiBAcGFyYW0gJHNjb3BlXG4gICAgICogQHBhcmFtICRodHRwXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gTG9naW5Gb3JtQ29udHJvbGxlcigkc2NvcGUsJGh0dHAsJGxvY2F0aW9uLCR0aW1lb3V0KVxuICAgIHtcbiAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSBmYWxzZTtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgICRzY29wZS5ndWVzdCA9IHtcbiAgICAgICAgICAgIHVzZXJuYW1lOiBudWxsLFxuICAgICAgICAgICAgcGFzc3dvcmQ6IG51bGwsXG4gICAgICAgICAgICBfY3NyZjogbnVsbFxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zdWJtaXQgPSBmdW5jdGlvbigkZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJHNjb3BlLmd1ZXN0Ll9jc3JmID0gYnN0YXIuY3NyZlRva2VuKCk7XG4gICAgICAgICAgICAkc2NvcGUuc3VibWl0dGluZyA9IHRydWU7XG5cbiAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgJGh0dHAucG9zdChsb2dpblVybCwgJHNjb3BlLmd1ZXN0KVxuICAgICAgICAgICAgICAgICAgICAuc3VjY2Vzcyhsb2dpblN1Y2Nlc3MpXG4gICAgICAgICAgICAgICAgICAgIC5lcnJvcihsb2dpbkVycm9yKTtcbiAgICAgICAgICAgIH0sMjAwMCk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBsb2dpblN1Y2Nlc3MoZGF0YSkge1xuICAgICAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChkYXRhLnJlZGlyZWN0KSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZGF0YS5yZWRpcmVjdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGxvZ2luRXJyb3IoZXJyKSB7XG4gICAgICAgICAgICAkc2NvcGUuc3VibWl0dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gZXJyLmVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG59KShic3Rhci5hcHApOyIsIihmdW5jdGlvbiAoYXBwKSB7XG5cbiAgICBhcHAuY29udHJvbGxlcignc3VibWlzc2lvbkN0cmwnLCBTdWJtaXNzaW9uRm9ybUNvbnRyb2xsZXIpO1xuXG4gICAgYXBwLmZpbHRlcigndGVhbScsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24ocGVvcGxlLG1hbmFnZXJfaWQpIHtcbiAgICAgICAgICAgIHZhciBvdXQgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxwZW9wbGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAocGVvcGxlW2ldLm1hbmFnZXJfaWQgIT0gbWFuYWdlcl9pZCkge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0LnB1c2gocGVvcGxlW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHVzZXIgbG9naW4uXG4gICAgICogQHNlZSB2aWV3cy9sb2dpbi5lanNcbiAgICAgKiBAcGFyYW0gJHNjb3BlXG4gICAgICogQHBhcmFtICRodHRwXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gU3VibWlzc2lvbkZvcm1Db250cm9sbGVyKCRzY29wZSwkaHR0cCwkdGltZW91dClcbiAgICB7XG4gICAgICAgICRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLVJFUVVFU1RFRC1XSVRIJ10gPSBcIlhNTEh0dHBSZXF1ZXN0XCI7XG5cbiAgICAgICAgJHNjb3BlLnR5cGVzID0gW1xuICAgICAgICAgICAge3ZhbHVlOlwic21iXCIsIHRleHQ6XCJTbWFsbC9NZWRpdW0gQnVzaW5lc3NcIn0sXG4gICAgICAgICAgICB7dmFsdWU6XCJjb3JwZ292dFwiLCB0ZXh0OlwiQ29ycG9yYXRlL0dvdmVybm1lbnRcIn0sXG4gICAgICAgIF1cblxuICAgICAgICAvLyBGb3JtIGlucHV0XG4gICAgICAgICRzY29wZS5pbnB1dCA9IHtcbiAgICAgICAgICAgIGN1c3RvbWVyX25hbWU6IG51bGwsXG4gICAgICAgICAgICBzYWxlX2RhdGU6IG51bGwsXG4gICAgICAgICAgICBzYWxlX3R5cGU6IFwic21iXCIsXG4gICAgICAgICAgICBtYW5hZ2VyX2lkOiBudWxsLFxuICAgICAgICAgICAgYWNjb3VudF9yZXBfaWQ6IG51bGwsXG4gICAgICAgICAgICBzYWxlc19hc3NvY19pZDogbnVsbCxcbiAgICAgICAgICAgIHNhbGVzX3JlcF9pZDogbnVsbCxcbiAgICAgICAgICAgIHN1cHBvcnRfYXNzb2NzOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5wZW9wbGUgPSBbXTtcblxuICAgICAgICAkc2NvcGUuc2FsZXNSZXBOYW1lID0gbnVsbDtcblxuICAgICAgICAkc2NvcGUuYWRkU2FsZXNSZXAgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5pbnB1dC5zdXBwb3J0X2Fzc29jcy5wdXNoKCRzY29wZS5zYWxlc1JlcE5hbWUpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5yZW1vdmVTYWxlc1JlcCA9IGZ1bmN0aW9uKGluZGV4KVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuaW5wdXQuc3VwcG9ydF9hc3NvY3Muc3BsaWNlKGluZGV4LDEpO1xuICAgICAgICB9O1xuXG5cblxuICAgICAgICAkaHR0cC5nZXQoJy9wZW9wbGUnKS5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICRzY29wZS5wZW9wbGUgPSBkYXRhO1xuICAgICAgICB9KTtcbiAgICB9XG5cbn0pKGJzdGFyLmFwcCk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
