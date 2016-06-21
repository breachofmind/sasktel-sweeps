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
        },

        /**
         * Serializes recursively an object for url encoding.
         * @param obj
         * @param prefix
         * @returns {string}
         */
        serialize: function(obj,prefix)
        {
            var str = [];
            for(var p in obj) {
                if (obj.hasOwnProperty(p)) {
                    var k = prefix ? prefix + "[" + p + "]" : p, v = obj[p];
                    str.push(typeof v == "object" ?
                        bstar.serialize(v, k) :
                    encodeURIComponent(k) + "=" + encodeURIComponent(v));
                }
            }
            return str.join("&");
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
        $scope.user = null;

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

        $scope.isFilled = function(field)
        {
            return $scope.guest[field] != null && $scope.guest[field] != "";
        };


        function loginSuccess(data) {
            $scope.submitting = false;
            $scope.error = null;
            if (data.redirect) {
                $scope.user = data.user;
                $timeout(function(){
                    window.location = data.redirect;
                }, 2000);

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
            reset[prop] = $scope.input[prop];
        }

        // Initial state
        $scope.people = new bstar.People;

        $scope.salesRepName = "";

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

                item.pending = true;
            });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJwZXJzb24uanMiLCJsb2dpbkN0cmwuanMiLCJzdWJtaXNzaW9uQ3RybC5qcyIsImFkbWluQ3RybC5qcyIsIm1vZGFsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJzcmMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGluaXQgPSBbc2V0dXBBamF4SGVhZGVycywgaW5kZXhNb2RhbEtleXNdO1xuXG4gICAgd2luZG93LmJzdGFyID0ge1xuICAgICAgICBhcHA6IGFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbJ2RhdGVQaWNrZXInLCduZ0FuaW1hdGUnLCduZ1Nhbml0aXplJ10pLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb25maWd1cmF0aW9uLlxuICAgICAgICAgKi9cbiAgICAgICAgY29uZmlnOiB7fSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogTW9kYWwga2V5IGluZGV4LlxuICAgICAgICAgKi9cbiAgICAgICAga2V5czoge30sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFF1ZXVlIGEgZG9jdW1lbnQucmVhZHkgY2FsbGJhY2suXG4gICAgICAgICAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvblxuICAgICAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICAgICAqL1xuICAgICAgICByZWFkeTogZnVuY3Rpb24oY2FsbGJhY2spXG4gICAgICAgIHtcbiAgICAgICAgICAgIGluaXQucHVzaChjYWxsYmFjayk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybiB0aGUgdmFsdWUgb2YgdGhlIGNzcmYgZmllbGQuXG4gICAgICAgICAqIFJlcXVpcmVkIGZvciBhbnkgYWpheCBQT1NUIG9wZXJhdGlvbnMuXG4gICAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICBjc3JmVG9rZW46IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuICQoJ21ldGFbbmFtZT1cImNzcmYtdG9rZW5cIl0nKS5hdHRyKCdjb250ZW50Jyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNlcmlhbGl6ZXMgcmVjdXJzaXZlbHkgYW4gb2JqZWN0IGZvciB1cmwgZW5jb2RpbmcuXG4gICAgICAgICAqIEBwYXJhbSBvYmpcbiAgICAgICAgICogQHBhcmFtIHByZWZpeFxuICAgICAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAgICAgKi9cbiAgICAgICAgc2VyaWFsaXplOiBmdW5jdGlvbihvYmoscHJlZml4KVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgc3RyID0gW107XG4gICAgICAgICAgICBmb3IodmFyIHAgaW4gb2JqKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgayA9IHByZWZpeCA/IHByZWZpeCArIFwiW1wiICsgcCArIFwiXVwiIDogcCwgdiA9IG9ialtwXTtcbiAgICAgICAgICAgICAgICAgICAgc3RyLnB1c2godHlwZW9mIHYgPT0gXCJvYmplY3RcIiA/XG4gICAgICAgICAgICAgICAgICAgICAgICBic3Rhci5zZXJpYWxpemUodiwgaykgOlxuICAgICAgICAgICAgICAgICAgICBlbmNvZGVVUklDb21wb25lbnQoaykgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudCh2KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHN0ci5qb2luKFwiJlwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGEgY3JzZiB0b2tlbiB0byBhbGwgQUpBWCBoZWFkZXJzLlxuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzZXR1cEFqYXhIZWFkZXJzKClcbiAgICB7XG4gICAgICAgICQuYWpheFNldHVwKHtcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAnWC1DU1JGLVRPS0VOJzogYnN0YXIuY3NyZlRva2VuKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5kZXggYWxsIHRoZSBtb2RhbCBrZXlzIGZvciBxdWljayBzZWFyY2hpbmcuXG4gICAgICogQHJldHVybnMgdm9pZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGluZGV4TW9kYWxLZXlzKClcbiAgICB7XG4gICAgICAgIHZhciAka2V5cyA9ICQoJ3VsLm1vZGFsLWtleXMgbGknKTtcbiAgICAgICAgJGtleXMuZWFjaChmdW5jdGlvbihpLGVsKSB7XG4gICAgICAgICAgICBic3Rhci5rZXlzW2VsLmdldEF0dHJpYnV0ZSgnZGF0YS1rZXknKV0gPSB7XG4gICAgICAgICAgICAgICAgdGl0bGU6IGVsLmdldEF0dHJpYnV0ZSgnZGF0YS10aXRsZScpLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IGVsLmlubmVySFRNTFxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZpcmUgd2hlbiBET00gbG9hZGVkLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIGluaXQuZm9yRWFjaChmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfSlcbiAgICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uKGJzdGFyKXtcblxuICAgIC8qKlxuICAgICAqIERlZmluZXMgYSBwZXJzb24gbW9kZWwuXG4gICAgICogQHR5cGUgQmFja2JvbmUuTW9kZWxcbiAgICAgKi9cbiAgICB2YXIgUGVyc29uID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgICAgICAgZGVmYXVsdHM6IHtcbiAgICAgICAgICAgIG1hbmFnZXJfaWQ6bnVsbFxuICAgICAgICB9LFxuICAgICAgICBjb2xsZWN0aW9uOiBQZXJzb25Db2xsZWN0aW9uXG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBEZWZpbmVzIGEgY29sbGVjdGlvbiBvZiBwZW9wbGUuXG4gICAgICogQHR5cGUgQmFja2JvbmUuQ29sbGVjdGlvblxuICAgICAqL1xuICAgIHZhciBQZXJzb25Db2xsZWN0aW9uID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgICAgICBtb2RlbDogUGVyc29uLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm4gYW4gYXJyYXkgb2YgcGVvcGxlIGdpdmVuIHRoZWlyIGdyb3VwIGFuZCBtYW5hZ2VyLlxuICAgICAgICAgKiBAcGFyYW0gZ3JvdXBOYW1lIHN0cmluZyBzbWJ8Y29ycGdvdnRcbiAgICAgICAgICogQHBhcmFtIG1hbmFnZXJfaWQgc3RyaW5nfG51bGxcbiAgICAgICAgICogQHJldHVybnMge0FycmF5PFBlcnNvbj59XG4gICAgICAgICAqL1xuICAgICAgICBzZWdtZW50OiBmdW5jdGlvbihncm91cE5hbWUsIG1hbmFnZXJfaWQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChtYW5hZ2VyX2lkID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIG1hbmFnZXJfaWQgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmlsdGVyKGZ1bmN0aW9uKHBlcnNvbikge1xuICAgICAgICAgICAgICAgIHJldHVybiAocGVyc29uLmdldCgnZ3JvdXAnKSA9PT0gbnVsbCB8fCBwZXJzb24uZ2V0KCdncm91cCcpID09PSBncm91cE5hbWUpXG4gICAgICAgICAgICAgICAgICAgICYmIHBlcnNvbi5nZXQoJ21hbmFnZXJfaWQnKSA9PSBtYW5hZ2VyX2lkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgYnN0YXIuUGVyc29uID0gUGVyc29uO1xuICAgIGJzdGFyLlBlb3BsZSA9IFBlcnNvbkNvbGxlY3Rpb247XG5cbn0pKGJzdGFyKTsiLCIoZnVuY3Rpb24gKGFwcCkge1xuXG4gICAgYXBwLmNvbnRyb2xsZXIoJ2xvZ2luQ3RybCcsIExvZ2luRm9ybUNvbnRyb2xsZXIpO1xuXG4gICAgdmFyIGxvZ2luVXJsID0gXCIvbG9naW5cIjtcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHVzZXIgbG9naW4uXG4gICAgICogQHNlZSB2aWV3cy9sb2dpbi5lanNcbiAgICAgKiBAcGFyYW0gJHNjb3BlXG4gICAgICogQHBhcmFtICRodHRwXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gTG9naW5Gb3JtQ29udHJvbGxlcigkc2NvcGUsJGh0dHAsJGxvY2F0aW9uLCR0aW1lb3V0KVxuICAgIHtcbiAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSBmYWxzZTtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuICAgICAgICAkc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgJHNjb3BlLmd1ZXN0ID0ge1xuICAgICAgICAgICAgdXNlcm5hbWU6IG51bGwsXG4gICAgICAgICAgICBwYXNzd29yZDogbnVsbCxcbiAgICAgICAgICAgIF9jc3JmOiBudWxsXG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnN1Ym1pdCA9IGZ1bmN0aW9uKCRldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkc2NvcGUuZ3Vlc3QuX2NzcmYgPSBic3Rhci5jc3JmVG9rZW4oKTtcbiAgICAgICAgICAgICRzY29wZS5zdWJtaXR0aW5nID0gdHJ1ZTtcblxuICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAkaHR0cC5wb3N0KGxvZ2luVXJsLCAkc2NvcGUuZ3Vlc3QpXG4gICAgICAgICAgICAgICAgICAgIC5zdWNjZXNzKGxvZ2luU3VjY2VzcylcbiAgICAgICAgICAgICAgICAgICAgLmVycm9yKGxvZ2luRXJyb3IpO1xuICAgICAgICAgICAgfSwyMDAwKTtcblxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5pc0ZpbGxlZCA9IGZ1bmN0aW9uKGZpZWxkKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gJHNjb3BlLmd1ZXN0W2ZpZWxkXSAhPSBudWxsICYmICRzY29wZS5ndWVzdFtmaWVsZF0gIT0gXCJcIjtcbiAgICAgICAgfTtcblxuXG4gICAgICAgIGZ1bmN0aW9uIGxvZ2luU3VjY2VzcyhkYXRhKSB7XG4gICAgICAgICAgICAkc2NvcGUuc3VibWl0dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChkYXRhLnJlZGlyZWN0KSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSBkYXRhLnVzZXI7XG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZGF0YS5yZWRpcmVjdDtcbiAgICAgICAgICAgICAgICB9LCAyMDAwKTtcblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gbG9naW5FcnJvcihlcnIpIHtcbiAgICAgICAgICAgICRzY29wZS5zdWJtaXR0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSBlcnIuZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbn0pKGJzdGFyLmFwcCk7IiwiKGZ1bmN0aW9uIChhcHApIHtcblxuICAgIGFwcC5jb250cm9sbGVyKCdzdWJtaXNzaW9uQ3RybCcsIFN1Ym1pc3Npb25Gb3JtQ29udHJvbGxlcik7XG5cbiAgICB2YXIgc3VibWl0VXJsID0gXCIvc3VibWl0XCI7XG4gICAgdmFyIHBlb3BsZVVybCA9IFwiL3Blb3BsZVwiO1xuXG4gICAgdmFyIHJlc2V0ID0ge307XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSB1c2VyIGxvZ2luLlxuICAgICAqIEBzZWUgdmlld3MvbG9naW4uZWpzXG4gICAgICogQHBhcmFtICRzY29wZVxuICAgICAqIEBwYXJhbSAkaHR0cFxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIFN1Ym1pc3Npb25Gb3JtQ29udHJvbGxlcigkc2NvcGUsJGh0dHAsJHRpbWVvdXQpXG4gICAge1xuICAgICAgICAkaHR0cC5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vblsnWC1SRVFVRVNURUQtV0lUSCddID0gXCJYTUxIdHRwUmVxdWVzdFwiO1xuICAgICAgICAkaHR0cC5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vblsnWC1DU1JGLVRPS0VOJ10gPSBic3Rhci5jc3JmVG9rZW4oKTtcblxuICAgICAgICAkc2NvcGUucHJvY2Vzc2luZyA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUuZm9ybUNvbXBsZXRlID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gJHNjb3BlLnN1Ym1pc3Npb25Gb3JtLiR2YWxpZDtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUudHlwZXMgPSBbXG4gICAgICAgICAgICB7dmFsdWU6IFwic21iXCIsICAgICAgIHRleHQ6IFwiU21hbGwvTWVkaXVtIEJ1c2luZXNzXCJ9LFxuICAgICAgICAgICAge3ZhbHVlOiBcImNvcnBnb3Z0XCIsICB0ZXh0OiBcIkNvcnBvcmF0ZS9Hb3Zlcm5tZW50XCJ9LFxuICAgICAgICBdO1xuXG4gICAgICAgIC8vIFN1cHBvcnQgYWxsb3dlZCBpcyB0aGUgdG90YWwgYW1vdW50IG9mIHN1cHBvcnRpbmcgcmVwcyBmb3IgdGhpcyBncm91cC5cbiAgICAgICAgJHNjb3BlLmFsbG93ZWQgPSB7XG4gICAgICAgICAgICBzbWI6MSwgY29ycGdvdnQ6MlxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEZvcm0gaW5wdXRcbiAgICAgICAgJHNjb3BlLmlucHV0ID0ge1xuICAgICAgICAgICAgY3VzdG9tZXJfbmFtZTogIG51bGwsXG4gICAgICAgICAgICBzYWxlX2RhdGU6ICAgICAgbmV3IERhdGUoKSxcbiAgICAgICAgICAgIHR5cGU6ICAgICAgICAgICBcInNtYlwiLFxuICAgICAgICAgICAgZGV0YWlsczogICAgICAgIFwiXCIsXG4gICAgICAgICAgICBidXNpbmVzc19wcmlvcml0eSA6IFwiXCIsXG4gICAgICAgICAgICBtYW5hZ2VyX2lkOiAgICAgbnVsbCxcbiAgICAgICAgICAgIGFjY291bnRfcmVwX2lkOiBudWxsLFxuICAgICAgICAgICAgc2FsZXNfYXNzb2NfaWQ6IG51bGwsXG4gICAgICAgICAgICBzYWxlc19yZXBfaWQ6ICAgbnVsbCxcbiAgICAgICAgICAgIHN1cHBvcnRfYXNzb2NzOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEZvciByZXNldHRpbmdcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiAkc2NvcGUuaW5wdXQpIHtcbiAgICAgICAgICAgIHJlc2V0W3Byb3BdID0gJHNjb3BlLmlucHV0W3Byb3BdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbCBzdGF0ZVxuICAgICAgICAkc2NvcGUucGVvcGxlID0gbmV3IGJzdGFyLlBlb3BsZTtcblxuICAgICAgICAkc2NvcGUuc2FsZXNSZXBOYW1lID0gXCJcIjtcblxuICAgICAgICAvKipcbiAgICAgICAgICogWmVybyBvdXQgdGhlIHN1cHBvcnQgYXNzb2NzIHdoZW4gdGhlIHVzZXIgY2hhbmdlcyB0aGUgdHlwZSBhZ2Fpbi5cbiAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLmNoYW5nZVR5cGUgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5pbnB1dC5zdXBwb3J0X2Fzc29jcyA9IFtdO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGQgYSBzYWxlcyByZXAgdG8gdGhlIGxpc3QuXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS5hZGRTYWxlc1JlcCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gJHNjb3BlLnNhbGVzUmVwTmFtZS50cmltKCk7XG4gICAgICAgICAgICBpZiAoJHNjb3BlLmlucHV0LnN1cHBvcnRfYXNzb2NzLmxlbmd0aCA8ICRzY29wZS5hbGxvd2VkWyRzY29wZS5pbnB1dC50eXBlXSAmJiB2YWx1ZSAhPSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmlucHV0LnN1cHBvcnRfYXNzb2NzLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgICAgICRzY29wZS5zYWxlc1JlcE5hbWUgPSBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW1vdmUgYSBzYWxlcyByZXAgZnJvbSB0aGUgbGlzdC5cbiAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLnJlbW92ZVNhbGVzUmVwID0gZnVuY3Rpb24oaW5kZXgpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5pbnB1dC5zdXBwb3J0X2Fzc29jcy5zcGxpY2UoaW5kZXgsMSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZW4gdGhlIGtleSBpcyBwcmVzc2VkIHdoZW4gZW50ZXJpbmcgc3VwcG9ydCByZXBzXG4gICAgICAgICAqIEBwYXJhbSAkZXZlbnRcbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS5zYWxlc1JlcEVudGVyID0gZnVuY3Rpb24oJGV2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoJGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XG4gICAgICAgICAgICAgICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmFkZFNhbGVzUmVwKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN1Ym1pdCB0aGUgZm9ybS5cbiAgICAgICAgICogQHBhcmFtICRldmVudFxuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLnN1Ym1pdCA9IGZ1bmN0aW9uKCRldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkc2NvcGUucHJvY2Vzc2luZyA9IHRydWU7XG4gICAgICAgICAgICAkaHR0cC5wb3N0KHN1Ym1pdFVybCwgJHNjb3BlLmlucHV0KVxuICAgICAgICAgICAgICAgIC5zdWNjZXNzKHN1Ym1pdFN1Y2Nlc3MpXG4gICAgICAgICAgICAgICAgLmVycm9yKHN1Ym1pdEVycm9yKVxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5pc0ZpbGxlZCA9IGZ1bmN0aW9uKGZpZWxkKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gJHNjb3BlLmlucHV0W2ZpZWxkXSAhPSBudWxsICYmICRzY29wZS5pbnB1dFtmaWVsZF0gIT0gXCJcIjtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZm9jdXNPbiA9IGZ1bmN0aW9uKGVsZW1lbnRJZClcbiAgICAgICAge1xuICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW1lbnRJZCkuZm9jdXMoKTsgfSk7XG4gICAgICAgIH07XG5cblxuICAgICAgICAkaHR0cC5nZXQocGVvcGxlVXJsKS5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICRzY29wZS5wZW9wbGUucmVzZXQoZGF0YSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIHN1Ym1pdFN1Y2Nlc3MocmVzcG9uc2UpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5wcm9jZXNzaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuaW5wdXQgPSByZXNldDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHN1Ym1pdEVycm9yKHJlc3BvbnNlKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUucHJvY2Vzc2luZyA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICB9XG5cbn0pKGJzdGFyLmFwcCk7IiwiKGZ1bmN0aW9uIChhcHApIHtcblxuICAgIGFwcC5jb250cm9sbGVyKCdhZG1pbkN0cmwnLCBBZG1pblRhYmxlQ29udHJvbGxlcik7XG5cbiAgICBmdW5jdGlvbiBnZXRWYWx1ZXMob2JqZWN0LHByb3BzKVxuICAgIHtcbiAgICAgICAgdmFyIG91dCA9IHt9O1xuICAgICAgICBwcm9wcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgICAgICAgIG91dFtwcm9wXSA9IG9iamVjdFtwcm9wXTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gQWRtaW5UYWJsZUNvbnRyb2xsZXIoJHNjb3BlLCRodHRwLCR0aW1lb3V0KVxuICAgIHtcbiAgICAgICAgJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtUkVRVUVTVEVELVdJVEgnXSA9IFwiWE1MSHR0cFJlcXVlc3RcIjtcbiAgICAgICAgJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtQ1NSRi1UT0tFTiddID0gYnN0YXIuY3NyZlRva2VuKCk7XG5cbiAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAkc2NvcGUuc3VibWlzc2lvbnMgPSBbXTtcbiAgICAgICAgJHNjb3BlLnBhZ2VyID0gbnVsbDtcbiAgICAgICAgJHNjb3BlLnNvcnQgPSBudWxsO1xuICAgICAgICAkc2NvcGUuc29ydERpciA9IHRydWU7XG5cbiAgICAgICAgJHNjb3BlLmRhdGVzID0ge1xuICAgICAgICAgICAgc3RhcnQ6IGdldEZyb21TdG9yYWdlKCdzdGFydERhdGUnLG1vbWVudCgpLnN1YnRyYWN0KDEsJ21vbnRoJykudG9EYXRlKCkpLFxuICAgICAgICAgICAgZW5kOiBnZXRGcm9tU3RvcmFnZSgnZW5kRGF0ZScsIG1vbWVudCgpLnRvRGF0ZSgpKVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRoZSB0YWJsZSBzZWFyY2ggY3JpdGVyaWEuXG4gICAgICAgICRzY29wZS5zZWFyY2ggPSB7XG4gICAgICAgICAgICBzb3J0OiB7cGVuZGluZzotMSwgY3JlYXRlZF9hdDotMX0sXG4gICAgICAgICAgICB3aGVyZToge1xuICAgICAgICAgICAgICAgIGNyZWF0ZWRfYXQ6IGdldERhdGVSYW5nZSgpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEdldCBhIHZhbHVlIGZyb20gbG9jYWwgc3RvcmFnZS5cbiAgICAgICAgICogQHBhcmFtIGtleSBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIGRlZiBEYXRlXG4gICAgICAgICAqIEByZXR1cm5zIHtEYXRlfVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gZ2V0RnJvbVN0b3JhZ2Uoa2V5LGRlZilcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oa2V5KTtcbiAgICAgICAgICAgIGlmICghIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtb21lbnQobmV3IERhdGUodmFsdWUpKS50b0RhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm4gYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGRhdGUgcmFuZ2UuXG4gICAgICAgICAqIEByZXR1cm5zIHt7JGd0ZTogbnVtYmVyLCAkbHRlOiBudW1iZXJ9fVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gZ2V0RGF0ZVJhbmdlKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAkZ3RlOiRzY29wZS5kYXRlcy5zdGFydC50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICRsdGU6JHNjb3BlLmRhdGVzLmVuZC50b0lTT1N0cmluZygpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cblxuICAgICAgICAvKipcbiAgICAgICAgICogVG9nZ2xlIGFuIGl0ZW0gb3BlbiBvciBjbG9zZWQuXG4gICAgICAgICAqIEBwYXJhbSBpdGVtXG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUudG9nZ2xlSXRlbSA9IGZ1bmN0aW9uKGl0ZW0pXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChpdGVtLm9wZW4gPT0gdW5kZWZpbmVkKSBpdGVtLm9wZW4gPSBmYWxzZTtcbiAgICAgICAgICAgIGl0ZW0ub3BlbiA9ICEgaXRlbS5vcGVuO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBY2NlcHQgb3IgZGVueSBhbiBpdGVtLlxuICAgICAgICAgKiBAcGFyYW0gaXRlbVxuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLml0ZW1BY2NlcHQgPSBmdW5jdGlvbihpdGVtKVxuICAgICAgICB7XG4gICAgICAgICAgICBpdGVtLnBlbmRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBwb3N0ID0gZ2V0VmFsdWVzKGl0ZW0sIFsncGVuZGluZycsJ2FjY2VwdGVkJ10pO1xuXG4gICAgICAgICAgICAkaHR0cC5wdXQoaXRlbS5fdXJsLCBwb3N0KS5zdWNjZXNzKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cblxuXG4gICAgICAgICAgICB9KS5lcnJvcihmdW5jdGlvbihyZXNwb25zZSkge1xuXG4gICAgICAgICAgICAgICAgaXRlbS5wZW5kaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zb3J0QnkgPSBmdW5jdGlvbihmaWVsZClcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKCRzY29wZS5zb3J0ID09IGZpZWxkKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNvcnREaXIgPSAhJHNjb3BlLnNvcnREaXI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzY29wZS5zb3J0RGlyID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5zb3J0ID0gZmllbGQ7XG4gICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbnMuc29ydChmdW5jdGlvbihhLGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLnNvcnREaXIgPyBhWyRzY29wZS5zb3J0XSA+IGJbJHNjb3BlLnNvcnRdIDogYVskc2NvcGUuc29ydF0gPCBiWyRzY29wZS5zb3J0XTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNvcnRpbmdCeSA9IGZ1bmN0aW9uKGZpZWxkKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gZmllbGQgPT0gJHNjb3BlLnNvcnQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEdlbmVyYXRlIGEgcmVwb3J0IHVybCBmcm9tIHRoZSBzZWFyY2ggY3JpdGVyaWEuXG4gICAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUucmVwb3J0VXJsID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gXCIvYXBpL3YxL3N1Ym1pc3Npb24vcmVwb3J0P3M9XCIrYnRvYShKU09OLnN0cmluZ2lmeSgkc2NvcGUuc2VhcmNoKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFVwZGF0ZSB0aGUgdGFibGUgd2l0aCB0aGUgbmV3IHNlYXJjaCBjcml0ZXJpYS5cbiAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLnVwZGF0ZSA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGdvID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAkaHR0cC5wb3N0KCcvYXBpL3YxL3N1Ym1pc3Npb24vc2VhcmNoJywgJHNjb3BlLnNlYXJjaCkuc3VjY2VzcyhmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbnMgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICR0aW1lb3V0KGdvLCA1MDApO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5jaGFuZ2VTZWFyY2ggPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5zZWFyY2gud2hlcmUuY3JlYXRlZF9hdCA9IGdldERhdGVSYW5nZSgpO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3N0YXJ0RGF0ZScsICRzY29wZS5kYXRlcy5zdGFydCk7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZW5kRGF0ZScsICRzY29wZS5kYXRlcy5lbmQpO1xuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEluaXRcbiAgICAgICAgJHNjb3BlLnVwZGF0ZSgpO1xuICAgIH1cblxufSkoYnN0YXIuYXBwKTsiLCIoZnVuY3Rpb24gKGFwcCkge1xuXG4gICAgYXBwLmRpcmVjdGl2ZSgnYnN0YXJNb2RhbCcsIE1vZGFsRGlyZWN0aXZlKTtcbiAgICBhcHAuZGlyZWN0aXZlKCdtb2RhbE9wZW4nLCBNb2RhbE9wZW5EaXJlY3RpdmUpO1xuXG4gICAgdmFyIEFjdGlvbnMgPSB7fTtcblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyIGEgbmV3IG1vZGFsIGFjdGlvbi5cbiAgICAgKiBAcGFyYW0gbmFtZSBzdHJpbmdcbiAgICAgKiBAcGFyYW0gb2JqZWN0XG4gICAgICogQHJldHVybnMge29iamVjdH1cbiAgICAgKi9cbiAgICBic3Rhci5yZWdpc3Rlck1vZGFsQWN0aW9uID0gZnVuY3Rpb24obmFtZSwgb2JqZWN0KVxuICAgIHtcbiAgICAgICAgcmV0dXJuIEFjdGlvbnNbbmFtZV0gPSBvYmplY3Q7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3J0Y3V0IGZvciBhZGRpbmcgbW9kYWwub3BlbktleSB0byBlbGVtZW50cy5cbiAgICAgKiBAcmV0dXJucyB7e3Jlc3RyaWN0OiBzdHJpbmcsIGxpbms6IGxpbmt9fVxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIE1vZGFsT3BlbkRpcmVjdGl2ZSgpXG4gICAge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6IFwiQVwiLFxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsZWxlbWVudCxhdHRycylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGJzdGFyLm1vZGFsLm9wZW5LZXkoYXR0cnMubW9kYWxPcGVuKTtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERpcmVjdGl2ZSBmb3IgbWFuYWdpbmcgdGhlIG1vZGFsIGRpYWxvZy5cbiAgICAgKiBAcGFyYW0gJGh0dHBcbiAgICAgKiBAcGFyYW0gJHRpbWVvdXRcbiAgICAgKiBAcmV0dXJucyB7e3Jlc3RyaWN0OiBzdHJpbmcsIHJlcGxhY2U6IGJvb2xlYW4sIGNvbnRyb2xsZXJBczogc3RyaW5nLCBjb250cm9sbGVyOiBNb2RhbENvbnRyb2xsZXIsIHRlbXBsYXRlVXJsOiBzdHJpbmd9fVxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIE1vZGFsRGlyZWN0aXZlKCRodHRwLCR0aW1lb3V0KVxuICAgIHtcbiAgICAgICAgZnVuY3Rpb24gcmVnaXN0ZXJEZWZhdWx0QWN0aW9ucyhjb250cm9sbGVyKVxuICAgICAgICB7XG4gICAgICAgICAgICBic3Rhci5yZWdpc3Rlck1vZGFsQWN0aW9uKCdvaycsIHtcbiAgICAgICAgICAgICAgICBsYWJlbDogJ09LJyxcbiAgICAgICAgICAgICAgICB0eXBlOiAncHJpbWFyeScsXG4gICAgICAgICAgICAgICAgY2xpY2s6IGZ1bmN0aW9uKClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBic3Rhci5tb2RhbC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBic3Rhci5yZWdpc3Rlck1vZGFsQWN0aW9uKCdjbG9zZScsIHtcbiAgICAgICAgICAgICAgICBsYWJlbDogJ0Nsb3NlJyxcbiAgICAgICAgICAgICAgICB0eXBlOiAncHJpbWFyeScsXG4gICAgICAgICAgICAgICAgY2xpY2s6IGZ1bmN0aW9uKClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBic3Rhci5tb2RhbC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnRyb2xsZXIgb2YgdGhlIG1vZGFsLlxuICAgICAgICAgKiBAcGFyYW0gJHNjb3BlXG4gICAgICAgICAqIEBwYXJhbSAkZWxlbWVudFxuICAgICAgICAgKiBAcGFyYW0gJGF0dHJzXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gTW9kYWxDb250cm9sbGVyKCRzY29wZSwkZWxlbWVudCwkYXR0cnMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJlZ2lzdGVyRGVmYXVsdEFjdGlvbnModGhpcyk7XG5cbiAgICAgICAgICAgIGJzdGFyLm1vZGFsID0gdGhpcztcblxuICAgICAgICAgICAgJHNjb3BlLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLmlzRmV0Y2hpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS50aXRsZSA9IG51bGw7XG4gICAgICAgICAgICAkc2NvcGUuY29udGVudCA9IFwiXCI7XG4gICAgICAgICAgICAkc2NvcGUuYWN0aW9ucyA9IFtdO1xuICAgICAgICAgICAgJHNjb3BlLnR5cGUgPSBcIm5vcm1hbFwiO1xuXG4gICAgICAgICAgICAkZWxlbWVudC5vbignaGlkZGVuLmJzLm1vZGFsJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRvZ2dsZShmYWxzZSk7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE9wZW4gdGhlIG1vZGFsIGRpYWxvZyB3aXRoIHBhcmFtZXRlcnMuXG4gICAgICAgICAgICAgKiBAcGFyYW0gc3BlY3Mgc3RyaW5nfG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMgYm9vbGVhblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLm9wZW4gPSBmdW5jdGlvbihzcGVjcylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHNwZWNzID09ICdzdHJpbmcnIHx8ICFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jb250ZW50ID0gc3BlY3N8fG51bGw7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9nZ2xlKHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkc2NvcGUudGl0bGUgPSBzcGVjcy50aXRsZSB8fCBudWxsO1xuICAgICAgICAgICAgICAgICRzY29wZS5jb250ZW50ID0gc3BlY3MuY29udGVudDtcbiAgICAgICAgICAgICAgICAkc2NvcGUudHlwZSA9IHNwZWNzLnR5cGUgfHwgXCJub3JtYWxcIjtcbiAgICAgICAgICAgICAgICAkc2NvcGUuYWN0aW9ucyA9IGdldEFjdGlvbnMoc3BlY3MuYWN0aW9ucyB8fCAnb2snKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnRvZ2dsZSh0cnVlKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ2xvc2UgdGhlIG1vZGFsLlxuICAgICAgICAgICAgICogQHJldHVybnMgeyp9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMuY2xvc2UgPSBmdW5jdGlvbigpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9nZ2xlKGZhbHNlKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogT3BlbiBhIG1vZGFsIGtleSBieSBuYW1lLlxuICAgICAgICAgICAgICogQHBhcmFtIG5hbWUgc3RyaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMub3BlbktleSA9IGZ1bmN0aW9uKG5hbWUpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gYnN0YXIua2V5c1tuYW1lXTtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcGVuKHt0aXRsZTogdmFsdWUudGl0bGUsIGNvbnRlbnQ6IHZhbHVlLmNvbnRlbnQsIGFjdGlvbnM6J29rJ30pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVG9nZ2xlIHRoZSBtb2RhbCBvcGVuIG9yIGNsb3NlZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSBib29sXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy50b2dnbGUgPSBmdW5jdGlvbihib29sKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNPcGVuID0gISBhcmd1bWVudHMubGVuZ3RoID8gISB0aGlzLmlzT3BlbiA6IGJvb2w7XG4gICAgICAgICAgICAgICAgJGVsZW1lbnQubW9kYWwodGhpcy5pc09wZW4gPyAnc2hvdycgOiAnaGlkZScpO1xuICAgICAgICAgICAgICAgIGlmICghIHRoaXMuaXNPcGVuKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVzZXQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPcGVuO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBGZXRjaCB0aGUgY29udGVudHMgb2YgYSB1cmwgYW5kIGFkZCB0byB0aGUgbW9kYWwgZGlhbG9nLlxuICAgICAgICAgICAgICogQHBhcmFtIHVybCBzdHJpbmdcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5mZXRjaCA9IGZ1bmN0aW9uKHVybClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmlzRmV0Y2hpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHNlbGYub3BlbigpO1xuICAgICAgICAgICAgICAgICRodHRwLmdldCh1cmwpLnN1Y2Nlc3MoZnVuY3Rpb24oaHRtbCl7XG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaXNGZXRjaGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5vcGVuKGh0bWwpO1xuICAgICAgICAgICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXNldCB0aGUgY29udGVudHMuXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMucmVzZXQgPSBmdW5jdGlvbigpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnRpdGxlID0gbnVsbDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY29udGVudCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmFjdGlvbnMgPSBbXTtcbiAgICAgICAgICAgICAgICAkc2NvcGUudHlwZSA9IFwibm9ybWFsXCI7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNldCB0aGUgZ2l2ZW4gYWN0aW9ucyBieSBuYW1lLlxuICAgICAgICAgICAgICogQHBhcmFtIGFjdGlvbnMgYXJyYXl8c3RyaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZ1bmN0aW9uIGdldEFjdGlvbnMoYWN0aW9ucylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZiAoISBBcnJheS5pc0FycmF5KGFjdGlvbnMpKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbnMgPSBbYWN0aW9uc107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBhY3Rpb25zLm1hcChmdW5jdGlvbihhY3Rpb25OYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBBY3Rpb25zW2FjdGlvbk5hbWVdO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiBcIkVcIixcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6IFwibW9kYWxcIixcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IE1vZGFsQ29udHJvbGxlcixcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL3RlbXBsYXRlcy9tb2RhbC5odG1sJ1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufSkoYnN0YXIuYXBwKTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
