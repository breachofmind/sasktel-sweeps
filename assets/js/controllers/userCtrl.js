(function (app) {

    app.controller('userCtrl', UserTableController);


    function UserTableController($scope,$http,$timeout)
    {
        $http.defaults.headers.common['X-REQUESTED-WITH'] = "XMLHttpRequest";
        $http.defaults.headers.common['X-CSRF-TOKEN'] = bstar.csrfToken();


        $scope.loading = true;
        $scope.users = [];
        $scope.newUser = {
            first_name: null,
            last_name: null,
            email: null,
            password:null,
        };

        $scope.changePasswordOption = function(index)
        {
            var user = $scope.users[index];
        };

        $scope.removeUserOption = function(index)
        {
            var user = $scope.users[index];
            $http.delete('/api/v1/user/'+user.id).success(function(response) {
                $scope.users.splice(index,1);
            })
        };

        $scope.createUser = function()
        {
            $http.post('/api/v1/user', $scope.newUser).success(function(response) {
                $scope.users.push(response.data);
            });
        };

        function getData()
        {
            $http.get('/api/v1/user').success(function(response){

                $scope.loading = false;
                $scope.users = response.data;

            }).error(function(response) {

                bstar.modal.error("There was an error...");

            });
        }

        $timeout(getData,500);
    }

})(bstar.app);