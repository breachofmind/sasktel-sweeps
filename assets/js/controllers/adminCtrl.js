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
            var post = getValues(item, ['pending','accepted']);
            $http.put(item._url, post).success(function(response) {
                console.log(response);
            });
        };

        $timeout(getData, 500);
    }

})(bstar.app);