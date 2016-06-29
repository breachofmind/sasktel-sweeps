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
            sale_date:      moment(),
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
                bstar.modal.error("There was an error updating the item.");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJwZXJzb24uanMiLCJsb2dpbkN0cmwuanMiLCJzdWJtaXNzaW9uQ3RybC5qcyIsImFkbWluQ3RybC5qcyIsInVzZXJDdHJsLmpzIiwibW9kYWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InNyYy5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgaW5pdCA9IFtzZXR1cEFqYXhIZWFkZXJzLCBpbmRleE1vZGFsS2V5c107XG5cbiAgICB3aW5kb3cuYnN0YXIgPSB7XG4gICAgICAgIGFwcDogYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsnZGF0ZVBpY2tlcicsJ25nQW5pbWF0ZScsJ25nU2FuaXRpemUnXSksXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbmZpZ3VyYXRpb24uXG4gICAgICAgICAqL1xuICAgICAgICBjb25maWc6IHt9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNb2RhbCBrZXkgaW5kZXguXG4gICAgICAgICAqL1xuICAgICAgICBrZXlzOiB7fSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUXVldWUgYSBkb2N1bWVudC5yZWFkeSBjYWxsYmFjay5cbiAgICAgICAgICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgIHJlYWR5OiBmdW5jdGlvbihjYWxsYmFjaylcbiAgICAgICAge1xuICAgICAgICAgICAgaW5pdC5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJuIHRoZSB2YWx1ZSBvZiB0aGUgY3NyZiBmaWVsZC5cbiAgICAgICAgICogUmVxdWlyZWQgZm9yIGFueSBhamF4IFBPU1Qgb3BlcmF0aW9ucy5cbiAgICAgICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgICAgICovXG4gICAgICAgIGNzcmZUb2tlbjogZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gJCgnbWV0YVtuYW1lPVwiY3NyZi10b2tlblwiXScpLmF0dHIoJ2NvbnRlbnQnKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2VyaWFsaXplcyByZWN1cnNpdmVseSBhbiBvYmplY3QgZm9yIHVybCBlbmNvZGluZy5cbiAgICAgICAgICogQHBhcmFtIG9ialxuICAgICAgICAgKiBAcGFyYW0gcHJlZml4XG4gICAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICBzZXJpYWxpemU6IGZ1bmN0aW9uKG9iaixwcmVmaXgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBzdHIgPSBbXTtcbiAgICAgICAgICAgIGZvcih2YXIgcCBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHApKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBrID0gcHJlZml4ID8gcHJlZml4ICsgXCJbXCIgKyBwICsgXCJdXCIgOiBwLCB2ID0gb2JqW3BdO1xuICAgICAgICAgICAgICAgICAgICBzdHIucHVzaCh0eXBlb2YgdiA9PSBcIm9iamVjdFwiID9cbiAgICAgICAgICAgICAgICAgICAgICAgIGJzdGFyLnNlcmlhbGl6ZSh2LCBrKSA6XG4gICAgICAgICAgICAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChrKSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHYpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc3RyLmpvaW4oXCImXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgLyoqXG4gICAgICogQXR0YWNoZXMgYSBjcnNmIHRva2VuIHRvIGFsbCBBSkFYIGhlYWRlcnMuXG4gICAgICogQHJldHVybnMgdm9pZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNldHVwQWpheEhlYWRlcnMoKVxuICAgIHtcbiAgICAgICAgJC5hamF4U2V0dXAoe1xuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICdYLUNTUkYtVE9LRU4nOiBic3Rhci5jc3JmVG9rZW4oKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbmRleCBhbGwgdGhlIG1vZGFsIGtleXMgZm9yIHF1aWNrIHNlYXJjaGluZy5cbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gaW5kZXhNb2RhbEtleXMoKVxuICAgIHtcbiAgICAgICAgdmFyICRrZXlzID0gJCgndWwubW9kYWwta2V5cyBsaScpO1xuICAgICAgICAka2V5cy5lYWNoKGZ1bmN0aW9uKGksZWwpIHtcbiAgICAgICAgICAgIGJzdGFyLmtleXNbZWwuZ2V0QXR0cmlidXRlKCdkYXRhLWtleScpXSA9IHtcbiAgICAgICAgICAgICAgICB0aXRsZTogZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXRpdGxlJyksXG4gICAgICAgICAgICAgICAgY29udGVudDogZWwuaW5uZXJIVE1MXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlyZSB3aGVuIERPTSBsb2FkZWQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgaW5pdC5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9KVxuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24oYnN0YXIpe1xuXG4gICAgLyoqXG4gICAgICogRGVmaW5lcyBhIHBlcnNvbiBtb2RlbC5cbiAgICAgKiBAdHlwZSBCYWNrYm9uZS5Nb2RlbFxuICAgICAqL1xuICAgIHZhciBQZXJzb24gPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgICAgICBkZWZhdWx0czoge1xuICAgICAgICAgICAgbWFuYWdlcl9pZDpudWxsXG4gICAgICAgIH0sXG4gICAgICAgIGNvbGxlY3Rpb246IFBlcnNvbkNvbGxlY3Rpb25cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIERlZmluZXMgYSBjb2xsZWN0aW9uIG9mIHBlb3BsZS5cbiAgICAgKiBAdHlwZSBCYWNrYm9uZS5Db2xsZWN0aW9uXG4gICAgICovXG4gICAgdmFyIFBlcnNvbkNvbGxlY3Rpb24gPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgICAgIG1vZGVsOiBQZXJzb24sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybiBhbiBhcnJheSBvZiBwZW9wbGUgZ2l2ZW4gdGhlaXIgZ3JvdXAgYW5kIG1hbmFnZXIuXG4gICAgICAgICAqIEBwYXJhbSBncm91cE5hbWUgc3RyaW5nIHNtYnxjb3JwZ292dFxuICAgICAgICAgKiBAcGFyYW0gbWFuYWdlcl9pZCBzdHJpbmd8bnVsbFxuICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXk8UGVyc29uPn1cbiAgICAgICAgICovXG4gICAgICAgIHNlZ21lbnQ6IGZ1bmN0aW9uKGdyb3VwTmFtZSwgbWFuYWdlcl9pZClcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKG1hbmFnZXJfaWQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgbWFuYWdlcl9pZCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXIoZnVuY3Rpb24ocGVyc29uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChwZXJzb24uZ2V0KCdncm91cCcpID09PSBudWxsIHx8IHBlcnNvbi5nZXQoJ2dyb3VwJykgPT09IGdyb3VwTmFtZSlcbiAgICAgICAgICAgICAgICAgICAgJiYgcGVyc29uLmdldCgnbWFuYWdlcl9pZCcpID09IG1hbmFnZXJfaWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBic3Rhci5QZXJzb24gPSBQZXJzb247XG4gICAgYnN0YXIuUGVvcGxlID0gUGVyc29uQ29sbGVjdGlvbjtcblxufSkoYnN0YXIpOyIsIihmdW5jdGlvbiAoYXBwKSB7XG5cbiAgICBhcHAuY29udHJvbGxlcignbG9naW5DdHJsJywgTG9naW5Gb3JtQ29udHJvbGxlcik7XG5cbiAgICB2YXIgbG9naW5VcmwgPSBcIi9sb2dpblwiO1xuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgdXNlciBsb2dpbi5cbiAgICAgKiBAc2VlIHZpZXdzL2xvZ2luLmVqc1xuICAgICAqIEBwYXJhbSAkc2NvcGVcbiAgICAgKiBAcGFyYW0gJGh0dHBcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBMb2dpbkZvcm1Db250cm9sbGVyKCRzY29wZSwkaHR0cCwkbG9jYXRpb24sJHRpbWVvdXQpXG4gICAge1xuICAgICAgICAkc2NvcGUuc3VibWl0dGluZyA9IGZhbHNlO1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG4gICAgICAgICRzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAkc2NvcGUuZ3Vlc3QgPSB7XG4gICAgICAgICAgICB1c2VybmFtZTogbnVsbCxcbiAgICAgICAgICAgIHBhc3N3b3JkOiBudWxsLFxuICAgICAgICAgICAgX2NzcmY6IG51bGxcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24oJGV2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICRzY29wZS5ndWVzdC5fY3NyZiA9IGJzdGFyLmNzcmZUb2tlbigpO1xuICAgICAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSB0cnVlO1xuXG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICRodHRwLnBvc3QobG9naW5VcmwsICRzY29wZS5ndWVzdClcbiAgICAgICAgICAgICAgICAgICAgLnN1Y2Nlc3MobG9naW5TdWNjZXNzKVxuICAgICAgICAgICAgICAgICAgICAuZXJyb3IobG9naW5FcnJvcik7XG4gICAgICAgICAgICB9LDIwMDApO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmlzRmlsbGVkID0gZnVuY3Rpb24oZmllbGQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiAkc2NvcGUuZ3Vlc3RbZmllbGRdICE9IG51bGwgJiYgJHNjb3BlLmd1ZXN0W2ZpZWxkXSAhPSBcIlwiO1xuICAgICAgICB9O1xuXG5cbiAgICAgICAgZnVuY3Rpb24gbG9naW5TdWNjZXNzKGRhdGEpIHtcbiAgICAgICAgICAgICRzY29wZS5zdWJtaXR0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuICAgICAgICAgICAgaWYgKGRhdGEucmVkaXJlY3QpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUudXNlciA9IGRhdGEudXNlcjtcbiAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBkYXRhLnJlZGlyZWN0O1xuICAgICAgICAgICAgICAgIH0sIDIwMDApO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBsb2dpbkVycm9yKGVycikge1xuICAgICAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9IGVyci5lcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxufSkoYnN0YXIuYXBwKTsiLCIoZnVuY3Rpb24gKGFwcCkge1xuXG4gICAgYXBwLmNvbnRyb2xsZXIoJ3N1Ym1pc3Npb25DdHJsJywgU3VibWlzc2lvbkZvcm1Db250cm9sbGVyKTtcblxuICAgIHZhciBzdWJtaXRVcmwgPSBcIi9zdWJtaXRcIjtcbiAgICB2YXIgcGVvcGxlVXJsID0gXCIvcGVvcGxlXCI7XG5cbiAgICB2YXIgcmVzZXQgPSB7fTtcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHVzZXIgbG9naW4uXG4gICAgICogQHNlZSB2aWV3cy9sb2dpbi5lanNcbiAgICAgKiBAcGFyYW0gJHNjb3BlXG4gICAgICogQHBhcmFtICRodHRwXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gU3VibWlzc2lvbkZvcm1Db250cm9sbGVyKCRzY29wZSwkaHR0cCwkdGltZW91dClcbiAgICB7XG4gICAgICAgICRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLVJFUVVFU1RFRC1XSVRIJ10gPSBcIlhNTEh0dHBSZXF1ZXN0XCI7XG4gICAgICAgICRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLUNTUkYtVE9LRU4nXSA9IGJzdGFyLmNzcmZUb2tlbigpO1xuXG4gICAgICAgICRzY29wZS5wcm9jZXNzaW5nID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5mb3JtQ29tcGxldGUgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiAkc2NvcGUuc3VibWlzc2lvbkZvcm0uJHZhbGlkO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS50eXBlcyA9IFtcbiAgICAgICAgICAgIHt2YWx1ZTogXCJzbWJcIiwgICAgICAgdGV4dDogXCJTbWFsbC9NZWRpdW0gQnVzaW5lc3NcIn0sXG4gICAgICAgICAgICB7dmFsdWU6IFwiY29ycGdvdnRcIiwgIHRleHQ6IFwiQ29ycG9yYXRlL0dvdmVybm1lbnRcIn0sXG4gICAgICAgIF07XG5cbiAgICAgICAgLy8gU3VwcG9ydCBhbGxvd2VkIGlzIHRoZSB0b3RhbCBhbW91bnQgb2Ygc3VwcG9ydGluZyByZXBzIGZvciB0aGlzIGdyb3VwLlxuICAgICAgICAkc2NvcGUuYWxsb3dlZCA9IHtcbiAgICAgICAgICAgIHNtYjoxLCBjb3JwZ292dDoyXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRm9ybSBpbnB1dFxuICAgICAgICAkc2NvcGUuaW5wdXQgPSB7XG4gICAgICAgICAgICBjdXN0b21lcl9uYW1lOiAgbnVsbCxcbiAgICAgICAgICAgIHNhbGVfZGF0ZTogICAgICBtb21lbnQoKSxcbiAgICAgICAgICAgIHR5cGU6ICAgICAgICAgICBcInNtYlwiLFxuICAgICAgICAgICAgZGV0YWlsczogICAgICAgIFwiXCIsXG4gICAgICAgICAgICBidXNpbmVzc19wcmlvcml0eSA6IFwiXCIsXG4gICAgICAgICAgICBtYW5hZ2VyX2lkOiAgICAgbnVsbCxcbiAgICAgICAgICAgIGFjY291bnRfcmVwX2lkOiBudWxsLFxuICAgICAgICAgICAgc2FsZXNfYXNzb2NfaWQ6IG51bGwsXG4gICAgICAgICAgICBzYWxlc19yZXBfaWQ6ICAgbnVsbCxcbiAgICAgICAgICAgIHN1cHBvcnRfYXNzb2NzOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEZvciByZXNldHRpbmdcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiAkc2NvcGUuaW5wdXQpIHtcbiAgICAgICAgICAgIGlmICgkc2NvcGUuaW5wdXQuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICByZXNldFtwcm9wXSA9ICRzY29wZS5pbnB1dFtwcm9wXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWwgc3RhdGVcbiAgICAgICAgJHNjb3BlLnBlb3BsZSA9IG5ldyBic3Rhci5QZW9wbGU7XG5cbiAgICAgICAgJHNjb3BlLnNhbGVzUmVwTmFtZSA9IFwiXCI7XG5cbiAgICAgICAgLy8gRGF0ZXMgc2hvdWxkIG5vdCBiZSBpbiB0aGUgZnV0dXJlIDspXG4gICAgICAgICRzY29wZS5tYXhTYWxlRGF0ZSA9IG1vbWVudCgpO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBaZXJvIG91dCB0aGUgc3VwcG9ydCBhc3NvY3Mgd2hlbiB0aGUgdXNlciBjaGFuZ2VzIHRoZSB0eXBlIGFnYWluLlxuICAgICAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUuY2hhbmdlVHlwZSA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLmlucHV0LnN1cHBvcnRfYXNzb2NzID0gW107XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFkZCBhIHNhbGVzIHJlcCB0byB0aGUgbGlzdC5cbiAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLmFkZFNhbGVzUmVwID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSAkc2NvcGUuc2FsZXNSZXBOYW1lLnRyaW0oKTtcbiAgICAgICAgICAgIGlmICgkc2NvcGUuaW5wdXQuc3VwcG9ydF9hc3NvY3MubGVuZ3RoIDwgJHNjb3BlLmFsbG93ZWRbJHNjb3BlLmlucHV0LnR5cGVdICYmIHZhbHVlICE9IFwiXCIpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuaW5wdXQuc3VwcG9ydF9hc3NvY3MucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNhbGVzUmVwTmFtZSA9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZSBhIHNhbGVzIHJlcCBmcm9tIHRoZSBsaXN0LlxuICAgICAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUucmVtb3ZlU2FsZXNSZXAgPSBmdW5jdGlvbihpbmRleClcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLmlucHV0LnN1cHBvcnRfYXNzb2NzLnNwbGljZShpbmRleCwxKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogV2hlbiB0aGUga2V5IGlzIHByZXNzZWQgd2hlbiBlbnRlcmluZyBzdXBwb3J0IHJlcHNcbiAgICAgICAgICogQHBhcmFtICRldmVudFxuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLnNhbGVzUmVwRW50ZXIgPSBmdW5jdGlvbigkZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICgkZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuYWRkU2FsZXNSZXAoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3VibWl0IHRoZSBmb3JtLlxuICAgICAgICAgKiBAcGFyYW0gJGV2ZW50XG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24oJGV2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICRzY29wZS5wcm9jZXNzaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICRodHRwLnBvc3Qoc3VibWl0VXJsLCAkc2NvcGUuaW5wdXQpXG4gICAgICAgICAgICAgICAgLnN1Y2Nlc3Moc3VibWl0U3VjY2VzcylcbiAgICAgICAgICAgICAgICAuZXJyb3Ioc3VibWl0RXJyb3IpXG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENoZWNrIGlmIGEgZmllbGQgaXMgZmlsbGVkLlxuICAgICAgICAgKiBAcGFyYW0gZmllbGQgc3RyaW5nXG4gICAgICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLmlzRmlsbGVkID0gZnVuY3Rpb24oZmllbGQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiAkc2NvcGUuaW5wdXRbZmllbGRdICE9IG51bGwgJiYgJHNjb3BlLmlucHV0W2ZpZWxkXSAhPSBcIlwiO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGb2N1cyBvbiBhbiBpbnB1dCBieSBJRC5cbiAgICAgICAgICogQHBhcmFtIGVsZW1lbnRJZCBzdHJpbmdcbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS5mb2N1c09uID0gZnVuY3Rpb24oZWxlbWVudElkKVxuICAgICAgICB7XG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHsgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbWVudElkKS5mb2N1cygpOyB9KTtcbiAgICAgICAgfTtcblxuXG4gICAgICAgICRodHRwLmdldChwZW9wbGVVcmwpLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgJHNjb3BlLnBlb3BsZS5yZXNldChkYXRhKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gc3VibWl0U3VjY2VzcyhyZXNwb25zZSlcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLnByb2Nlc3NpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5pbnB1dCA9IHJlc2V0O1xuICAgICAgICAgICAgYnN0YXIubW9kYWwub3BlbktleSgnc3VibWl0dGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzdWJtaXRFcnJvcihyZXNwb25zZSlcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLnByb2Nlc3NpbmcgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG59KShic3Rhci5hcHApOyIsIihmdW5jdGlvbiAoYXBwKSB7XG5cbiAgICBhcHAuY29udHJvbGxlcignYWRtaW5DdHJsJywgQWRtaW5UYWJsZUNvbnRyb2xsZXIpO1xuXG4gICAgZnVuY3Rpb24gZ2V0VmFsdWVzKG9iamVjdCxwcm9wcylcbiAgICB7XG4gICAgICAgIHZhciBvdXQgPSB7fTtcbiAgICAgICAgcHJvcHMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICAgICAgICBvdXRbcHJvcF0gPSBvYmplY3RbcHJvcF07XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIEFkbWluVGFibGVDb250cm9sbGVyKCRzY29wZSwkaHR0cCwkdGltZW91dClcbiAgICB7XG4gICAgICAgICRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLVJFUVVFU1RFRC1XSVRIJ10gPSBcIlhNTEh0dHBSZXF1ZXN0XCI7XG4gICAgICAgICRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLUNTUkYtVE9LRU4nXSA9IGJzdGFyLmNzcmZUb2tlbigpO1xuXG4gICAgICAgICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb25zID0gW107XG4gICAgICAgICRzY29wZS5wYWdlciA9IG51bGw7XG4gICAgICAgICRzY29wZS5zb3J0ID0gbnVsbDtcbiAgICAgICAgJHNjb3BlLnNvcnREaXIgPSB0cnVlO1xuXG4gICAgICAgICRzY29wZS5kYXRlcyA9IHtcbiAgICAgICAgICAgIHN0YXJ0OiBnZXRGcm9tU3RvcmFnZSgnc3RhcnREYXRlJyxtb21lbnQoKS5zdWJ0cmFjdCgxLCdtb250aCcpLnRvRGF0ZSgpKSxcbiAgICAgICAgICAgIGVuZDogZ2V0RnJvbVN0b3JhZ2UoJ2VuZERhdGUnLCBtb21lbnQoKS50b0RhdGUoKSlcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUaGUgdGFibGUgc2VhcmNoIGNyaXRlcmlhLlxuICAgICAgICAkc2NvcGUuc2VhcmNoID0ge1xuICAgICAgICAgICAgc29ydDoge3BlbmRpbmc6LTEsIGNyZWF0ZWRfYXQ6LTF9LFxuICAgICAgICAgICAgd2hlcmU6IHtcbiAgICAgICAgICAgICAgICBjcmVhdGVkX2F0OiBnZXREYXRlUmFuZ2UoKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHZXQgYSB2YWx1ZSBmcm9tIGxvY2FsIHN0b3JhZ2UuXG4gICAgICAgICAqIEBwYXJhbSBrZXkgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSBkZWYgRGF0ZVxuICAgICAgICAgKiBAcmV0dXJucyB7RGF0ZX1cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGdldEZyb21TdG9yYWdlKGtleSxkZWYpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSk7XG4gICAgICAgICAgICBpZiAoISB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkZWY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50KG5ldyBEYXRlKHZhbHVlKSkudG9EYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJuIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSBkYXRlIHJhbmdlLlxuICAgICAgICAgKiBAcmV0dXJucyB7eyRndGU6IG51bWJlciwgJGx0ZTogbnVtYmVyfX1cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGdldERhdGVSYW5nZSgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgJGd0ZTokc2NvcGUuZGF0ZXMuc3RhcnQudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAkbHRlOiRzY29wZS5kYXRlcy5lbmQudG9JU09TdHJpbmcoKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRvZ2dsZSBhbiBpdGVtIG9wZW4gb3IgY2xvc2VkLlxuICAgICAgICAgKiBAcGFyYW0gaXRlbVxuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLnRvZ2dsZUl0ZW0gPSBmdW5jdGlvbihpdGVtKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoaXRlbS5vcGVuID09IHVuZGVmaW5lZCkgaXRlbS5vcGVuID0gZmFsc2U7XG4gICAgICAgICAgICBpdGVtLm9wZW4gPSAhIGl0ZW0ub3BlbjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWNjZXB0IG9yIGRlbnkgYW4gaXRlbS5cbiAgICAgICAgICogQHBhcmFtIGl0ZW1cbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS5pdGVtQWNjZXB0ID0gZnVuY3Rpb24oaXRlbSlcbiAgICAgICAge1xuICAgICAgICAgICAgaXRlbS5wZW5kaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgcG9zdCA9IGdldFZhbHVlcyhpdGVtLCBbJ3BlbmRpbmcnLCdhY2NlcHRlZCddKTtcblxuICAgICAgICAgICAgJGh0dHAucHV0KGl0ZW0uX3VybCwgcG9zdCkuc3VjY2VzcyhmdW5jdGlvbihyZXNwb25zZSkge1xuXG5cbiAgICAgICAgICAgIH0pLmVycm9yKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYnN0YXIubW9kYWwuZXJyb3IoXCJUaGVyZSB3YXMgYW4gZXJyb3IgdXBkYXRpbmcgdGhlIGl0ZW0uXCIpO1xuICAgICAgICAgICAgICAgIGl0ZW0ucGVuZGluZyA9IHRydWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc29ydEJ5ID0gZnVuY3Rpb24oZmllbGQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICgkc2NvcGUuc29ydCA9PSBmaWVsZCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zb3J0RGlyID0gISRzY29wZS5zb3J0RGlyO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc29ydERpciA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkc2NvcGUuc29ydCA9IGZpZWxkO1xuICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb25zLnNvcnQoZnVuY3Rpb24oYSxiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5zb3J0RGlyID8gYVskc2NvcGUuc29ydF0gPiBiWyRzY29wZS5zb3J0XSA6IGFbJHNjb3BlLnNvcnRdIDwgYlskc2NvcGUuc29ydF07XG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zb3J0aW5nQnkgPSBmdW5jdGlvbihmaWVsZClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIGZpZWxkID09ICRzY29wZS5zb3J0O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHZW5lcmF0ZSBhIHJlcG9ydCB1cmwgZnJvbSB0aGUgc2VhcmNoIGNyaXRlcmlhLlxuICAgICAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLnJlcG9ydFVybCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIFwiL2FwaS92MS9zdWJtaXNzaW9uL3JlcG9ydD9zPVwiK2J0b2EoSlNPTi5zdHJpbmdpZnkoJHNjb3BlLnNlYXJjaCkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBVcGRhdGUgdGhlIHRhYmxlIHdpdGggdGhlIG5ldyBzZWFyY2ggY3JpdGVyaWEuXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS51cGRhdGUgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBnbyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgJGh0dHAucG9zdCgnL2FwaS92MS9zdWJtaXNzaW9uL3NlYXJjaCcsICRzY29wZS5zZWFyY2gpLnN1Y2Nlc3MoZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb25zID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAkdGltZW91dChnbywgNTAwKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuY2hhbmdlU2VhcmNoID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuc2VhcmNoLndoZXJlLmNyZWF0ZWRfYXQgPSBnZXREYXRlUmFuZ2UoKTtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdzdGFydERhdGUnLCAkc2NvcGUuZGF0ZXMuc3RhcnQpO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2VuZERhdGUnLCAkc2NvcGUuZGF0ZXMuZW5kKTtcbiAgICAgICAgICAgICRzY29wZS51cGRhdGUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbml0XG4gICAgICAgICRzY29wZS51cGRhdGUoKTtcbiAgICB9XG5cbn0pKGJzdGFyLmFwcCk7IiwiKGZ1bmN0aW9uIChhcHApIHtcblxuICAgIGFwcC5jb250cm9sbGVyKCd1c2VyQ3RybCcsIFVzZXJUYWJsZUNvbnRyb2xsZXIpO1xuXG5cbiAgICBmdW5jdGlvbiBVc2VyVGFibGVDb250cm9sbGVyKCRzY29wZSwkaHR0cCwkdGltZW91dClcbiAgICB7XG4gICAgICAgICRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLVJFUVVFU1RFRC1XSVRIJ10gPSBcIlhNTEh0dHBSZXF1ZXN0XCI7XG4gICAgICAgICRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLUNTUkYtVE9LRU4nXSA9IGJzdGFyLmNzcmZUb2tlbigpO1xuXG5cbiAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAkc2NvcGUudXNlcnMgPSBbXTtcbiAgICAgICAgJHNjb3BlLm5ld1VzZXIgPSB7XG4gICAgICAgICAgICBmaXJzdF9uYW1lOiBudWxsLFxuICAgICAgICAgICAgbGFzdF9uYW1lOiBudWxsLFxuICAgICAgICAgICAgZW1haWw6IG51bGwsXG4gICAgICAgICAgICBwYXNzd29yZDpudWxsLFxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5jaGFuZ2VQYXNzd29yZE9wdGlvbiA9IGZ1bmN0aW9uKGluZGV4KVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgdXNlciA9ICRzY29wZS51c2Vyc1tpbmRleF07XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnJlbW92ZVVzZXJPcHRpb24gPSBmdW5jdGlvbihpbmRleClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHVzZXIgPSAkc2NvcGUudXNlcnNbaW5kZXhdO1xuICAgICAgICAgICAgJGh0dHAuZGVsZXRlKCcvYXBpL3YxL3VzZXIvJyt1c2VyLmlkKS5zdWNjZXNzKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVzZXJzLnNwbGljZShpbmRleCwxKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmNyZWF0ZVVzZXIgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRodHRwLnBvc3QoJy9hcGkvdjEvdXNlcicsICRzY29wZS5uZXdVc2VyKS5zdWNjZXNzKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVzZXJzLnB1c2gocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBnZXREYXRhKClcbiAgICAgICAge1xuICAgICAgICAgICAgJGh0dHAuZ2V0KCcvYXBpL3YxL3VzZXInKS5zdWNjZXNzKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblxuICAgICAgICAgICAgICAgICRzY29wZS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVzZXJzID0gcmVzcG9uc2UuZGF0YTtcblxuICAgICAgICAgICAgfSkuZXJyb3IoZnVuY3Rpb24ocmVzcG9uc2UpIHtcblxuICAgICAgICAgICAgICAgIGJzdGFyLm1vZGFsLmVycm9yKFwiVGhlcmUgd2FzIGFuIGVycm9yLi4uXCIpO1xuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgICR0aW1lb3V0KGdldERhdGEsNTAwKTtcbiAgICB9XG5cbn0pKGJzdGFyLmFwcCk7IiwiKGZ1bmN0aW9uIChhcHApIHtcblxuICAgIGFwcC5kaXJlY3RpdmUoJ2JzdGFyTW9kYWwnLCBNb2RhbERpcmVjdGl2ZSk7XG4gICAgYXBwLmRpcmVjdGl2ZSgnbW9kYWxPcGVuJywgTW9kYWxPcGVuRGlyZWN0aXZlKTtcblxuICAgIHZhciBBY3Rpb25zID0ge307XG5cbiAgICAvKipcbiAgICAgKiBSZWdpc3RlciBhIG5ldyBtb2RhbCBhY3Rpb24uXG4gICAgICogQHBhcmFtIG5hbWUgc3RyaW5nXG4gICAgICogQHBhcmFtIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICovXG4gICAgYnN0YXIucmVnaXN0ZXJNb2RhbEFjdGlvbiA9IGZ1bmN0aW9uKG5hbWUsIG9iamVjdClcbiAgICB7XG4gICAgICAgIHJldHVybiBBY3Rpb25zW25hbWVdID0gb2JqZWN0O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG9ydGN1dCBmb3IgYWRkaW5nIG1vZGFsLm9wZW5LZXkgdG8gZWxlbWVudHMuXG4gICAgICogQHJldHVybnMge3tyZXN0cmljdDogc3RyaW5nLCBsaW5rOiBsaW5rfX1cbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBNb2RhbE9wZW5EaXJlY3RpdmUoKVxuICAgIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiBcIkFcIixcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLGVsZW1lbnQsYXR0cnMpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgICAgICBic3Rhci5tb2RhbC5vcGVuS2V5KGF0dHJzLm1vZGFsT3Blbik7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseSgpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEaXJlY3RpdmUgZm9yIG1hbmFnaW5nIHRoZSBtb2RhbCBkaWFsb2cuXG4gICAgICogQHBhcmFtICRodHRwXG4gICAgICogQHBhcmFtICR0aW1lb3V0XG4gICAgICogQHJldHVybnMge3tyZXN0cmljdDogc3RyaW5nLCByZXBsYWNlOiBib29sZWFuLCBjb250cm9sbGVyQXM6IHN0cmluZywgY29udHJvbGxlcjogTW9kYWxDb250cm9sbGVyLCB0ZW1wbGF0ZVVybDogc3RyaW5nfX1cbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBNb2RhbERpcmVjdGl2ZSgkaHR0cCwkdGltZW91dClcbiAgICB7XG4gICAgICAgIGZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdEFjdGlvbnMoY29udHJvbGxlcilcbiAgICAgICAge1xuICAgICAgICAgICAgYnN0YXIucmVnaXN0ZXJNb2RhbEFjdGlvbignb2snLCB7XG4gICAgICAgICAgICAgICAgbGFiZWw6ICdPSycsXG4gICAgICAgICAgICAgICAgdHlwZTogJ3ByaW1hcnknLFxuICAgICAgICAgICAgICAgIGNsaWNrOiBmdW5jdGlvbigpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYnN0YXIubW9kYWwuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgYnN0YXIucmVnaXN0ZXJNb2RhbEFjdGlvbignY2xvc2UnLCB7XG4gICAgICAgICAgICAgICAgbGFiZWw6ICdDbG9zZScsXG4gICAgICAgICAgICAgICAgdHlwZTogJ3ByaW1hcnknLFxuICAgICAgICAgICAgICAgIGNsaWNrOiBmdW5jdGlvbigpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYnN0YXIubW9kYWwuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb250cm9sbGVyIG9mIHRoZSBtb2RhbC5cbiAgICAgICAgICogQHBhcmFtICRzY29wZVxuICAgICAgICAgKiBAcGFyYW0gJGVsZW1lbnRcbiAgICAgICAgICogQHBhcmFtICRhdHRyc1xuICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIE1vZGFsQ29udHJvbGxlcigkc2NvcGUsJGVsZW1lbnQsJGF0dHJzKVxuICAgICAgICB7XG4gICAgICAgICAgICByZWdpc3RlckRlZmF1bHRBY3Rpb25zKHRoaXMpO1xuXG4gICAgICAgICAgICBic3Rhci5tb2RhbCA9IHRoaXM7XG5cbiAgICAgICAgICAgICRzY29wZS5pc09wZW4gPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5pc0ZldGNoaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUudGl0bGUgPSBudWxsO1xuICAgICAgICAgICAgJHNjb3BlLmNvbnRlbnQgPSBcIlwiO1xuICAgICAgICAgICAgJHNjb3BlLmFjdGlvbnMgPSBbXTtcbiAgICAgICAgICAgICRzY29wZS50eXBlID0gXCJub3JtYWxcIjtcblxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ2hpZGRlbi5icy5tb2RhbCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50b2dnbGUoZmFsc2UpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBPcGVuIHRoZSBtb2RhbCBkaWFsb2cgd2l0aCBwYXJhbWV0ZXJzLlxuICAgICAgICAgICAgICogQHBhcmFtIHNwZWNzIHN0cmluZ3xvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIGJvb2xlYW5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5vcGVuID0gZnVuY3Rpb24oc3BlY3MpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzcGVjcyA9PSAnc3RyaW5nJyB8fCAhYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29udGVudCA9IHNwZWNzfHxudWxsO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnRvZ2dsZSh0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJHNjb3BlLnRpdGxlID0gc3BlY3MudGl0bGUgfHwgbnVsbDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY29udGVudCA9IHNwZWNzLmNvbnRlbnQ7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnR5cGUgPSBzcGVjcy50eXBlIHx8IFwibm9ybWFsXCI7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmFjdGlvbnMgPSBnZXRBY3Rpb25zKHNwZWNzLmFjdGlvbnMgfHwgJ29rJyk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50b2dnbGUodHJ1ZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENsb3NlIHRoZSBtb2RhbC5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLmNsb3NlID0gZnVuY3Rpb24oKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnRvZ2dsZShmYWxzZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE9wZW4gYSBtb2RhbCBrZXkgYnkgbmFtZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSBuYW1lIHN0cmluZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLm9wZW5LZXkgPSBmdW5jdGlvbihuYW1lKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGJzdGFyLmtleXNbbmFtZV07XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub3Blbih7dGl0bGU6IHZhbHVlLnRpdGxlLCBjb250ZW50OiB2YWx1ZS5jb250ZW50LCBhY3Rpb25zOidvayd9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRvZ2dsZSB0aGUgbW9kYWwgb3BlbiBvciBjbG9zZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0gYm9vbFxuICAgICAgICAgICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMudG9nZ2xlID0gZnVuY3Rpb24oYm9vbClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzT3BlbiA9ICEgYXJndW1lbnRzLmxlbmd0aCA/ICEgdGhpcy5pc09wZW4gOiBib29sO1xuICAgICAgICAgICAgICAgICRlbGVtZW50Lm1vZGFsKHRoaXMuaXNPcGVuID8gJ3Nob3cnIDogJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICBpZiAoISB0aGlzLmlzT3Blbikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc2V0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT3BlbjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogT3BlbiBhbiBlcnJvciBtZXNzYWdlLlxuICAgICAgICAgICAgICogQHBhcmFtIG1lc3NhZ2Ugc3RyaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMuZXJyb3IgPSBmdW5jdGlvbihtZXNzYWdlKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHRoaXMub3Blbih7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOlwiRXJyb3IuLi5cIixcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogbWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTpcImVycm9yXCJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRmV0Y2ggdGhlIGNvbnRlbnRzIG9mIGEgdXJsIGFuZCBhZGQgdG8gdGhlIG1vZGFsIGRpYWxvZy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB1cmwgc3RyaW5nXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMuZmV0Y2ggPSBmdW5jdGlvbih1cmwpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgICAgICRzY29wZS5pc0ZldGNoaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzZWxmLm9wZW4oKTtcbiAgICAgICAgICAgICAgICAkaHR0cC5nZXQodXJsKS5zdWNjZXNzKGZ1bmN0aW9uKGh0bWwpe1xuICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmlzRmV0Y2hpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYub3BlbihodG1sKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVzZXQgdGhlIGNvbnRlbnRzLlxuICAgICAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLnJlc2V0ID0gZnVuY3Rpb24oKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICRzY29wZS50aXRsZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNvbnRlbnQgPSBcIlwiO1xuICAgICAgICAgICAgICAgICRzY29wZS5hY3Rpb25zID0gW107XG4gICAgICAgICAgICAgICAgJHNjb3BlLnR5cGUgPSBcIm5vcm1hbFwiO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXQgdGhlIGdpdmVuIGFjdGlvbnMgYnkgbmFtZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSBhY3Rpb25zIGFycmF5fHN0cmluZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBmdW5jdGlvbiBnZXRBY3Rpb25zKGFjdGlvbnMpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWYgKCEgQXJyYXkuaXNBcnJheShhY3Rpb25zKSkge1xuICAgICAgICAgICAgICAgICAgICBhY3Rpb25zID0gW2FjdGlvbnNdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYWN0aW9ucy5tYXAoZnVuY3Rpb24oYWN0aW9uTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gQWN0aW9uc1thY3Rpb25OYW1lXTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogXCJFXCIsXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiBcIm1vZGFsXCIsXG4gICAgICAgICAgICBjb250cm9sbGVyOiBNb2RhbENvbnRyb2xsZXIsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy90ZW1wbGF0ZXMvbW9kYWwuaHRtbCdcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn0pKGJzdGFyLmFwcCk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
