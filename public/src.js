(function () {

    var bstar = {};

    window.bstar = bstar;

    bstar.app = angular.module('app', ['ngRoute','720kb.datepicker']);

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

    var reset = {};

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
        $http.defaults.headers.common['X-CSRF-TOKEN'] = bstar.csrfToken();

        $scope.processing = false;

        $scope.types = [
            {value: "smb",       text: "Small/Medium Business"},
            {value: "corpgovt",  text: "Corporate/Government"},
        ];

        // Form input
        $scope.input = {
            customer_name:  null,
            sale_date:      null,
            type:           "smb",
            details:        "",
            business_priority : "",
            manager_id:     null,
            account_rep_id: null,
            sales_assoc_id: null,
            sales_rep_id:   null,
            support_assocs: []
        };

        // For resetting
        for (var prop in $scope.input) {
            reset[prop] = $scope.input[prop];
        }

        // Initial state
        $scope.people = [];

        $scope.salesRepName = null;

        /**
         * Add a sales rep to the list.
         * @returns void
         */
        $scope.addSalesRep = function()
        {
            $scope.input.support_assocs.push($scope.salesRepName);
        };

        /**
         * Remove a sales rep from the list.
         * @returns void
         */
        $scope.removeSalesRep = function(index)
        {
            $scope.input.support_assocs.splice(index,1);
        };

        $scope.submit = function($event)
        {
            $event.preventDefault();
            $scope.processing = true;
            $http.post('/submit', $scope.input).success(function(response) {
                $scope.processing = false;
                $scope.input = reset;
            })
        };


        $http.get('/people').success(function(data) {
            $scope.people = data;
        });
    }

})(bstar.app);
(function (app) {

    app.controller('adminCtrl', AdminTableController);

    function AdminTableController($scope,$http,$timeout)
    {
        $http.defaults.headers.common['X-REQUESTED-WITH'] = "XMLHttpRequest";
        $http.defaults.headers.common['X-CSRF-TOKEN'] = bstar.csrfToken();

        $scope.loading = true;
        $scope.submissions = [];

        function getData()
        {
            $http.get('/api/v1/submission').success(function(response) {
                $scope.loading = false;
                $scope.submissions = response.data;
            });
        }

        $scope.toggleItem = function(item)
        {
            if (item.open == undefined) item.open = false;
            item.open = ! item.open;
        };

        $scope.itemAccept = function(item)
        {
            item.pending = false;
            $http.put(item._url, item).success(function(response) {
                console.log(response);
            });
        };

        $timeout(getData, 1000);
    }

})(bstar.app);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJsb2dpbkN0cmwuanMiLCJzdWJtaXNzaW9uQ3RybC5qcyIsImFkbWluQ3RybC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJzcmMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGJzdGFyID0ge307XG5cbiAgICB3aW5kb3cuYnN0YXIgPSBic3RhcjtcblxuICAgIGJzdGFyLmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbJ25nUm91dGUnLCc3MjBrYi5kYXRlcGlja2VyJ10pO1xuXG4gICAgLyoqXG4gICAgICogUXVldWUgYSBkb2N1bWVudC5yZWFkeSBjYWxsYmFjay5cbiAgICAgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgdmFyIGluaXQgPSBbc2V0dXBBamF4SGVhZGVyc107XG4gICAgYnN0YXIucmVhZHkgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICBpbml0LnB1c2goY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBjc3JmIGZpZWxkLlxuICAgICAqIFJlcXVpcmVkIGZvciBhbnkgYWpheCBQT1NUIG9wZXJhdGlvbnMuXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBic3Rhci5jc3JmVG9rZW4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICQoJ21ldGFbbmFtZT1cImNzcmYtdG9rZW5cIl0nKS5hdHRyKCdjb250ZW50Jyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGEgY3JzZiB0b2tlbiB0byBhbGwgQUpBWCBoZWFkZXJzLlxuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzZXR1cEFqYXhIZWFkZXJzKClcbiAgICB7XG4gICAgICAgICQuYWpheFNldHVwKHtcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAnWC1DU1JGLVRPS0VOJzogYnN0YXIuY3NyZlRva2VuKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlyZSB3aGVuIERPTSBsb2FkZWQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgaW5pdC5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9KVxuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKGFwcCkge1xuXG4gICAgYXBwLmNvbnRyb2xsZXIoJ2xvZ2luQ3RybCcsIExvZ2luRm9ybUNvbnRyb2xsZXIpO1xuXG4gICAgdmFyIGxvZ2luVXJsID0gXCIvbG9naW5cIjtcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHVzZXIgbG9naW4uXG4gICAgICogQHNlZSB2aWV3cy9sb2dpbi5lanNcbiAgICAgKiBAcGFyYW0gJHNjb3BlXG4gICAgICogQHBhcmFtICRodHRwXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gTG9naW5Gb3JtQ29udHJvbGxlcigkc2NvcGUsJGh0dHAsJGxvY2F0aW9uLCR0aW1lb3V0KVxuICAgIHtcbiAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSBmYWxzZTtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgICRzY29wZS5ndWVzdCA9IHtcbiAgICAgICAgICAgIHVzZXJuYW1lOiBudWxsLFxuICAgICAgICAgICAgcGFzc3dvcmQ6IG51bGwsXG4gICAgICAgICAgICBfY3NyZjogbnVsbFxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zdWJtaXQgPSBmdW5jdGlvbigkZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJHNjb3BlLmd1ZXN0Ll9jc3JmID0gYnN0YXIuY3NyZlRva2VuKCk7XG4gICAgICAgICAgICAkc2NvcGUuc3VibWl0dGluZyA9IHRydWU7XG5cbiAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgJGh0dHAucG9zdChsb2dpblVybCwgJHNjb3BlLmd1ZXN0KVxuICAgICAgICAgICAgICAgICAgICAuc3VjY2Vzcyhsb2dpblN1Y2Nlc3MpXG4gICAgICAgICAgICAgICAgICAgIC5lcnJvcihsb2dpbkVycm9yKTtcbiAgICAgICAgICAgIH0sMjAwMCk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBsb2dpblN1Y2Nlc3MoZGF0YSkge1xuICAgICAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChkYXRhLnJlZGlyZWN0KSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZGF0YS5yZWRpcmVjdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGxvZ2luRXJyb3IoZXJyKSB7XG4gICAgICAgICAgICAkc2NvcGUuc3VibWl0dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gZXJyLmVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG59KShic3Rhci5hcHApOyIsIihmdW5jdGlvbiAoYXBwKSB7XG5cbiAgICBhcHAuY29udHJvbGxlcignc3VibWlzc2lvbkN0cmwnLCBTdWJtaXNzaW9uRm9ybUNvbnRyb2xsZXIpO1xuXG4gICAgYXBwLmZpbHRlcigndGVhbScsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24ocGVvcGxlLG1hbmFnZXJfaWQpIHtcbiAgICAgICAgICAgIHZhciBvdXQgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxwZW9wbGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAocGVvcGxlW2ldLm1hbmFnZXJfaWQgIT0gbWFuYWdlcl9pZCkge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0LnB1c2gocGVvcGxlW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciByZXNldCA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgdXNlciBsb2dpbi5cbiAgICAgKiBAc2VlIHZpZXdzL2xvZ2luLmVqc1xuICAgICAqIEBwYXJhbSAkc2NvcGVcbiAgICAgKiBAcGFyYW0gJGh0dHBcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBTdWJtaXNzaW9uRm9ybUNvbnRyb2xsZXIoJHNjb3BlLCRodHRwLCR0aW1lb3V0KVxuICAgIHtcbiAgICAgICAgJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtUkVRVUVTVEVELVdJVEgnXSA9IFwiWE1MSHR0cFJlcXVlc3RcIjtcbiAgICAgICAgJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtQ1NSRi1UT0tFTiddID0gYnN0YXIuY3NyZlRva2VuKCk7XG5cbiAgICAgICAgJHNjb3BlLnByb2Nlc3NpbmcgPSBmYWxzZTtcblxuICAgICAgICAkc2NvcGUudHlwZXMgPSBbXG4gICAgICAgICAgICB7dmFsdWU6IFwic21iXCIsICAgICAgIHRleHQ6IFwiU21hbGwvTWVkaXVtIEJ1c2luZXNzXCJ9LFxuICAgICAgICAgICAge3ZhbHVlOiBcImNvcnBnb3Z0XCIsICB0ZXh0OiBcIkNvcnBvcmF0ZS9Hb3Zlcm5tZW50XCJ9LFxuICAgICAgICBdO1xuXG4gICAgICAgIC8vIEZvcm0gaW5wdXRcbiAgICAgICAgJHNjb3BlLmlucHV0ID0ge1xuICAgICAgICAgICAgY3VzdG9tZXJfbmFtZTogIG51bGwsXG4gICAgICAgICAgICBzYWxlX2RhdGU6ICAgICAgbnVsbCxcbiAgICAgICAgICAgIHR5cGU6ICAgICAgICAgICBcInNtYlwiLFxuICAgICAgICAgICAgZGV0YWlsczogICAgICAgIFwiXCIsXG4gICAgICAgICAgICBidXNpbmVzc19wcmlvcml0eSA6IFwiXCIsXG4gICAgICAgICAgICBtYW5hZ2VyX2lkOiAgICAgbnVsbCxcbiAgICAgICAgICAgIGFjY291bnRfcmVwX2lkOiBudWxsLFxuICAgICAgICAgICAgc2FsZXNfYXNzb2NfaWQ6IG51bGwsXG4gICAgICAgICAgICBzYWxlc19yZXBfaWQ6ICAgbnVsbCxcbiAgICAgICAgICAgIHN1cHBvcnRfYXNzb2NzOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEZvciByZXNldHRpbmdcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiAkc2NvcGUuaW5wdXQpIHtcbiAgICAgICAgICAgIHJlc2V0W3Byb3BdID0gJHNjb3BlLmlucHV0W3Byb3BdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbCBzdGF0ZVxuICAgICAgICAkc2NvcGUucGVvcGxlID0gW107XG5cbiAgICAgICAgJHNjb3BlLnNhbGVzUmVwTmFtZSA9IG51bGw7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFkZCBhIHNhbGVzIHJlcCB0byB0aGUgbGlzdC5cbiAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLmFkZFNhbGVzUmVwID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuaW5wdXQuc3VwcG9ydF9hc3NvY3MucHVzaCgkc2NvcGUuc2FsZXNSZXBOYW1lKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlIGEgc2FsZXMgcmVwIGZyb20gdGhlIGxpc3QuXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS5yZW1vdmVTYWxlc1JlcCA9IGZ1bmN0aW9uKGluZGV4KVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuaW5wdXQuc3VwcG9ydF9hc3NvY3Muc3BsaWNlKGluZGV4LDEpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zdWJtaXQgPSBmdW5jdGlvbigkZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJHNjb3BlLnByb2Nlc3NpbmcgPSB0cnVlO1xuICAgICAgICAgICAgJGh0dHAucG9zdCgnL3N1Ym1pdCcsICRzY29wZS5pbnB1dCkuc3VjY2VzcyhmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS5wcm9jZXNzaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmlucHV0ID0gcmVzZXQ7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG5cbiAgICAgICAgJGh0dHAuZ2V0KCcvcGVvcGxlJykuc3VjY2VzcyhmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAkc2NvcGUucGVvcGxlID0gZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG59KShic3Rhci5hcHApOyIsIihmdW5jdGlvbiAoYXBwKSB7XG5cbiAgICBhcHAuY29udHJvbGxlcignYWRtaW5DdHJsJywgQWRtaW5UYWJsZUNvbnRyb2xsZXIpO1xuXG4gICAgZnVuY3Rpb24gQWRtaW5UYWJsZUNvbnRyb2xsZXIoJHNjb3BlLCRodHRwLCR0aW1lb3V0KVxuICAgIHtcbiAgICAgICAgJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtUkVRVUVTVEVELVdJVEgnXSA9IFwiWE1MSHR0cFJlcXVlc3RcIjtcbiAgICAgICAgJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtQ1NSRi1UT0tFTiddID0gYnN0YXIuY3NyZlRva2VuKCk7XG5cbiAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAkc2NvcGUuc3VibWlzc2lvbnMgPSBbXTtcblxuICAgICAgICBmdW5jdGlvbiBnZXREYXRhKClcbiAgICAgICAge1xuICAgICAgICAgICAgJGh0dHAuZ2V0KCcvYXBpL3YxL3N1Ym1pc3Npb24nKS5zdWNjZXNzKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbnMgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUudG9nZ2xlSXRlbSA9IGZ1bmN0aW9uKGl0ZW0pXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChpdGVtLm9wZW4gPT0gdW5kZWZpbmVkKSBpdGVtLm9wZW4gPSBmYWxzZTtcbiAgICAgICAgICAgIGl0ZW0ub3BlbiA9ICEgaXRlbS5vcGVuO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5pdGVtQWNjZXB0ID0gZnVuY3Rpb24oaXRlbSlcbiAgICAgICAge1xuICAgICAgICAgICAgaXRlbS5wZW5kaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAkaHR0cC5wdXQoaXRlbS5fdXJsLCBpdGVtKS5zdWNjZXNzKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHRpbWVvdXQoZ2V0RGF0YSwgMTAwMCk7XG4gICAgfVxuXG59KShic3Rhci5hcHApOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
