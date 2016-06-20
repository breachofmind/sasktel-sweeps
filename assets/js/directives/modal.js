(function (app) {

    app.directive('bstarModal', ModalDirective);
    app.directive('modalOpen', ModalOpenDirective);

    var Actions = {};

    /**
     * Register a new modal action.
     * @param name string
     * @param object
     * @returns {object}
     */
    bstar.registerModalAction = function(name, object)
    {
        return Actions[name] = object;
    };

    /**
     * Shortcut for adding modal.openKey to elements.
     * @returns {{restrict: string, link: link}}
     * @constructor
     */
    function ModalOpenDirective()
    {
        return {
            restrict: "A",
            link: function(scope,element,attrs)
            {
                element.on('click', function(event) {
                    bstar.modal.openKey(attrs.modalOpen);
                    scope.$apply();
                })
            }
        }
    }

    /**
     * Directive for managing the modal dialog.
     * @param $http
     * @param $timeout
     * @returns {{restrict: string, replace: boolean, controllerAs: string, controller: ModalController, templateUrl: string}}
     * @constructor
     */
    function ModalDirective($http,$timeout)
    {
        function registerDefaultActions(controller)
        {
            bstar.registerModalAction('ok', {
                label: 'OK',
                type: 'primary',
                click: function()
                {
                    return bstar.modal.close();
                }
            });

            bstar.registerModalAction('close', {
                label: 'Close',
                type: 'primary',
                click: function()
                {
                    return bstar.modal.close();
                }
            });
        }

        /**
         * Controller of the modal.
         * @param $scope
         * @param $element
         * @param $attrs
         * @constructor
         */
        function ModalController($scope,$element,$attrs)
        {
            registerDefaultActions(this);

            bstar.modal = this;

            $scope.isOpen = false;
            $scope.isFetching = false;
            $scope.title = null;
            $scope.content = "";
            $scope.actions = [];
            $scope.type = "normal";

            $element.on('hidden.bs.modal', function (e) {
                this.toggle(false);
            }.bind(this));

            /**
             * Open the modal dialog with parameters.
             * @param specs string|object
             * @returns boolean
             */
            this.open = function(specs)
            {
                if (typeof specs == 'string' || !arguments.length) {
                    $scope.content = specs||null;

                    return this.toggle(true);
                }
                $scope.title = specs.title || null;
                $scope.content = specs.content;
                $scope.type = specs.type || "normal";
                $scope.actions = getActions(specs.actions || 'ok');

                return this.toggle(true);
            };

            /**
             * Close the modal.
             * @returns {*}
             */
            this.close = function()
            {
                return this.toggle(false);
            };

            /**
             * Open a modal key by name.
             * @param name string
             */
            this.openKey = function(name)
            {
                var value = bstar.keys[name];
                if (value) {
                    this.open({title: value.title, content: value.content, actions:'ok'});
                }
            };

            /**
             * Toggle the modal open or closed.
             * @param bool
             * @returns {boolean}
             */
            this.toggle = function(bool)
            {
                this.isOpen = ! arguments.length ? ! this.isOpen : bool;
                $element.modal(this.isOpen ? 'show' : 'hide');
                if (! this.isOpen) {
                    this.reset();
                }
                return this.isOpen;
            };

            /**
             * Fetch the contents of a url and add to the modal dialog.
             * @param url string
             * @returns void
             */
            this.fetch = function(url)
            {
                var self = this;
                $scope.isFetching = true;
                self.open();
                $http.get(url).success(function(html){
                    $timeout(function(){
                        $scope.isFetching = false;
                        self.open(html);
                    }, 2000);
                })
            };

            /**
             * Reset the contents.
             * @returns void
             */
            this.reset = function()
            {
                $scope.title = null;
                $scope.content = "";
                $scope.actions = [];
                $scope.type = "normal";
            };

            /**
             * Set the given actions by name.
             * @param actions array|string
             */
            function getActions(actions)
            {
                if (! Array.isArray(actions)) {
                    actions = [actions];
                }
                return actions.map(function(actionName) {
                    return Actions[actionName];
                });
            }
        }

        return {
            restrict: "E",
            replace: true,
            controllerAs: "modal",
            controller: ModalController,
            templateUrl: '/templates/modal.html'
        }
    }



})(bstar.app);