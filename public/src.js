(function () {

    var bstar = {};

    window.bstar = bstar;

    bstar.app = angular.module('app', ['datePicker','ngAnimate']);

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
            sale_date:      new Date(),
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
            $scope.salesRepName = null;
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

    function getValues(object,props)
    {
        var out = {};
        props.forEach(function(prop) {
            out[prop] = object[prop];
        });
        return out;
    }

    function AdminTableController($scope,$http,$timeout)
    {
        $http.defaults.headers.common['X-REQUESTED-WITH'] = "XMLHttpRequest";
        $http.defaults.headers.common['X-CSRF-TOKEN'] = bstar.csrfToken();

        $scope.loading = true;
        $scope.submissions = [];
        $scope.pager = null;
        $scope.dateStart = moment().subtract(1,'month');
        $scope.dateEnd = moment();

        function getData()
        {
            $http.get('/api/v1/submission').success(function(response) {
                $scope.loading = false;
                $scope.submissions = response.data;
            });
        }

        /**
         * Toggle an item open or closed.
         * @param item
         */
        $scope.toggleItem = function(item)
        {
            if (item.open == undefined) item.open = false;
            item.open = ! item.open;
        };

        /**
         * Accept or deny an item.
         * @param item
         */
        $scope.itemAccept = function(item)
        {
            item.pending = false;
            var post = getValues(item, ['pending','accepted']);
            $http.put(item._url, post).success(function(response) {
                console.log(response);
            });
        };

        $timeout(getData, 500);
    }

})(bstar.app);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJsb2dpbkN0cmwuanMiLCJzdWJtaXNzaW9uQ3RybC5qcyIsImFkbWluQ3RybC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InNyYy5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgYnN0YXIgPSB7fTtcblxuICAgIHdpbmRvdy5ic3RhciA9IGJzdGFyO1xuXG4gICAgYnN0YXIuYXBwID0gYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsnZGF0ZVBpY2tlcicsJ25nQW5pbWF0ZSddKTtcblxuICAgIC8qKlxuICAgICAqIFF1ZXVlIGEgZG9jdW1lbnQucmVhZHkgY2FsbGJhY2suXG4gICAgICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMgdm9pZFxuICAgICAqL1xuICAgIHZhciBpbml0ID0gW3NldHVwQWpheEhlYWRlcnNdO1xuICAgIGJzdGFyLnJlYWR5ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgaW5pdC5wdXNoKGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSB2YWx1ZSBvZiB0aGUgY3NyZiBmaWVsZC5cbiAgICAgKiBSZXF1aXJlZCBmb3IgYW55IGFqYXggUE9TVCBvcGVyYXRpb25zLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgYnN0YXIuY3NyZlRva2VuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAkKCdtZXRhW25hbWU9XCJjc3JmLXRva2VuXCJdJykuYXR0cignY29udGVudCcpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBhIGNyc2YgdG9rZW4gdG8gYWxsIEFKQVggaGVhZGVycy5cbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0dXBBamF4SGVhZGVycygpXG4gICAge1xuICAgICAgICAkLmFqYXhTZXR1cCh7XG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgJ1gtQ1NSRi1UT0tFTic6IGJzdGFyLmNzcmZUb2tlbigpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZpcmUgd2hlbiBET00gbG9hZGVkLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIGluaXQuZm9yRWFjaChmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfSlcbiAgICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uIChhcHApIHtcblxuICAgIGFwcC5jb250cm9sbGVyKCdsb2dpbkN0cmwnLCBMb2dpbkZvcm1Db250cm9sbGVyKTtcblxuICAgIHZhciBsb2dpblVybCA9IFwiL2xvZ2luXCI7XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSB1c2VyIGxvZ2luLlxuICAgICAqIEBzZWUgdmlld3MvbG9naW4uZWpzXG4gICAgICogQHBhcmFtICRzY29wZVxuICAgICAqIEBwYXJhbSAkaHR0cFxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIExvZ2luRm9ybUNvbnRyb2xsZXIoJHNjb3BlLCRodHRwLCRsb2NhdGlvbiwkdGltZW91dClcbiAgICB7XG4gICAgICAgICRzY29wZS5zdWJtaXR0aW5nID0gZmFsc2U7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICAkc2NvcGUuZ3Vlc3QgPSB7XG4gICAgICAgICAgICB1c2VybmFtZTogbnVsbCxcbiAgICAgICAgICAgIHBhc3N3b3JkOiBudWxsLFxuICAgICAgICAgICAgX2NzcmY6IG51bGxcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24oJGV2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICRzY29wZS5ndWVzdC5fY3NyZiA9IGJzdGFyLmNzcmZUb2tlbigpO1xuICAgICAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSB0cnVlO1xuXG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICRodHRwLnBvc3QobG9naW5VcmwsICRzY29wZS5ndWVzdClcbiAgICAgICAgICAgICAgICAgICAgLnN1Y2Nlc3MobG9naW5TdWNjZXNzKVxuICAgICAgICAgICAgICAgICAgICAuZXJyb3IobG9naW5FcnJvcik7XG4gICAgICAgICAgICB9LDIwMDApO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gbG9naW5TdWNjZXNzKGRhdGEpIHtcbiAgICAgICAgICAgICRzY29wZS5zdWJtaXR0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoZGF0YS5yZWRpcmVjdCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGRhdGEucmVkaXJlY3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBsb2dpbkVycm9yKGVycikge1xuICAgICAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9IGVyci5lcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxufSkoYnN0YXIuYXBwKTsiLCIoZnVuY3Rpb24gKGFwcCkge1xuXG4gICAgYXBwLmNvbnRyb2xsZXIoJ3N1Ym1pc3Npb25DdHJsJywgU3VibWlzc2lvbkZvcm1Db250cm9sbGVyKTtcblxuICAgIGFwcC5maWx0ZXIoJ3RlYW0nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHBlb3BsZSxtYW5hZ2VyX2lkKSB7XG4gICAgICAgICAgICB2YXIgb3V0ID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8cGVvcGxlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBlb3BsZVtpXS5tYW5hZ2VyX2lkICE9IG1hbmFnZXJfaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dC5wdXNoKHBlb3BsZVtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb3V0O1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgcmVzZXQgPSB7fTtcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHVzZXIgbG9naW4uXG4gICAgICogQHNlZSB2aWV3cy9sb2dpbi5lanNcbiAgICAgKiBAcGFyYW0gJHNjb3BlXG4gICAgICogQHBhcmFtICRodHRwXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gU3VibWlzc2lvbkZvcm1Db250cm9sbGVyKCRzY29wZSwkaHR0cCwkdGltZW91dClcbiAgICB7XG4gICAgICAgICRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLVJFUVVFU1RFRC1XSVRIJ10gPSBcIlhNTEh0dHBSZXF1ZXN0XCI7XG4gICAgICAgICRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLUNTUkYtVE9LRU4nXSA9IGJzdGFyLmNzcmZUb2tlbigpO1xuXG4gICAgICAgICRzY29wZS5wcm9jZXNzaW5nID0gZmFsc2U7XG5cbiAgICAgICAgJHNjb3BlLnR5cGVzID0gW1xuICAgICAgICAgICAge3ZhbHVlOiBcInNtYlwiLCAgICAgICB0ZXh0OiBcIlNtYWxsL01lZGl1bSBCdXNpbmVzc1wifSxcbiAgICAgICAgICAgIHt2YWx1ZTogXCJjb3JwZ292dFwiLCAgdGV4dDogXCJDb3Jwb3JhdGUvR292ZXJubWVudFwifSxcbiAgICAgICAgXTtcblxuICAgICAgICAvLyBGb3JtIGlucHV0XG4gICAgICAgICRzY29wZS5pbnB1dCA9IHtcbiAgICAgICAgICAgIGN1c3RvbWVyX25hbWU6ICBudWxsLFxuICAgICAgICAgICAgc2FsZV9kYXRlOiAgICAgIG5ldyBEYXRlKCksXG4gICAgICAgICAgICB0eXBlOiAgICAgICAgICAgXCJzbWJcIixcbiAgICAgICAgICAgIGRldGFpbHM6ICAgICAgICBcIlwiLFxuICAgICAgICAgICAgYnVzaW5lc3NfcHJpb3JpdHkgOiBcIlwiLFxuICAgICAgICAgICAgbWFuYWdlcl9pZDogICAgIG51bGwsXG4gICAgICAgICAgICBhY2NvdW50X3JlcF9pZDogbnVsbCxcbiAgICAgICAgICAgIHNhbGVzX2Fzc29jX2lkOiBudWxsLFxuICAgICAgICAgICAgc2FsZXNfcmVwX2lkOiAgIG51bGwsXG4gICAgICAgICAgICBzdXBwb3J0X2Fzc29jczogW11cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBGb3IgcmVzZXR0aW5nXG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gJHNjb3BlLmlucHV0KSB7XG4gICAgICAgICAgICByZXNldFtwcm9wXSA9ICRzY29wZS5pbnB1dFtwcm9wXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWwgc3RhdGVcbiAgICAgICAgJHNjb3BlLnBlb3BsZSA9IFtdO1xuXG4gICAgICAgICRzY29wZS5zYWxlc1JlcE5hbWUgPSBudWxsO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGQgYSBzYWxlcyByZXAgdG8gdGhlIGxpc3QuXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS5hZGRTYWxlc1JlcCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLmlucHV0LnN1cHBvcnRfYXNzb2NzLnB1c2goJHNjb3BlLnNhbGVzUmVwTmFtZSk7XG4gICAgICAgICAgICAkc2NvcGUuc2FsZXNSZXBOYW1lID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlIGEgc2FsZXMgcmVwIGZyb20gdGhlIGxpc3QuXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS5yZW1vdmVTYWxlc1JlcCA9IGZ1bmN0aW9uKGluZGV4KVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuaW5wdXQuc3VwcG9ydF9hc3NvY3Muc3BsaWNlKGluZGV4LDEpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zdWJtaXQgPSBmdW5jdGlvbigkZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJHNjb3BlLnByb2Nlc3NpbmcgPSB0cnVlO1xuICAgICAgICAgICAgJGh0dHAucG9zdCgnL3N1Ym1pdCcsICRzY29wZS5pbnB1dCkuc3VjY2VzcyhmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS5wcm9jZXNzaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmlucHV0ID0gcmVzZXQ7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG5cbiAgICAgICAgJGh0dHAuZ2V0KCcvcGVvcGxlJykuc3VjY2VzcyhmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAkc2NvcGUucGVvcGxlID0gZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG59KShic3Rhci5hcHApOyIsIihmdW5jdGlvbiAoYXBwKSB7XG5cbiAgICBhcHAuY29udHJvbGxlcignYWRtaW5DdHJsJywgQWRtaW5UYWJsZUNvbnRyb2xsZXIpO1xuXG4gICAgZnVuY3Rpb24gZ2V0VmFsdWVzKG9iamVjdCxwcm9wcylcbiAgICB7XG4gICAgICAgIHZhciBvdXQgPSB7fTtcbiAgICAgICAgcHJvcHMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICAgICAgICBvdXRbcHJvcF0gPSBvYmplY3RbcHJvcF07XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIEFkbWluVGFibGVDb250cm9sbGVyKCRzY29wZSwkaHR0cCwkdGltZW91dClcbiAgICB7XG4gICAgICAgICRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLVJFUVVFU1RFRC1XSVRIJ10gPSBcIlhNTEh0dHBSZXF1ZXN0XCI7XG4gICAgICAgICRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLUNTUkYtVE9LRU4nXSA9IGJzdGFyLmNzcmZUb2tlbigpO1xuXG4gICAgICAgICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb25zID0gW107XG4gICAgICAgICRzY29wZS5wYWdlciA9IG51bGw7XG4gICAgICAgICRzY29wZS5kYXRlU3RhcnQgPSBtb21lbnQoKS5zdWJ0cmFjdCgxLCdtb250aCcpO1xuICAgICAgICAkc2NvcGUuZGF0ZUVuZCA9IG1vbWVudCgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldERhdGEoKVxuICAgICAgICB7XG4gICAgICAgICAgICAkaHR0cC5nZXQoJy9hcGkvdjEvc3VibWlzc2lvbicpLnN1Y2Nlc3MoZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9ucyA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUb2dnbGUgYW4gaXRlbSBvcGVuIG9yIGNsb3NlZC5cbiAgICAgICAgICogQHBhcmFtIGl0ZW1cbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS50b2dnbGVJdGVtID0gZnVuY3Rpb24oaXRlbSlcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKGl0ZW0ub3BlbiA9PSB1bmRlZmluZWQpIGl0ZW0ub3BlbiA9IGZhbHNlO1xuICAgICAgICAgICAgaXRlbS5vcGVuID0gISBpdGVtLm9wZW47XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFjY2VwdCBvciBkZW55IGFuIGl0ZW0uXG4gICAgICAgICAqIEBwYXJhbSBpdGVtXG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUuaXRlbUFjY2VwdCA9IGZ1bmN0aW9uKGl0ZW0pXG4gICAgICAgIHtcbiAgICAgICAgICAgIGl0ZW0ucGVuZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIHBvc3QgPSBnZXRWYWx1ZXMoaXRlbSwgWydwZW5kaW5nJywnYWNjZXB0ZWQnXSk7XG4gICAgICAgICAgICAkaHR0cC5wdXQoaXRlbS5fdXJsLCBwb3N0KS5zdWNjZXNzKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHRpbWVvdXQoZ2V0RGF0YSwgNTAwKTtcbiAgICB9XG5cbn0pKGJzdGFyLmFwcCk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
