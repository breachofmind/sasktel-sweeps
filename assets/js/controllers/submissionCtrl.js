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