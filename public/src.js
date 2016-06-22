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
            bstar.modal.openKey('submitted');
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
             * Open an error message.
             * @param message string
             */
            this.error = function(message)
            {
                this.open({
                    title:"Error...",
                    content: message,
                    type:"error"
                });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJwZXJzb24uanMiLCJsb2dpbkN0cmwuanMiLCJzdWJtaXNzaW9uQ3RybC5qcyIsImFkbWluQ3RybC5qcyIsInVzZXJDdHJsLmpzIiwibW9kYWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoic3JjLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBpbml0ID0gW3NldHVwQWpheEhlYWRlcnMsIGluZGV4TW9kYWxLZXlzXTtcblxuICAgIHdpbmRvdy5ic3RhciA9IHtcbiAgICAgICAgYXBwOiBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWydkYXRlUGlja2VyJywnbmdBbmltYXRlJywnbmdTYW5pdGl6ZSddKSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29uZmlndXJhdGlvbi5cbiAgICAgICAgICovXG4gICAgICAgIGNvbmZpZzoge30sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1vZGFsIGtleSBpbmRleC5cbiAgICAgICAgICovXG4gICAgICAgIGtleXM6IHt9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBRdWV1ZSBhIGRvY3VtZW50LnJlYWR5IGNhbGxiYWNrLlxuICAgICAgICAgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgKi9cbiAgICAgICAgcmVhZHk6IGZ1bmN0aW9uKGNhbGxiYWNrKVxuICAgICAgICB7XG4gICAgICAgICAgICBpbml0LnB1c2goY2FsbGJhY2spO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBjc3JmIGZpZWxkLlxuICAgICAgICAgKiBSZXF1aXJlZCBmb3IgYW55IGFqYXggUE9TVCBvcGVyYXRpb25zLlxuICAgICAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAgICAgKi9cbiAgICAgICAgY3NyZlRva2VuOiBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiAkKCdtZXRhW25hbWU9XCJjc3JmLXRva2VuXCJdJykuYXR0cignY29udGVudCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXJpYWxpemVzIHJlY3Vyc2l2ZWx5IGFuIG9iamVjdCBmb3IgdXJsIGVuY29kaW5nLlxuICAgICAgICAgKiBAcGFyYW0gb2JqXG4gICAgICAgICAqIEBwYXJhbSBwcmVmaXhcbiAgICAgICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgICAgICovXG4gICAgICAgIHNlcmlhbGl6ZTogZnVuY3Rpb24ob2JqLHByZWZpeClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHN0ciA9IFtdO1xuICAgICAgICAgICAgZm9yKHZhciBwIGluIG9iaikge1xuICAgICAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGsgPSBwcmVmaXggPyBwcmVmaXggKyBcIltcIiArIHAgKyBcIl1cIiA6IHAsIHYgPSBvYmpbcF07XG4gICAgICAgICAgICAgICAgICAgIHN0ci5wdXNoKHR5cGVvZiB2ID09IFwib2JqZWN0XCIgP1xuICAgICAgICAgICAgICAgICAgICAgICAgYnN0YXIuc2VyaWFsaXplKHYsIGspIDpcbiAgICAgICAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KGspICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQodikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzdHIuam9pbihcIiZcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBhIGNyc2YgdG9rZW4gdG8gYWxsIEFKQVggaGVhZGVycy5cbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0dXBBamF4SGVhZGVycygpXG4gICAge1xuICAgICAgICAkLmFqYXhTZXR1cCh7XG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgJ1gtQ1NSRi1UT0tFTic6IGJzdGFyLmNzcmZUb2tlbigpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluZGV4IGFsbCB0aGUgbW9kYWwga2V5cyBmb3IgcXVpY2sgc2VhcmNoaW5nLlxuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpbmRleE1vZGFsS2V5cygpXG4gICAge1xuICAgICAgICB2YXIgJGtleXMgPSAkKCd1bC5tb2RhbC1rZXlzIGxpJyk7XG4gICAgICAgICRrZXlzLmVhY2goZnVuY3Rpb24oaSxlbCkge1xuICAgICAgICAgICAgYnN0YXIua2V5c1tlbC5nZXRBdHRyaWJ1dGUoJ2RhdGEta2V5JyldID0ge1xuICAgICAgICAgICAgICAgIHRpdGxlOiBlbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGl0bGUnKSxcbiAgICAgICAgICAgICAgICBjb250ZW50OiBlbC5pbm5lckhUTUxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaXJlIHdoZW4gRE9NIGxvYWRlZC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpXG4gICAge1xuICAgICAgICBpbml0LmZvckVhY2goZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH0pXG4gICAgfSk7XG59KSgpOyIsIihmdW5jdGlvbihic3Rhcil7XG5cbiAgICAvKipcbiAgICAgKiBEZWZpbmVzIGEgcGVyc29uIG1vZGVsLlxuICAgICAqIEB0eXBlIEJhY2tib25lLk1vZGVsXG4gICAgICovXG4gICAgdmFyIFBlcnNvbiA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgICAgIGRlZmF1bHRzOiB7XG4gICAgICAgICAgICBtYW5hZ2VyX2lkOm51bGxcbiAgICAgICAgfSxcbiAgICAgICAgY29sbGVjdGlvbjogUGVyc29uQ29sbGVjdGlvblxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogRGVmaW5lcyBhIGNvbGxlY3Rpb24gb2YgcGVvcGxlLlxuICAgICAqIEB0eXBlIEJhY2tib25lLkNvbGxlY3Rpb25cbiAgICAgKi9cbiAgICB2YXIgUGVyc29uQ29sbGVjdGlvbiA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICAgICAgbW9kZWw6IFBlcnNvbixcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJuIGFuIGFycmF5IG9mIHBlb3BsZSBnaXZlbiB0aGVpciBncm91cCBhbmQgbWFuYWdlci5cbiAgICAgICAgICogQHBhcmFtIGdyb3VwTmFtZSBzdHJpbmcgc21ifGNvcnBnb3Z0XG4gICAgICAgICAqIEBwYXJhbSBtYW5hZ2VyX2lkIHN0cmluZ3xudWxsXG4gICAgICAgICAqIEByZXR1cm5zIHtBcnJheTxQZXJzb24+fVxuICAgICAgICAgKi9cbiAgICAgICAgc2VnbWVudDogZnVuY3Rpb24oZ3JvdXBOYW1lLCBtYW5hZ2VyX2lkKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAobWFuYWdlcl9pZCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyX2lkID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZpbHRlcihmdW5jdGlvbihwZXJzb24pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHBlcnNvbi5nZXQoJ2dyb3VwJykgPT09IG51bGwgfHwgcGVyc29uLmdldCgnZ3JvdXAnKSA9PT0gZ3JvdXBOYW1lKVxuICAgICAgICAgICAgICAgICAgICAmJiBwZXJzb24uZ2V0KCdtYW5hZ2VyX2lkJykgPT0gbWFuYWdlcl9pZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGJzdGFyLlBlcnNvbiA9IFBlcnNvbjtcbiAgICBic3Rhci5QZW9wbGUgPSBQZXJzb25Db2xsZWN0aW9uO1xuXG59KShic3Rhcik7IiwiKGZ1bmN0aW9uIChhcHApIHtcblxuICAgIGFwcC5jb250cm9sbGVyKCdsb2dpbkN0cmwnLCBMb2dpbkZvcm1Db250cm9sbGVyKTtcblxuICAgIHZhciBsb2dpblVybCA9IFwiL2xvZ2luXCI7XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSB1c2VyIGxvZ2luLlxuICAgICAqIEBzZWUgdmlld3MvbG9naW4uZWpzXG4gICAgICogQHBhcmFtICRzY29wZVxuICAgICAqIEBwYXJhbSAkaHR0cFxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIExvZ2luRm9ybUNvbnRyb2xsZXIoJHNjb3BlLCRodHRwLCRsb2NhdGlvbiwkdGltZW91dClcbiAgICB7XG4gICAgICAgICRzY29wZS5zdWJtaXR0aW5nID0gZmFsc2U7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcbiAgICAgICAgJHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICRzY29wZS5ndWVzdCA9IHtcbiAgICAgICAgICAgIHVzZXJuYW1lOiBudWxsLFxuICAgICAgICAgICAgcGFzc3dvcmQ6IG51bGwsXG4gICAgICAgICAgICBfY3NyZjogbnVsbFxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zdWJtaXQgPSBmdW5jdGlvbigkZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJHNjb3BlLmd1ZXN0Ll9jc3JmID0gYnN0YXIuY3NyZlRva2VuKCk7XG4gICAgICAgICAgICAkc2NvcGUuc3VibWl0dGluZyA9IHRydWU7XG5cbiAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgJGh0dHAucG9zdChsb2dpblVybCwgJHNjb3BlLmd1ZXN0KVxuICAgICAgICAgICAgICAgICAgICAuc3VjY2Vzcyhsb2dpblN1Y2Nlc3MpXG4gICAgICAgICAgICAgICAgICAgIC5lcnJvcihsb2dpbkVycm9yKTtcbiAgICAgICAgICAgIH0sMjAwMCk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuaXNGaWxsZWQgPSBmdW5jdGlvbihmaWVsZClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuICRzY29wZS5ndWVzdFtmaWVsZF0gIT0gbnVsbCAmJiAkc2NvcGUuZ3Vlc3RbZmllbGRdICE9IFwiXCI7XG4gICAgICAgIH07XG5cblxuICAgICAgICBmdW5jdGlvbiBsb2dpblN1Y2Nlc3MoZGF0YSkge1xuICAgICAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG4gICAgICAgICAgICBpZiAoZGF0YS5yZWRpcmVjdCkge1xuICAgICAgICAgICAgICAgICRzY29wZS51c2VyID0gZGF0YS51c2VyO1xuICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGRhdGEucmVkaXJlY3Q7XG4gICAgICAgICAgICAgICAgfSwgMjAwMCk7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGxvZ2luRXJyb3IoZXJyKSB7XG4gICAgICAgICAgICAkc2NvcGUuc3VibWl0dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gZXJyLmVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG59KShic3Rhci5hcHApOyIsIihmdW5jdGlvbiAoYXBwKSB7XG5cbiAgICBhcHAuY29udHJvbGxlcignc3VibWlzc2lvbkN0cmwnLCBTdWJtaXNzaW9uRm9ybUNvbnRyb2xsZXIpO1xuXG4gICAgdmFyIHN1Ym1pdFVybCA9IFwiL3N1Ym1pdFwiO1xuICAgIHZhciBwZW9wbGVVcmwgPSBcIi9wZW9wbGVcIjtcblxuICAgIHZhciByZXNldCA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgdXNlciBsb2dpbi5cbiAgICAgKiBAc2VlIHZpZXdzL2xvZ2luLmVqc1xuICAgICAqIEBwYXJhbSAkc2NvcGVcbiAgICAgKiBAcGFyYW0gJGh0dHBcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBTdWJtaXNzaW9uRm9ybUNvbnRyb2xsZXIoJHNjb3BlLCRodHRwLCR0aW1lb3V0KVxuICAgIHtcbiAgICAgICAgJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtUkVRVUVTVEVELVdJVEgnXSA9IFwiWE1MSHR0cFJlcXVlc3RcIjtcbiAgICAgICAgJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtQ1NSRi1UT0tFTiddID0gYnN0YXIuY3NyZlRva2VuKCk7XG5cbiAgICAgICAgJHNjb3BlLnByb2Nlc3NpbmcgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLmZvcm1Db21wbGV0ZSA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuICRzY29wZS5zdWJtaXNzaW9uRm9ybS4kdmFsaWQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnR5cGVzID0gW1xuICAgICAgICAgICAge3ZhbHVlOiBcInNtYlwiLCAgICAgICB0ZXh0OiBcIlNtYWxsL01lZGl1bSBCdXNpbmVzc1wifSxcbiAgICAgICAgICAgIHt2YWx1ZTogXCJjb3JwZ292dFwiLCAgdGV4dDogXCJDb3Jwb3JhdGUvR292ZXJubWVudFwifSxcbiAgICAgICAgXTtcblxuICAgICAgICAvLyBTdXBwb3J0IGFsbG93ZWQgaXMgdGhlIHRvdGFsIGFtb3VudCBvZiBzdXBwb3J0aW5nIHJlcHMgZm9yIHRoaXMgZ3JvdXAuXG4gICAgICAgICRzY29wZS5hbGxvd2VkID0ge1xuICAgICAgICAgICAgc21iOjEsIGNvcnBnb3Z0OjJcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBGb3JtIGlucHV0XG4gICAgICAgICRzY29wZS5pbnB1dCA9IHtcbiAgICAgICAgICAgIGN1c3RvbWVyX25hbWU6ICBudWxsLFxuICAgICAgICAgICAgc2FsZV9kYXRlOiAgICAgIG5ldyBEYXRlKCksXG4gICAgICAgICAgICB0eXBlOiAgICAgICAgICAgXCJzbWJcIixcbiAgICAgICAgICAgIGRldGFpbHM6ICAgICAgICBcIlwiLFxuICAgICAgICAgICAgYnVzaW5lc3NfcHJpb3JpdHkgOiBcIlwiLFxuICAgICAgICAgICAgbWFuYWdlcl9pZDogICAgIG51bGwsXG4gICAgICAgICAgICBhY2NvdW50X3JlcF9pZDogbnVsbCxcbiAgICAgICAgICAgIHNhbGVzX2Fzc29jX2lkOiBudWxsLFxuICAgICAgICAgICAgc2FsZXNfcmVwX2lkOiAgIG51bGwsXG4gICAgICAgICAgICBzdXBwb3J0X2Fzc29jczogW11cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBGb3IgcmVzZXR0aW5nXG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gJHNjb3BlLmlucHV0KSB7XG4gICAgICAgICAgICBpZiAoJHNjb3BlLmlucHV0Lmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICAgICAgcmVzZXRbcHJvcF0gPSAkc2NvcGUuaW5wdXRbcHJvcF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsIHN0YXRlXG4gICAgICAgICRzY29wZS5wZW9wbGUgPSBuZXcgYnN0YXIuUGVvcGxlO1xuXG4gICAgICAgICRzY29wZS5zYWxlc1JlcE5hbWUgPSBcIlwiO1xuXG4gICAgICAgIC8vIERhdGVzIHNob3VsZCBub3QgYmUgaW4gdGhlIGZ1dHVyZSA7KVxuICAgICAgICAkc2NvcGUubWF4U2FsZURhdGUgPSBtb21lbnQoKTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogWmVybyBvdXQgdGhlIHN1cHBvcnQgYXNzb2NzIHdoZW4gdGhlIHVzZXIgY2hhbmdlcyB0aGUgdHlwZSBhZ2Fpbi5cbiAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLmNoYW5nZVR5cGUgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5pbnB1dC5zdXBwb3J0X2Fzc29jcyA9IFtdO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGQgYSBzYWxlcyByZXAgdG8gdGhlIGxpc3QuXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS5hZGRTYWxlc1JlcCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gJHNjb3BlLnNhbGVzUmVwTmFtZS50cmltKCk7XG4gICAgICAgICAgICBpZiAoJHNjb3BlLmlucHV0LnN1cHBvcnRfYXNzb2NzLmxlbmd0aCA8ICRzY29wZS5hbGxvd2VkWyRzY29wZS5pbnB1dC50eXBlXSAmJiB2YWx1ZSAhPSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmlucHV0LnN1cHBvcnRfYXNzb2NzLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgICAgICRzY29wZS5zYWxlc1JlcE5hbWUgPSBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW1vdmUgYSBzYWxlcyByZXAgZnJvbSB0aGUgbGlzdC5cbiAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLnJlbW92ZVNhbGVzUmVwID0gZnVuY3Rpb24oaW5kZXgpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5pbnB1dC5zdXBwb3J0X2Fzc29jcy5zcGxpY2UoaW5kZXgsMSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZW4gdGhlIGtleSBpcyBwcmVzc2VkIHdoZW4gZW50ZXJpbmcgc3VwcG9ydCByZXBzXG4gICAgICAgICAqIEBwYXJhbSAkZXZlbnRcbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS5zYWxlc1JlcEVudGVyID0gZnVuY3Rpb24oJGV2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoJGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XG4gICAgICAgICAgICAgICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmFkZFNhbGVzUmVwKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN1Ym1pdCB0aGUgZm9ybS5cbiAgICAgICAgICogQHBhcmFtICRldmVudFxuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLnN1Ym1pdCA9IGZ1bmN0aW9uKCRldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkc2NvcGUucHJvY2Vzc2luZyA9IHRydWU7XG4gICAgICAgICAgICAkaHR0cC5wb3N0KHN1Ym1pdFVybCwgJHNjb3BlLmlucHV0KVxuICAgICAgICAgICAgICAgIC5zdWNjZXNzKHN1Ym1pdFN1Y2Nlc3MpXG4gICAgICAgICAgICAgICAgLmVycm9yKHN1Ym1pdEVycm9yKVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDaGVjayBpZiBhIGZpZWxkIGlzIGZpbGxlZC5cbiAgICAgICAgICogQHBhcmFtIGZpZWxkIHN0cmluZ1xuICAgICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS5pc0ZpbGxlZCA9IGZ1bmN0aW9uKGZpZWxkKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gJHNjb3BlLmlucHV0W2ZpZWxkXSAhPSBudWxsICYmICRzY29wZS5pbnB1dFtmaWVsZF0gIT0gXCJcIjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRm9jdXMgb24gYW4gaW5wdXQgYnkgSUQuXG4gICAgICAgICAqIEBwYXJhbSBlbGVtZW50SWQgc3RyaW5nXG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUuZm9jdXNPbiA9IGZ1bmN0aW9uKGVsZW1lbnRJZClcbiAgICAgICAge1xuICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW1lbnRJZCkuZm9jdXMoKTsgfSk7XG4gICAgICAgIH07XG5cblxuICAgICAgICAkaHR0cC5nZXQocGVvcGxlVXJsKS5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICRzY29wZS5wZW9wbGUucmVzZXQoZGF0YSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIHN1Ym1pdFN1Y2Nlc3MocmVzcG9uc2UpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5wcm9jZXNzaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuaW5wdXQgPSByZXNldDtcbiAgICAgICAgICAgIGJzdGFyLm1vZGFsLm9wZW5LZXkoJ3N1Ym1pdHRlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc3VibWl0RXJyb3IocmVzcG9uc2UpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5wcm9jZXNzaW5nID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgIH1cblxufSkoYnN0YXIuYXBwKTsiLCIoZnVuY3Rpb24gKGFwcCkge1xuXG4gICAgYXBwLmNvbnRyb2xsZXIoJ2FkbWluQ3RybCcsIEFkbWluVGFibGVDb250cm9sbGVyKTtcblxuICAgIGZ1bmN0aW9uIGdldFZhbHVlcyhvYmplY3QscHJvcHMpXG4gICAge1xuICAgICAgICB2YXIgb3V0ID0ge307XG4gICAgICAgIHByb3BzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgICAgICAgb3V0W3Byb3BdID0gb2JqZWN0W3Byb3BdO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBBZG1pblRhYmxlQ29udHJvbGxlcigkc2NvcGUsJGh0dHAsJHRpbWVvdXQpXG4gICAge1xuICAgICAgICAkaHR0cC5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vblsnWC1SRVFVRVNURUQtV0lUSCddID0gXCJYTUxIdHRwUmVxdWVzdFwiO1xuICAgICAgICAkaHR0cC5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vblsnWC1DU1JGLVRPS0VOJ10gPSBic3Rhci5jc3JmVG9rZW4oKTtcblxuICAgICAgICAkc2NvcGUubG9hZGluZyA9IHRydWU7XG4gICAgICAgICRzY29wZS5zdWJtaXNzaW9ucyA9IFtdO1xuICAgICAgICAkc2NvcGUucGFnZXIgPSBudWxsO1xuICAgICAgICAkc2NvcGUuc29ydCA9IG51bGw7XG4gICAgICAgICRzY29wZS5zb3J0RGlyID0gdHJ1ZTtcblxuICAgICAgICAkc2NvcGUuZGF0ZXMgPSB7XG4gICAgICAgICAgICBzdGFydDogZ2V0RnJvbVN0b3JhZ2UoJ3N0YXJ0RGF0ZScsbW9tZW50KCkuc3VidHJhY3QoMSwnbW9udGgnKS50b0RhdGUoKSksXG4gICAgICAgICAgICBlbmQ6IGdldEZyb21TdG9yYWdlKCdlbmREYXRlJywgbW9tZW50KCkudG9EYXRlKCkpXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVGhlIHRhYmxlIHNlYXJjaCBjcml0ZXJpYS5cbiAgICAgICAgJHNjb3BlLnNlYXJjaCA9IHtcbiAgICAgICAgICAgIHNvcnQ6IHtwZW5kaW5nOi0xLCBjcmVhdGVkX2F0Oi0xfSxcbiAgICAgICAgICAgIHdoZXJlOiB7XG4gICAgICAgICAgICAgICAgY3JlYXRlZF9hdDogZ2V0RGF0ZVJhbmdlKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogR2V0IGEgdmFsdWUgZnJvbSBsb2NhbCBzdG9yYWdlLlxuICAgICAgICAgKiBAcGFyYW0ga2V5IHN0cmluZ1xuICAgICAgICAgKiBAcGFyYW0gZGVmIERhdGVcbiAgICAgICAgICogQHJldHVybnMge0RhdGV9XG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBnZXRGcm9tU3RvcmFnZShrZXksZGVmKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShrZXkpO1xuICAgICAgICAgICAgaWYgKCEgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVmO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1vbWVudChuZXcgRGF0ZSh2YWx1ZSkpLnRvRGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybiBhbiBvYmplY3QgY29udGFpbmluZyB0aGUgZGF0ZSByYW5nZS5cbiAgICAgICAgICogQHJldHVybnMge3skZ3RlOiBudW1iZXIsICRsdGU6IG51bWJlcn19XG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBnZXREYXRlUmFuZ2UoKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICRndGU6JHNjb3BlLmRhdGVzLnN0YXJ0LnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgJGx0ZTokc2NvcGUuZGF0ZXMuZW5kLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUb2dnbGUgYW4gaXRlbSBvcGVuIG9yIGNsb3NlZC5cbiAgICAgICAgICogQHBhcmFtIGl0ZW1cbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS50b2dnbGVJdGVtID0gZnVuY3Rpb24oaXRlbSlcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKGl0ZW0ub3BlbiA9PSB1bmRlZmluZWQpIGl0ZW0ub3BlbiA9IGZhbHNlO1xuICAgICAgICAgICAgaXRlbS5vcGVuID0gISBpdGVtLm9wZW47XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFjY2VwdCBvciBkZW55IGFuIGl0ZW0uXG4gICAgICAgICAqIEBwYXJhbSBpdGVtXG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUuaXRlbUFjY2VwdCA9IGZ1bmN0aW9uKGl0ZW0pXG4gICAgICAgIHtcbiAgICAgICAgICAgIGl0ZW0ucGVuZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIHBvc3QgPSBnZXRWYWx1ZXMoaXRlbSwgWydwZW5kaW5nJywnYWNjZXB0ZWQnXSk7XG5cbiAgICAgICAgICAgICRodHRwLnB1dChpdGVtLl91cmwsIHBvc3QpLnN1Y2Nlc3MoZnVuY3Rpb24ocmVzcG9uc2UpIHtcblxuXG5cbiAgICAgICAgICAgIH0pLmVycm9yKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cbiAgICAgICAgICAgICAgICBpdGVtLnBlbmRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNvcnRCeSA9IGZ1bmN0aW9uKGZpZWxkKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoJHNjb3BlLnNvcnQgPT0gZmllbGQpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc29ydERpciA9ICEkc2NvcGUuc29ydERpcjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNvcnREaXIgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLnNvcnQgPSBmaWVsZDtcbiAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9ucy5zb3J0KGZ1bmN0aW9uKGEsYikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUuc29ydERpciA/IGFbJHNjb3BlLnNvcnRdID4gYlskc2NvcGUuc29ydF0gOiBhWyRzY29wZS5zb3J0XSA8IGJbJHNjb3BlLnNvcnRdO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc29ydGluZ0J5ID0gZnVuY3Rpb24oZmllbGQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiBmaWVsZCA9PSAkc2NvcGUuc29ydDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogR2VuZXJhdGUgYSByZXBvcnQgdXJsIGZyb20gdGhlIHNlYXJjaCBjcml0ZXJpYS5cbiAgICAgICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS5yZXBvcnRVcmwgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiBcIi9hcGkvdjEvc3VibWlzc2lvbi9yZXBvcnQ/cz1cIitidG9hKEpTT04uc3RyaW5naWZ5KCRzY29wZS5zZWFyY2gpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVXBkYXRlIHRoZSB0YWJsZSB3aXRoIHRoZSBuZXcgc2VhcmNoIGNyaXRlcmlhLlxuICAgICAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUudXBkYXRlID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUubG9hZGluZyA9IHRydWU7XG4gICAgICAgICAgICB2YXIgZ28gPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICRodHRwLnBvc3QoJy9hcGkvdjEvc3VibWlzc2lvbi9zZWFyY2gnLCAkc2NvcGUuc2VhcmNoKS5zdWNjZXNzKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9ucyA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgJHRpbWVvdXQoZ28sIDUwMCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmNoYW5nZVNlYXJjaCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLnNlYXJjaC53aGVyZS5jcmVhdGVkX2F0ID0gZ2V0RGF0ZVJhbmdlKCk7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnc3RhcnREYXRlJywgJHNjb3BlLmRhdGVzLnN0YXJ0KTtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdlbmREYXRlJywgJHNjb3BlLmRhdGVzLmVuZCk7XG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW5pdFxuICAgICAgICAkc2NvcGUudXBkYXRlKCk7XG4gICAgfVxuXG59KShic3Rhci5hcHApOyIsIihmdW5jdGlvbiAoYXBwKSB7XG5cbiAgICBhcHAuY29udHJvbGxlcigndXNlckN0cmwnLCBVc2VyVGFibGVDb250cm9sbGVyKTtcblxuXG4gICAgZnVuY3Rpb24gVXNlclRhYmxlQ29udHJvbGxlcigkc2NvcGUsJGh0dHAsJHRpbWVvdXQpXG4gICAge1xuICAgICAgICAkaHR0cC5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vblsnWC1SRVFVRVNURUQtV0lUSCddID0gXCJYTUxIdHRwUmVxdWVzdFwiO1xuICAgICAgICAkaHR0cC5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vblsnWC1DU1JGLVRPS0VOJ10gPSBic3Rhci5jc3JmVG9rZW4oKTtcblxuXG4gICAgICAgICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgJHNjb3BlLnVzZXJzID0gW107XG4gICAgICAgICRzY29wZS5uZXdVc2VyID0ge1xuICAgICAgICAgICAgZmlyc3RfbmFtZTogbnVsbCxcbiAgICAgICAgICAgIGxhc3RfbmFtZTogbnVsbCxcbiAgICAgICAgICAgIGVtYWlsOiBudWxsLFxuICAgICAgICAgICAgcGFzc3dvcmQ6bnVsbCxcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuY2hhbmdlUGFzc3dvcmRPcHRpb24gPSBmdW5jdGlvbihpbmRleClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHVzZXIgPSAkc2NvcGUudXNlcnNbaW5kZXhdO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5yZW1vdmVVc2VyT3B0aW9uID0gZnVuY3Rpb24oaW5kZXgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciB1c2VyID0gJHNjb3BlLnVzZXJzW2luZGV4XTtcbiAgICAgICAgICAgICRodHRwLmRlbGV0ZSgnL2FwaS92MS91c2VyLycrdXNlci5pZCkuc3VjY2VzcyhmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS51c2Vycy5zcGxpY2UoaW5kZXgsMSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5jcmVhdGVVc2VyID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICAkaHR0cC5wb3N0KCcvYXBpL3YxL3VzZXInLCAkc2NvcGUubmV3VXNlcikuc3VjY2VzcyhmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS51c2Vycy5wdXNoKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0RGF0YSgpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRodHRwLmdldCgnL2FwaS92MS91c2VyJykuc3VjY2VzcyhmdW5jdGlvbihyZXNwb25zZSl7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICRzY29wZS51c2VycyA9IHJlc3BvbnNlLmRhdGE7XG5cbiAgICAgICAgICAgIH0pLmVycm9yKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cbiAgICAgICAgICAgICAgICBic3Rhci5tb2RhbC5lcnJvcihcIlRoZXJlIHdhcyBhbiBlcnJvci4uLlwiKTtcblxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAkdGltZW91dChnZXREYXRhLDUwMCk7XG4gICAgfVxuXG59KShic3Rhci5hcHApOyIsIihmdW5jdGlvbiAoYXBwKSB7XG5cbiAgICBhcHAuZGlyZWN0aXZlKCdic3Rhck1vZGFsJywgTW9kYWxEaXJlY3RpdmUpO1xuICAgIGFwcC5kaXJlY3RpdmUoJ21vZGFsT3BlbicsIE1vZGFsT3BlbkRpcmVjdGl2ZSk7XG5cbiAgICB2YXIgQWN0aW9ucyA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXIgYSBuZXcgbW9kYWwgYWN0aW9uLlxuICAgICAqIEBwYXJhbSBuYW1lIHN0cmluZ1xuICAgICAqIEBwYXJhbSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fVxuICAgICAqL1xuICAgIGJzdGFyLnJlZ2lzdGVyTW9kYWxBY3Rpb24gPSBmdW5jdGlvbihuYW1lLCBvYmplY3QpXG4gICAge1xuICAgICAgICByZXR1cm4gQWN0aW9uc1tuYW1lXSA9IG9iamVjdDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvcnRjdXQgZm9yIGFkZGluZyBtb2RhbC5vcGVuS2V5IHRvIGVsZW1lbnRzLlxuICAgICAqIEByZXR1cm5zIHt7cmVzdHJpY3Q6IHN0cmluZywgbGluazogbGlua319XG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gTW9kYWxPcGVuRGlyZWN0aXZlKClcbiAgICB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogXCJBXCIsXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSxlbGVtZW50LGF0dHJzKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgYnN0YXIubW9kYWwub3BlbktleShhdHRycy5tb2RhbE9wZW4pO1xuICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGlyZWN0aXZlIGZvciBtYW5hZ2luZyB0aGUgbW9kYWwgZGlhbG9nLlxuICAgICAqIEBwYXJhbSAkaHR0cFxuICAgICAqIEBwYXJhbSAkdGltZW91dFxuICAgICAqIEByZXR1cm5zIHt7cmVzdHJpY3Q6IHN0cmluZywgcmVwbGFjZTogYm9vbGVhbiwgY29udHJvbGxlckFzOiBzdHJpbmcsIGNvbnRyb2xsZXI6IE1vZGFsQ29udHJvbGxlciwgdGVtcGxhdGVVcmw6IHN0cmluZ319XG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gTW9kYWxEaXJlY3RpdmUoJGh0dHAsJHRpbWVvdXQpXG4gICAge1xuICAgICAgICBmdW5jdGlvbiByZWdpc3RlckRlZmF1bHRBY3Rpb25zKGNvbnRyb2xsZXIpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGJzdGFyLnJlZ2lzdGVyTW9kYWxBY3Rpb24oJ29rJywge1xuICAgICAgICAgICAgICAgIGxhYmVsOiAnT0snLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdwcmltYXJ5JyxcbiAgICAgICAgICAgICAgICBjbGljazogZnVuY3Rpb24oKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJzdGFyLm1vZGFsLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGJzdGFyLnJlZ2lzdGVyTW9kYWxBY3Rpb24oJ2Nsb3NlJywge1xuICAgICAgICAgICAgICAgIGxhYmVsOiAnQ2xvc2UnLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdwcmltYXJ5JyxcbiAgICAgICAgICAgICAgICBjbGljazogZnVuY3Rpb24oKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJzdGFyLm1vZGFsLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29udHJvbGxlciBvZiB0aGUgbW9kYWwuXG4gICAgICAgICAqIEBwYXJhbSAkc2NvcGVcbiAgICAgICAgICogQHBhcmFtICRlbGVtZW50XG4gICAgICAgICAqIEBwYXJhbSAkYXR0cnNcbiAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBNb2RhbENvbnRyb2xsZXIoJHNjb3BlLCRlbGVtZW50LCRhdHRycylcbiAgICAgICAge1xuICAgICAgICAgICAgcmVnaXN0ZXJEZWZhdWx0QWN0aW9ucyh0aGlzKTtcblxuICAgICAgICAgICAgYnN0YXIubW9kYWwgPSB0aGlzO1xuXG4gICAgICAgICAgICAkc2NvcGUuaXNPcGVuID0gZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuaXNGZXRjaGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLnRpdGxlID0gbnVsbDtcbiAgICAgICAgICAgICRzY29wZS5jb250ZW50ID0gXCJcIjtcbiAgICAgICAgICAgICRzY29wZS5hY3Rpb25zID0gW107XG4gICAgICAgICAgICAkc2NvcGUudHlwZSA9IFwibm9ybWFsXCI7XG5cbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCdoaWRkZW4uYnMubW9kYWwnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIHRoaXMudG9nZ2xlKGZhbHNlKTtcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogT3BlbiB0aGUgbW9kYWwgZGlhbG9nIHdpdGggcGFyYW1ldGVycy5cbiAgICAgICAgICAgICAqIEBwYXJhbSBzcGVjcyBzdHJpbmd8b2JqZWN0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyBib29sZWFuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMub3BlbiA9IGZ1bmN0aW9uKHNwZWNzKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygc3BlY3MgPT0gJ3N0cmluZycgfHwgIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbnRlbnQgPSBzcGVjc3x8bnVsbDtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50b2dnbGUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRzY29wZS50aXRsZSA9IHNwZWNzLnRpdGxlIHx8IG51bGw7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNvbnRlbnQgPSBzcGVjcy5jb250ZW50O1xuICAgICAgICAgICAgICAgICRzY29wZS50eXBlID0gc3BlY3MudHlwZSB8fCBcIm5vcm1hbFwiO1xuICAgICAgICAgICAgICAgICRzY29wZS5hY3Rpb25zID0gZ2V0QWN0aW9ucyhzcGVjcy5hY3Rpb25zIHx8ICdvaycpO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9nZ2xlKHRydWUpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDbG9zZSB0aGUgbW9kYWwuXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5jbG9zZSA9IGZ1bmN0aW9uKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50b2dnbGUoZmFsc2UpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBPcGVuIGEgbW9kYWwga2V5IGJ5IG5hbWUuXG4gICAgICAgICAgICAgKiBAcGFyYW0gbmFtZSBzdHJpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5vcGVuS2V5ID0gZnVuY3Rpb24obmFtZSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBic3Rhci5rZXlzW25hbWVdO1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW4oe3RpdGxlOiB2YWx1ZS50aXRsZSwgY29udGVudDogdmFsdWUuY29udGVudCwgYWN0aW9uczonb2snfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUb2dnbGUgdGhlIG1vZGFsIG9wZW4gb3IgY2xvc2VkLlxuICAgICAgICAgICAgICogQHBhcmFtIGJvb2xcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLnRvZ2dsZSA9IGZ1bmN0aW9uKGJvb2wpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc09wZW4gPSAhIGFyZ3VtZW50cy5sZW5ndGggPyAhIHRoaXMuaXNPcGVuIDogYm9vbDtcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5tb2RhbCh0aGlzLmlzT3BlbiA/ICdzaG93JyA6ICdoaWRlJyk7XG4gICAgICAgICAgICAgICAgaWYgKCEgdGhpcy5pc09wZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXNldCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pc09wZW47XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE9wZW4gYW4gZXJyb3IgbWVzc2FnZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHN0cmluZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLmVycm9yID0gZnVuY3Rpb24obWVzc2FnZSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9wZW4oe1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTpcIkVycm9yLi4uXCIsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6XCJlcnJvclwiXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEZldGNoIHRoZSBjb250ZW50cyBvZiBhIHVybCBhbmQgYWRkIHRvIHRoZSBtb2RhbCBkaWFsb2cuXG4gICAgICAgICAgICAgKiBAcGFyYW0gdXJsIHN0cmluZ1xuICAgICAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLmZldGNoID0gZnVuY3Rpb24odXJsKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgICAgICAkc2NvcGUuaXNGZXRjaGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgc2VsZi5vcGVuKCk7XG4gICAgICAgICAgICAgICAgJGh0dHAuZ2V0KHVybCkuc3VjY2VzcyhmdW5jdGlvbihodG1sKXtcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5pc0ZldGNoaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLm9wZW4oaHRtbCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlc2V0IHRoZSBjb250ZW50cy5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5yZXNldCA9IGZ1bmN0aW9uKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUudGl0bGUgPSBudWxsO1xuICAgICAgICAgICAgICAgICRzY29wZS5jb250ZW50ID0gXCJcIjtcbiAgICAgICAgICAgICAgICAkc2NvcGUuYWN0aW9ucyA9IFtdO1xuICAgICAgICAgICAgICAgICRzY29wZS50eXBlID0gXCJub3JtYWxcIjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHRoZSBnaXZlbiBhY3Rpb25zIGJ5IG5hbWUuXG4gICAgICAgICAgICAgKiBAcGFyYW0gYWN0aW9ucyBhcnJheXxzdHJpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZnVuY3Rpb24gZ2V0QWN0aW9ucyhhY3Rpb25zKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlmICghIEFycmF5LmlzQXJyYXkoYWN0aW9ucykpIHtcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9ucyA9IFthY3Rpb25zXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjdGlvbnMubWFwKGZ1bmN0aW9uKGFjdGlvbk5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEFjdGlvbnNbYWN0aW9uTmFtZV07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogXCJtb2RhbFwiLFxuICAgICAgICAgICAgY29udHJvbGxlcjogTW9kYWxDb250cm9sbGVyLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvdGVtcGxhdGVzL21vZGFsLmh0bWwnXG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59KShic3Rhci5hcHApOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
