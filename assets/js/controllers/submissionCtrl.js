(function (app) {

    app.controller('submissionCtrl', SubmissionFormController);

    var submitUrl = "/submit";
    var peopleUrl = "/people";

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
        $scope.formComplete = function()
        {
            return $scope.submissionForm.$valid;
        };

        $scope.types = [
            {value: "smb",       text: "Small/Medium Business"},
            {value: "corpgovt",  text: "Corporate/Government"},
        ];

        // Support allowed is the total amount of supporting reps for this group.
        $scope.allowed = {
            smb:1, corpgovt:2
        };

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
            if ($scope.input.hasOwnProperty(prop)) {
                reset[prop] = $scope.input[prop];
            }
        }

        // Initial state
        $scope.people = new bstar.People;

        $scope.salesRepName = "";

        // Dates should not be in the future ;)
        $scope.maxSaleDate = moment();

        /**
         * Zero out the support assocs when the user changes the type again.
         * @returns void
         */
        $scope.changeType = function()
        {
            $scope.input.support_assocs = [];
        };

        /**
         * Add a sales rep to the list.
         * @returns void
         */
        $scope.addSalesRep = function()
        {
            var value = $scope.salesRepName.trim();
            if ($scope.input.support_assocs.length < $scope.allowed[$scope.input.type] && value != "") {
                $scope.input.support_assocs.push(value);
                $scope.salesRepName = "";
            }
        };

        /**
         * Remove a sales rep from the list.
         * @returns void
         */
        $scope.removeSalesRep = function(index)
        {
            $scope.input.support_assocs.splice(index,1);
        };

        /**
         * When the key is pressed when entering support reps
         * @param $event
         */
        $scope.salesRepEnter = function($event)
        {
            if ($event.keyCode === 13) {
                $event.preventDefault();
                $scope.addSalesRep();
            }
        };

        /**
         * Submit the form.
         * @param $event
         */
        $scope.submit = function($event)
        {
            $event.preventDefault();
            $scope.processing = true;
            $http.post(submitUrl, $scope.input)
                .success(submitSuccess)
                .error(submitError)
        };

        /**
         * Check if a field is filled.
         * @param field string
         * @returns {boolean}
         */
        $scope.isFilled = function(field)
        {
            return $scope.input[field] != null && $scope.input[field] != "";
        };

        /**
         * Focus on an input by ID.
         * @param elementId string
         */
        $scope.focusOn = function(elementId)
        {
            $timeout(function() { document.getElementById(elementId).focus(); });
        };


        $http.get(peopleUrl).success(function(data) {
            $scope.people.reset(data);
        });

        function submitSuccess(response)
        {
            $scope.processing = false;
            $scope.input = reset;
            bstar.modal.open("Thank you, your request has been submitted.");
        }

        function submitError(response)
        {
            $scope.processing = false;
        }

    }

})(bstar.app);