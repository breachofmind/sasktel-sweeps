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