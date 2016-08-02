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
        $scope.sort = null;
        $scope.sortDir = true;

        $scope.dates = {
            start: getFromStorage('startDate',moment().subtract(1,'month').toDate()),
            end: getFromStorage('endDate', moment().toDate())
        };

        // The table search criteria.
        $scope.search = {
            sort: {pending:-1, created_at:-1},
            where: {
                created_at: getDateRange()
            }
        };

        /**
         * Get a value from local storage.
         * @param key string
         * @param def Date
         * @returns {Date}
         */
        function getFromStorage(key,def)
        {
            var value = localStorage.getItem(key);
            if (! value) {
                return def;
            }
            return moment(new Date(value)).toDate();
        }

        /**
         * Return an object containing the date range.
         * @returns {{$gte: number, $lte: number}}
         */
        function getDateRange()
        {
            return {
                $gte:$scope.dates.start.toISOString(),
                $lte:$scope.dates.end.toISOString()
            };
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


            }).error(function(response) {
                bstar.modal.error("There was an error updating the item.");
                item.pending = true;
            });
        };

        /**
         * Delete an item from the database.
         * @param item
         * @param i
         */
        $scope.itemDelete = function(item,i)
        {
            if (window.confirm("Are you sure you want to delete this item?")) {
                $scope.loading = true;
                $http.delete(item._url).success(function(response) {
                    $scope.submissions.splice(i,1);
                }).finally(function(){
                    $scope.loading = false;
                })

            }
        };

        $scope.sortBy = function(field)
        {
            if ($scope.sort == field) {
                $scope.sortDir = !$scope.sortDir;
            } else {
                $scope.sortDir = true;
            }
            $scope.sort = field;
            $scope.submissions.sort(function(a,b) {
                return $scope.sortDir ? a[$scope.sort] > b[$scope.sort] : a[$scope.sort] < b[$scope.sort];
            })
        };

        $scope.sortingBy = function(field)
        {
            return field == $scope.sort;
        };

        /**
         * Generate a report url from the search criteria.
         * @returns {string}
         */
        $scope.reportUrl = function()
        {
            return "/api/v1/submission/report?s="+btoa(JSON.stringify($scope.search));
        };

        /**
         * Update the table with the new search criteria.
         * @returns void
         */
        $scope.update = function()
        {
            $scope.loading = true;
            var go = function(){
                $http.post('/api/v1/submission/search', $scope.search).success(function(response) {
                    $scope.loading = false;
                    $scope.submissions = response.data;
                });
            };
            $timeout(go, 500);
        };

        $scope.changeSearch = function()
        {
            $scope.search.where.created_at = getDateRange();
            localStorage.setItem('startDate', $scope.dates.start);
            localStorage.setItem('endDate', $scope.dates.end);
            $scope.update();
        };

        // Init
        $scope.update();
    }

})(bstar.app);