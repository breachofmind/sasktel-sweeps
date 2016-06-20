(function () {

    var init = [setupAjaxHeaders, indexModalKeys];

    window.bstar = {
        app: angular.module('app', ['datePicker','ngAnimate','ngSanitize']),

        /**
         * Configuration.
         */
        config: {},

        /**
         * Modal key index.
         */
        keys: {},

        /**
         * Queue a document.ready callback.
         * @param callback function
         * @returns void
         */
        ready: function(callback)
        {
            init.push(callback);
        },

        /**
         * Return the value of the csrf field.
         * Required for any ajax POST operations.
         * @returns {string}
         */
        csrfToken: function()
        {
            return $('meta[name="csrf-token"]').attr('content');
        }
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
     * Index all the modal keys for quick searching.
     * @returns void
     */
    function indexModalKeys()
    {
        var $keys = $('ul.modal-keys li');
        $keys.each(function(i,el) {
            bstar.keys[el.getAttribute('data-key')] = {
                title: el.getAttribute('data-title'),
                content: el.innerHTML
            }
        })
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
(function(bstar){

    /**
     * Defines a person model.
     * @type Backbone.Model
     */
    var Person = Backbone.Model.extend({
        defaults: {
            manager_id:null
        },
        collection: PersonCollection
    });

    /**
     * Defines a collection of people.
     * @type Backbone.Collection
     */
    var PersonCollection = Backbone.Collection.extend({
        model: Person,

        /**
         * Return an array of people given their group and manager.
         * @param groupName string smb|corpgovt
         * @param manager_id string|null
         * @returns {Array<Person>}
         */
        segment: function(groupName, manager_id)
        {
            if (manager_id == undefined) {
                manager_id = null;
            }
            return this.filter(function(person) {
                return (person.get('group') === null || person.get('group') === groupName)
                    && person.get('manager_id') == manager_id
            });
        }
    });

    bstar.Person = Person;
    bstar.People = PersonCollection;

})(bstar);
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
        $scope.people = new bstar.People;

        $scope.salesRepName = "";

        $scope.maxSalesReps = 2;

        /**
         * Add a sales rep to the list.
         * @returns void
         */
        $scope.addSalesRep = function()
        {
            var value = $scope.salesRepName.trim();
            if ($scope.input.support_assocs.length < $scope.maxSalesReps && value != "") {
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

        $scope.isFilled = function(field)
        {
            return $scope.input[field] != null && $scope.input[field] != "";
        };

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
        }

        function submitError(response)
        {
            $scope.processing = false;
        }

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJwZXJzb24uanMiLCJsb2dpbkN0cmwuanMiLCJzdWJtaXNzaW9uQ3RybC5qcyIsImFkbWluQ3RybC5qcyIsIm1vZGFsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJzcmMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGluaXQgPSBbc2V0dXBBamF4SGVhZGVycywgaW5kZXhNb2RhbEtleXNdO1xuXG4gICAgd2luZG93LmJzdGFyID0ge1xuICAgICAgICBhcHA6IGFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbJ2RhdGVQaWNrZXInLCduZ0FuaW1hdGUnLCduZ1Nhbml0aXplJ10pLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb25maWd1cmF0aW9uLlxuICAgICAgICAgKi9cbiAgICAgICAgY29uZmlnOiB7fSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogTW9kYWwga2V5IGluZGV4LlxuICAgICAgICAgKi9cbiAgICAgICAga2V5czoge30sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFF1ZXVlIGEgZG9jdW1lbnQucmVhZHkgY2FsbGJhY2suXG4gICAgICAgICAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvblxuICAgICAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICAgICAqL1xuICAgICAgICByZWFkeTogZnVuY3Rpb24oY2FsbGJhY2spXG4gICAgICAgIHtcbiAgICAgICAgICAgIGluaXQucHVzaChjYWxsYmFjayk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybiB0aGUgdmFsdWUgb2YgdGhlIGNzcmYgZmllbGQuXG4gICAgICAgICAqIFJlcXVpcmVkIGZvciBhbnkgYWpheCBQT1NUIG9wZXJhdGlvbnMuXG4gICAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICBjc3JmVG9rZW46IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuICQoJ21ldGFbbmFtZT1cImNzcmYtdG9rZW5cIl0nKS5hdHRyKCdjb250ZW50Jyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBhIGNyc2YgdG9rZW4gdG8gYWxsIEFKQVggaGVhZGVycy5cbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0dXBBamF4SGVhZGVycygpXG4gICAge1xuICAgICAgICAkLmFqYXhTZXR1cCh7XG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgJ1gtQ1NSRi1UT0tFTic6IGJzdGFyLmNzcmZUb2tlbigpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluZGV4IGFsbCB0aGUgbW9kYWwga2V5cyBmb3IgcXVpY2sgc2VhcmNoaW5nLlxuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpbmRleE1vZGFsS2V5cygpXG4gICAge1xuICAgICAgICB2YXIgJGtleXMgPSAkKCd1bC5tb2RhbC1rZXlzIGxpJyk7XG4gICAgICAgICRrZXlzLmVhY2goZnVuY3Rpb24oaSxlbCkge1xuICAgICAgICAgICAgYnN0YXIua2V5c1tlbC5nZXRBdHRyaWJ1dGUoJ2RhdGEta2V5JyldID0ge1xuICAgICAgICAgICAgICAgIHRpdGxlOiBlbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGl0bGUnKSxcbiAgICAgICAgICAgICAgICBjb250ZW50OiBlbC5pbm5lckhUTUxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaXJlIHdoZW4gRE9NIGxvYWRlZC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpXG4gICAge1xuICAgICAgICBpbml0LmZvckVhY2goZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH0pXG4gICAgfSk7XG59KSgpOyIsIihmdW5jdGlvbihic3Rhcil7XG5cbiAgICAvKipcbiAgICAgKiBEZWZpbmVzIGEgcGVyc29uIG1vZGVsLlxuICAgICAqIEB0eXBlIEJhY2tib25lLk1vZGVsXG4gICAgICovXG4gICAgdmFyIFBlcnNvbiA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgICAgIGRlZmF1bHRzOiB7XG4gICAgICAgICAgICBtYW5hZ2VyX2lkOm51bGxcbiAgICAgICAgfSxcbiAgICAgICAgY29sbGVjdGlvbjogUGVyc29uQ29sbGVjdGlvblxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogRGVmaW5lcyBhIGNvbGxlY3Rpb24gb2YgcGVvcGxlLlxuICAgICAqIEB0eXBlIEJhY2tib25lLkNvbGxlY3Rpb25cbiAgICAgKi9cbiAgICB2YXIgUGVyc29uQ29sbGVjdGlvbiA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICAgICAgbW9kZWw6IFBlcnNvbixcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJuIGFuIGFycmF5IG9mIHBlb3BsZSBnaXZlbiB0aGVpciBncm91cCBhbmQgbWFuYWdlci5cbiAgICAgICAgICogQHBhcmFtIGdyb3VwTmFtZSBzdHJpbmcgc21ifGNvcnBnb3Z0XG4gICAgICAgICAqIEBwYXJhbSBtYW5hZ2VyX2lkIHN0cmluZ3xudWxsXG4gICAgICAgICAqIEByZXR1cm5zIHtBcnJheTxQZXJzb24+fVxuICAgICAgICAgKi9cbiAgICAgICAgc2VnbWVudDogZnVuY3Rpb24oZ3JvdXBOYW1lLCBtYW5hZ2VyX2lkKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAobWFuYWdlcl9pZCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyX2lkID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZpbHRlcihmdW5jdGlvbihwZXJzb24pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHBlcnNvbi5nZXQoJ2dyb3VwJykgPT09IG51bGwgfHwgcGVyc29uLmdldCgnZ3JvdXAnKSA9PT0gZ3JvdXBOYW1lKVxuICAgICAgICAgICAgICAgICAgICAmJiBwZXJzb24uZ2V0KCdtYW5hZ2VyX2lkJykgPT0gbWFuYWdlcl9pZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGJzdGFyLlBlcnNvbiA9IFBlcnNvbjtcbiAgICBic3Rhci5QZW9wbGUgPSBQZXJzb25Db2xsZWN0aW9uO1xuXG59KShic3Rhcik7IiwiKGZ1bmN0aW9uIChhcHApIHtcblxuICAgIGFwcC5jb250cm9sbGVyKCdsb2dpbkN0cmwnLCBMb2dpbkZvcm1Db250cm9sbGVyKTtcblxuICAgIHZhciBsb2dpblVybCA9IFwiL2xvZ2luXCI7XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSB1c2VyIGxvZ2luLlxuICAgICAqIEBzZWUgdmlld3MvbG9naW4uZWpzXG4gICAgICogQHBhcmFtICRzY29wZVxuICAgICAqIEBwYXJhbSAkaHR0cFxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIExvZ2luRm9ybUNvbnRyb2xsZXIoJHNjb3BlLCRodHRwLCRsb2NhdGlvbiwkdGltZW91dClcbiAgICB7XG4gICAgICAgICRzY29wZS5zdWJtaXR0aW5nID0gZmFsc2U7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICAkc2NvcGUuZ3Vlc3QgPSB7XG4gICAgICAgICAgICB1c2VybmFtZTogbnVsbCxcbiAgICAgICAgICAgIHBhc3N3b3JkOiBudWxsLFxuICAgICAgICAgICAgX2NzcmY6IG51bGxcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24oJGV2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICRzY29wZS5ndWVzdC5fY3NyZiA9IGJzdGFyLmNzcmZUb2tlbigpO1xuICAgICAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSB0cnVlO1xuXG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICRodHRwLnBvc3QobG9naW5VcmwsICRzY29wZS5ndWVzdClcbiAgICAgICAgICAgICAgICAgICAgLnN1Y2Nlc3MobG9naW5TdWNjZXNzKVxuICAgICAgICAgICAgICAgICAgICAuZXJyb3IobG9naW5FcnJvcik7XG4gICAgICAgICAgICB9LDIwMDApO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gbG9naW5TdWNjZXNzKGRhdGEpIHtcbiAgICAgICAgICAgICRzY29wZS5zdWJtaXR0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoZGF0YS5yZWRpcmVjdCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGRhdGEucmVkaXJlY3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBsb2dpbkVycm9yKGVycikge1xuICAgICAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9IGVyci5lcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxufSkoYnN0YXIuYXBwKTsiLCIoZnVuY3Rpb24gKGFwcCkge1xuXG4gICAgYXBwLmNvbnRyb2xsZXIoJ3N1Ym1pc3Npb25DdHJsJywgU3VibWlzc2lvbkZvcm1Db250cm9sbGVyKTtcblxuICAgIHZhciBzdWJtaXRVcmwgPSBcIi9zdWJtaXRcIjtcbiAgICB2YXIgcGVvcGxlVXJsID0gXCIvcGVvcGxlXCI7XG5cbiAgICB2YXIgcmVzZXQgPSB7fTtcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHVzZXIgbG9naW4uXG4gICAgICogQHNlZSB2aWV3cy9sb2dpbi5lanNcbiAgICAgKiBAcGFyYW0gJHNjb3BlXG4gICAgICogQHBhcmFtICRodHRwXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gU3VibWlzc2lvbkZvcm1Db250cm9sbGVyKCRzY29wZSwkaHR0cCwkdGltZW91dClcbiAgICB7XG4gICAgICAgICRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLVJFUVVFU1RFRC1XSVRIJ10gPSBcIlhNTEh0dHBSZXF1ZXN0XCI7XG4gICAgICAgICRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLUNTUkYtVE9LRU4nXSA9IGJzdGFyLmNzcmZUb2tlbigpO1xuXG4gICAgICAgICRzY29wZS5wcm9jZXNzaW5nID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5mb3JtQ29tcGxldGUgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiAkc2NvcGUuc3VibWlzc2lvbkZvcm0uJHZhbGlkO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS50eXBlcyA9IFtcbiAgICAgICAgICAgIHt2YWx1ZTogXCJzbWJcIiwgICAgICAgdGV4dDogXCJTbWFsbC9NZWRpdW0gQnVzaW5lc3NcIn0sXG4gICAgICAgICAgICB7dmFsdWU6IFwiY29ycGdvdnRcIiwgIHRleHQ6IFwiQ29ycG9yYXRlL0dvdmVybm1lbnRcIn0sXG4gICAgICAgIF07XG5cbiAgICAgICAgLy8gRm9ybSBpbnB1dFxuICAgICAgICAkc2NvcGUuaW5wdXQgPSB7XG4gICAgICAgICAgICBjdXN0b21lcl9uYW1lOiAgbnVsbCxcbiAgICAgICAgICAgIHNhbGVfZGF0ZTogICAgICBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgdHlwZTogICAgICAgICAgIFwic21iXCIsXG4gICAgICAgICAgICBkZXRhaWxzOiAgICAgICAgXCJcIixcbiAgICAgICAgICAgIGJ1c2luZXNzX3ByaW9yaXR5IDogXCJcIixcbiAgICAgICAgICAgIG1hbmFnZXJfaWQ6ICAgICBudWxsLFxuICAgICAgICAgICAgYWNjb3VudF9yZXBfaWQ6IG51bGwsXG4gICAgICAgICAgICBzYWxlc19hc3NvY19pZDogbnVsbCxcbiAgICAgICAgICAgIHNhbGVzX3JlcF9pZDogICBudWxsLFxuICAgICAgICAgICAgc3VwcG9ydF9hc3NvY3M6IFtdXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRm9yIHJlc2V0dGluZ1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluICRzY29wZS5pbnB1dCkge1xuICAgICAgICAgICAgcmVzZXRbcHJvcF0gPSAkc2NvcGUuaW5wdXRbcHJvcF07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsIHN0YXRlXG4gICAgICAgICRzY29wZS5wZW9wbGUgPSBuZXcgYnN0YXIuUGVvcGxlO1xuXG4gICAgICAgICRzY29wZS5zYWxlc1JlcE5hbWUgPSBcIlwiO1xuXG4gICAgICAgICRzY29wZS5tYXhTYWxlc1JlcHMgPSAyO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGQgYSBzYWxlcyByZXAgdG8gdGhlIGxpc3QuXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS5hZGRTYWxlc1JlcCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gJHNjb3BlLnNhbGVzUmVwTmFtZS50cmltKCk7XG4gICAgICAgICAgICBpZiAoJHNjb3BlLmlucHV0LnN1cHBvcnRfYXNzb2NzLmxlbmd0aCA8ICRzY29wZS5tYXhTYWxlc1JlcHMgJiYgdmFsdWUgIT0gXCJcIikge1xuICAgICAgICAgICAgICAgICRzY29wZS5pbnB1dC5zdXBwb3J0X2Fzc29jcy5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2FsZXNSZXBOYW1lID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlIGEgc2FsZXMgcmVwIGZyb20gdGhlIGxpc3QuXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS5yZW1vdmVTYWxlc1JlcCA9IGZ1bmN0aW9uKGluZGV4KVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuaW5wdXQuc3VwcG9ydF9hc3NvY3Muc3BsaWNlKGluZGV4LDEpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdWJtaXQgdGhlIGZvcm0uXG4gICAgICAgICAqIEBwYXJhbSAkZXZlbnRcbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS5zdWJtaXQgPSBmdW5jdGlvbigkZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJHNjb3BlLnByb2Nlc3NpbmcgPSB0cnVlO1xuICAgICAgICAgICAgJGh0dHAucG9zdChzdWJtaXRVcmwsICRzY29wZS5pbnB1dClcbiAgICAgICAgICAgICAgICAuc3VjY2VzcyhzdWJtaXRTdWNjZXNzKVxuICAgICAgICAgICAgICAgIC5lcnJvcihzdWJtaXRFcnJvcilcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuaXNGaWxsZWQgPSBmdW5jdGlvbihmaWVsZClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuICRzY29wZS5pbnB1dFtmaWVsZF0gIT0gbnVsbCAmJiAkc2NvcGUuaW5wdXRbZmllbGRdICE9IFwiXCI7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmZvY3VzT24gPSBmdW5jdGlvbihlbGVtZW50SWQpXG4gICAgICAgIHtcbiAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkgeyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtZW50SWQpLmZvY3VzKCk7IH0pO1xuICAgICAgICB9O1xuXG5cbiAgICAgICAgJGh0dHAuZ2V0KHBlb3BsZVVybCkuc3VjY2VzcyhmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAkc2NvcGUucGVvcGxlLnJlc2V0KGRhdGEpO1xuICAgICAgICB9KTtcblxuICAgICAgICBmdW5jdGlvbiBzdWJtaXRTdWNjZXNzKHJlc3BvbnNlKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUucHJvY2Vzc2luZyA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLmlucHV0ID0gcmVzZXQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzdWJtaXRFcnJvcihyZXNwb25zZSlcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLnByb2Nlc3NpbmcgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG59KShic3Rhci5hcHApOyIsIihmdW5jdGlvbiAoYXBwKSB7XG5cbiAgICBhcHAuY29udHJvbGxlcignYWRtaW5DdHJsJywgQWRtaW5UYWJsZUNvbnRyb2xsZXIpO1xuXG4gICAgZnVuY3Rpb24gZ2V0VmFsdWVzKG9iamVjdCxwcm9wcylcbiAgICB7XG4gICAgICAgIHZhciBvdXQgPSB7fTtcbiAgICAgICAgcHJvcHMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICAgICAgICBvdXRbcHJvcF0gPSBvYmplY3RbcHJvcF07XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIEFkbWluVGFibGVDb250cm9sbGVyKCRzY29wZSwkaHR0cCwkdGltZW91dClcbiAgICB7XG4gICAgICAgICRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLVJFUVVFU1RFRC1XSVRIJ10gPSBcIlhNTEh0dHBSZXF1ZXN0XCI7XG4gICAgICAgICRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLUNTUkYtVE9LRU4nXSA9IGJzdGFyLmNzcmZUb2tlbigpO1xuXG4gICAgICAgICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb25zID0gW107XG4gICAgICAgICRzY29wZS5wYWdlciA9IG51bGw7XG4gICAgICAgICRzY29wZS5kYXRlU3RhcnQgPSBtb21lbnQoKS5zdWJ0cmFjdCgxLCdtb250aCcpO1xuICAgICAgICAkc2NvcGUuZGF0ZUVuZCA9IG1vbWVudCgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldERhdGEoKVxuICAgICAgICB7XG4gICAgICAgICAgICAkaHR0cC5nZXQoJy9hcGkvdjEvc3VibWlzc2lvbicpLnN1Y2Nlc3MoZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9ucyA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUb2dnbGUgYW4gaXRlbSBvcGVuIG9yIGNsb3NlZC5cbiAgICAgICAgICogQHBhcmFtIGl0ZW1cbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS50b2dnbGVJdGVtID0gZnVuY3Rpb24oaXRlbSlcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKGl0ZW0ub3BlbiA9PSB1bmRlZmluZWQpIGl0ZW0ub3BlbiA9IGZhbHNlO1xuICAgICAgICAgICAgaXRlbS5vcGVuID0gISBpdGVtLm9wZW47XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFjY2VwdCBvciBkZW55IGFuIGl0ZW0uXG4gICAgICAgICAqIEBwYXJhbSBpdGVtXG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUuaXRlbUFjY2VwdCA9IGZ1bmN0aW9uKGl0ZW0pXG4gICAgICAgIHtcbiAgICAgICAgICAgIGl0ZW0ucGVuZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIHBvc3QgPSBnZXRWYWx1ZXMoaXRlbSwgWydwZW5kaW5nJywnYWNjZXB0ZWQnXSk7XG4gICAgICAgICAgICAkaHR0cC5wdXQoaXRlbS5fdXJsLCBwb3N0KS5zdWNjZXNzKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHRpbWVvdXQoZ2V0RGF0YSwgNTAwKTtcbiAgICB9XG5cbn0pKGJzdGFyLmFwcCk7IiwiKGZ1bmN0aW9uIChhcHApIHtcblxuICAgIGFwcC5kaXJlY3RpdmUoJ2JzdGFyTW9kYWwnLCBNb2RhbERpcmVjdGl2ZSk7XG4gICAgYXBwLmRpcmVjdGl2ZSgnbW9kYWxPcGVuJywgTW9kYWxPcGVuRGlyZWN0aXZlKTtcblxuICAgIHZhciBBY3Rpb25zID0ge307XG5cbiAgICAvKipcbiAgICAgKiBSZWdpc3RlciBhIG5ldyBtb2RhbCBhY3Rpb24uXG4gICAgICogQHBhcmFtIG5hbWUgc3RyaW5nXG4gICAgICogQHBhcmFtIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICovXG4gICAgYnN0YXIucmVnaXN0ZXJNb2RhbEFjdGlvbiA9IGZ1bmN0aW9uKG5hbWUsIG9iamVjdClcbiAgICB7XG4gICAgICAgIHJldHVybiBBY3Rpb25zW25hbWVdID0gb2JqZWN0O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG9ydGN1dCBmb3IgYWRkaW5nIG1vZGFsLm9wZW5LZXkgdG8gZWxlbWVudHMuXG4gICAgICogQHJldHVybnMge3tyZXN0cmljdDogc3RyaW5nLCBsaW5rOiBsaW5rfX1cbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBNb2RhbE9wZW5EaXJlY3RpdmUoKVxuICAgIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiBcIkFcIixcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLGVsZW1lbnQsYXR0cnMpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgICAgICBic3Rhci5tb2RhbC5vcGVuS2V5KGF0dHJzLm1vZGFsT3Blbik7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseSgpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEaXJlY3RpdmUgZm9yIG1hbmFnaW5nIHRoZSBtb2RhbCBkaWFsb2cuXG4gICAgICogQHBhcmFtICRodHRwXG4gICAgICogQHBhcmFtICR0aW1lb3V0XG4gICAgICogQHJldHVybnMge3tyZXN0cmljdDogc3RyaW5nLCByZXBsYWNlOiBib29sZWFuLCBjb250cm9sbGVyQXM6IHN0cmluZywgY29udHJvbGxlcjogTW9kYWxDb250cm9sbGVyLCB0ZW1wbGF0ZVVybDogc3RyaW5nfX1cbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBNb2RhbERpcmVjdGl2ZSgkaHR0cCwkdGltZW91dClcbiAgICB7XG4gICAgICAgIGZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdEFjdGlvbnMoY29udHJvbGxlcilcbiAgICAgICAge1xuICAgICAgICAgICAgYnN0YXIucmVnaXN0ZXJNb2RhbEFjdGlvbignb2snLCB7XG4gICAgICAgICAgICAgICAgbGFiZWw6ICdPSycsXG4gICAgICAgICAgICAgICAgdHlwZTogJ3ByaW1hcnknLFxuICAgICAgICAgICAgICAgIGNsaWNrOiBmdW5jdGlvbigpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYnN0YXIubW9kYWwuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgYnN0YXIucmVnaXN0ZXJNb2RhbEFjdGlvbignY2xvc2UnLCB7XG4gICAgICAgICAgICAgICAgbGFiZWw6ICdDbG9zZScsXG4gICAgICAgICAgICAgICAgdHlwZTogJ3ByaW1hcnknLFxuICAgICAgICAgICAgICAgIGNsaWNrOiBmdW5jdGlvbigpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYnN0YXIubW9kYWwuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb250cm9sbGVyIG9mIHRoZSBtb2RhbC5cbiAgICAgICAgICogQHBhcmFtICRzY29wZVxuICAgICAgICAgKiBAcGFyYW0gJGVsZW1lbnRcbiAgICAgICAgICogQHBhcmFtICRhdHRyc1xuICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIE1vZGFsQ29udHJvbGxlcigkc2NvcGUsJGVsZW1lbnQsJGF0dHJzKVxuICAgICAgICB7XG4gICAgICAgICAgICByZWdpc3RlckRlZmF1bHRBY3Rpb25zKHRoaXMpO1xuXG4gICAgICAgICAgICBic3Rhci5tb2RhbCA9IHRoaXM7XG5cbiAgICAgICAgICAgICRzY29wZS5pc09wZW4gPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5pc0ZldGNoaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUudGl0bGUgPSBudWxsO1xuICAgICAgICAgICAgJHNjb3BlLmNvbnRlbnQgPSBcIlwiO1xuICAgICAgICAgICAgJHNjb3BlLmFjdGlvbnMgPSBbXTtcbiAgICAgICAgICAgICRzY29wZS50eXBlID0gXCJub3JtYWxcIjtcblxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ2hpZGRlbi5icy5tb2RhbCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50b2dnbGUoZmFsc2UpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBPcGVuIHRoZSBtb2RhbCBkaWFsb2cgd2l0aCBwYXJhbWV0ZXJzLlxuICAgICAgICAgICAgICogQHBhcmFtIHNwZWNzIHN0cmluZ3xvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIGJvb2xlYW5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5vcGVuID0gZnVuY3Rpb24oc3BlY3MpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzcGVjcyA9PSAnc3RyaW5nJyB8fCAhYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29udGVudCA9IHNwZWNzfHxudWxsO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnRvZ2dsZSh0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJHNjb3BlLnRpdGxlID0gc3BlY3MudGl0bGUgfHwgbnVsbDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY29udGVudCA9IHNwZWNzLmNvbnRlbnQ7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnR5cGUgPSBzcGVjcy50eXBlIHx8IFwibm9ybWFsXCI7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmFjdGlvbnMgPSBnZXRBY3Rpb25zKHNwZWNzLmFjdGlvbnMgfHwgJ29rJyk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50b2dnbGUodHJ1ZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENsb3NlIHRoZSBtb2RhbC5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLmNsb3NlID0gZnVuY3Rpb24oKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnRvZ2dsZShmYWxzZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE9wZW4gYSBtb2RhbCBrZXkgYnkgbmFtZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSBuYW1lIHN0cmluZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLm9wZW5LZXkgPSBmdW5jdGlvbihuYW1lKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGJzdGFyLmtleXNbbmFtZV07XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub3Blbih7dGl0bGU6IHZhbHVlLnRpdGxlLCBjb250ZW50OiB2YWx1ZS5jb250ZW50LCBhY3Rpb25zOidvayd9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRvZ2dsZSB0aGUgbW9kYWwgb3BlbiBvciBjbG9zZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0gYm9vbFxuICAgICAgICAgICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMudG9nZ2xlID0gZnVuY3Rpb24oYm9vbClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzT3BlbiA9ICEgYXJndW1lbnRzLmxlbmd0aCA/ICEgdGhpcy5pc09wZW4gOiBib29sO1xuICAgICAgICAgICAgICAgICRlbGVtZW50Lm1vZGFsKHRoaXMuaXNPcGVuID8gJ3Nob3cnIDogJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICBpZiAoISB0aGlzLmlzT3Blbikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc2V0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT3BlbjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRmV0Y2ggdGhlIGNvbnRlbnRzIG9mIGEgdXJsIGFuZCBhZGQgdG8gdGhlIG1vZGFsIGRpYWxvZy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB1cmwgc3RyaW5nXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMuZmV0Y2ggPSBmdW5jdGlvbih1cmwpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgICAgICRzY29wZS5pc0ZldGNoaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzZWxmLm9wZW4oKTtcbiAgICAgICAgICAgICAgICAkaHR0cC5nZXQodXJsKS5zdWNjZXNzKGZ1bmN0aW9uKGh0bWwpe1xuICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmlzRmV0Y2hpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYub3BlbihodG1sKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVzZXQgdGhlIGNvbnRlbnRzLlxuICAgICAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLnJlc2V0ID0gZnVuY3Rpb24oKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICRzY29wZS50aXRsZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNvbnRlbnQgPSBcIlwiO1xuICAgICAgICAgICAgICAgICRzY29wZS5hY3Rpb25zID0gW107XG4gICAgICAgICAgICAgICAgJHNjb3BlLnR5cGUgPSBcIm5vcm1hbFwiO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXQgdGhlIGdpdmVuIGFjdGlvbnMgYnkgbmFtZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSBhY3Rpb25zIGFycmF5fHN0cmluZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBmdW5jdGlvbiBnZXRBY3Rpb25zKGFjdGlvbnMpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWYgKCEgQXJyYXkuaXNBcnJheShhY3Rpb25zKSkge1xuICAgICAgICAgICAgICAgICAgICBhY3Rpb25zID0gW2FjdGlvbnNdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYWN0aW9ucy5tYXAoZnVuY3Rpb24oYWN0aW9uTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gQWN0aW9uc1thY3Rpb25OYW1lXTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogXCJFXCIsXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiBcIm1vZGFsXCIsXG4gICAgICAgICAgICBjb250cm9sbGVyOiBNb2RhbENvbnRyb2xsZXIsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy90ZW1wbGF0ZXMvbW9kYWwuaHRtbCdcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn0pKGJzdGFyLmFwcCk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
