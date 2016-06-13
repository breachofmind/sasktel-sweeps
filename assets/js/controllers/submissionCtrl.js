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