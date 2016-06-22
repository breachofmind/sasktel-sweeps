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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJwZXJzb24uanMiLCJsb2dpbkN0cmwuanMiLCJzdWJtaXNzaW9uQ3RybC5qcyIsImFkbWluQ3RybC5qcyIsInVzZXJDdHJsLmpzIiwibW9kYWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InNyYy5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgaW5pdCA9IFtzZXR1cEFqYXhIZWFkZXJzLCBpbmRleE1vZGFsS2V5c107XG5cbiAgICB3aW5kb3cuYnN0YXIgPSB7XG4gICAgICAgIGFwcDogYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsnZGF0ZVBpY2tlcicsJ25nQW5pbWF0ZScsJ25nU2FuaXRpemUnXSksXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbmZpZ3VyYXRpb24uXG4gICAgICAgICAqL1xuICAgICAgICBjb25maWc6IHt9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNb2RhbCBrZXkgaW5kZXguXG4gICAgICAgICAqL1xuICAgICAgICBrZXlzOiB7fSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUXVldWUgYSBkb2N1bWVudC5yZWFkeSBjYWxsYmFjay5cbiAgICAgICAgICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgIHJlYWR5OiBmdW5jdGlvbihjYWxsYmFjaylcbiAgICAgICAge1xuICAgICAgICAgICAgaW5pdC5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJuIHRoZSB2YWx1ZSBvZiB0aGUgY3NyZiBmaWVsZC5cbiAgICAgICAgICogUmVxdWlyZWQgZm9yIGFueSBhamF4IFBPU1Qgb3BlcmF0aW9ucy5cbiAgICAgICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgICAgICovXG4gICAgICAgIGNzcmZUb2tlbjogZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gJCgnbWV0YVtuYW1lPVwiY3NyZi10b2tlblwiXScpLmF0dHIoJ2NvbnRlbnQnKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2VyaWFsaXplcyByZWN1cnNpdmVseSBhbiBvYmplY3QgZm9yIHVybCBlbmNvZGluZy5cbiAgICAgICAgICogQHBhcmFtIG9ialxuICAgICAgICAgKiBAcGFyYW0gcHJlZml4XG4gICAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICBzZXJpYWxpemU6IGZ1bmN0aW9uKG9iaixwcmVmaXgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBzdHIgPSBbXTtcbiAgICAgICAgICAgIGZvcih2YXIgcCBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHApKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBrID0gcHJlZml4ID8gcHJlZml4ICsgXCJbXCIgKyBwICsgXCJdXCIgOiBwLCB2ID0gb2JqW3BdO1xuICAgICAgICAgICAgICAgICAgICBzdHIucHVzaCh0eXBlb2YgdiA9PSBcIm9iamVjdFwiID9cbiAgICAgICAgICAgICAgICAgICAgICAgIGJzdGFyLnNlcmlhbGl6ZSh2LCBrKSA6XG4gICAgICAgICAgICAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChrKSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHYpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc3RyLmpvaW4oXCImXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgLyoqXG4gICAgICogQXR0YWNoZXMgYSBjcnNmIHRva2VuIHRvIGFsbCBBSkFYIGhlYWRlcnMuXG4gICAgICogQHJldHVybnMgdm9pZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNldHVwQWpheEhlYWRlcnMoKVxuICAgIHtcbiAgICAgICAgJC5hamF4U2V0dXAoe1xuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICdYLUNTUkYtVE9LRU4nOiBic3Rhci5jc3JmVG9rZW4oKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbmRleCBhbGwgdGhlIG1vZGFsIGtleXMgZm9yIHF1aWNrIHNlYXJjaGluZy5cbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gaW5kZXhNb2RhbEtleXMoKVxuICAgIHtcbiAgICAgICAgdmFyICRrZXlzID0gJCgndWwubW9kYWwta2V5cyBsaScpO1xuICAgICAgICAka2V5cy5lYWNoKGZ1bmN0aW9uKGksZWwpIHtcbiAgICAgICAgICAgIGJzdGFyLmtleXNbZWwuZ2V0QXR0cmlidXRlKCdkYXRhLWtleScpXSA9IHtcbiAgICAgICAgICAgICAgICB0aXRsZTogZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXRpdGxlJyksXG4gICAgICAgICAgICAgICAgY29udGVudDogZWwuaW5uZXJIVE1MXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlyZSB3aGVuIERPTSBsb2FkZWQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgaW5pdC5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9KVxuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24oYnN0YXIpe1xuXG4gICAgLyoqXG4gICAgICogRGVmaW5lcyBhIHBlcnNvbiBtb2RlbC5cbiAgICAgKiBAdHlwZSBCYWNrYm9uZS5Nb2RlbFxuICAgICAqL1xuICAgIHZhciBQZXJzb24gPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgICAgICBkZWZhdWx0czoge1xuICAgICAgICAgICAgbWFuYWdlcl9pZDpudWxsXG4gICAgICAgIH0sXG4gICAgICAgIGNvbGxlY3Rpb246IFBlcnNvbkNvbGxlY3Rpb25cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIERlZmluZXMgYSBjb2xsZWN0aW9uIG9mIHBlb3BsZS5cbiAgICAgKiBAdHlwZSBCYWNrYm9uZS5Db2xsZWN0aW9uXG4gICAgICovXG4gICAgdmFyIFBlcnNvbkNvbGxlY3Rpb24gPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgICAgIG1vZGVsOiBQZXJzb24sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybiBhbiBhcnJheSBvZiBwZW9wbGUgZ2l2ZW4gdGhlaXIgZ3JvdXAgYW5kIG1hbmFnZXIuXG4gICAgICAgICAqIEBwYXJhbSBncm91cE5hbWUgc3RyaW5nIHNtYnxjb3JwZ292dFxuICAgICAgICAgKiBAcGFyYW0gbWFuYWdlcl9pZCBzdHJpbmd8bnVsbFxuICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXk8UGVyc29uPn1cbiAgICAgICAgICovXG4gICAgICAgIHNlZ21lbnQ6IGZ1bmN0aW9uKGdyb3VwTmFtZSwgbWFuYWdlcl9pZClcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKG1hbmFnZXJfaWQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgbWFuYWdlcl9pZCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXIoZnVuY3Rpb24ocGVyc29uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChwZXJzb24uZ2V0KCdncm91cCcpID09PSBudWxsIHx8IHBlcnNvbi5nZXQoJ2dyb3VwJykgPT09IGdyb3VwTmFtZSlcbiAgICAgICAgICAgICAgICAgICAgJiYgcGVyc29uLmdldCgnbWFuYWdlcl9pZCcpID09IG1hbmFnZXJfaWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBic3Rhci5QZXJzb24gPSBQZXJzb247XG4gICAgYnN0YXIuUGVvcGxlID0gUGVyc29uQ29sbGVjdGlvbjtcblxufSkoYnN0YXIpOyIsIihmdW5jdGlvbiAoYXBwKSB7XG5cbiAgICBhcHAuY29udHJvbGxlcignbG9naW5DdHJsJywgTG9naW5Gb3JtQ29udHJvbGxlcik7XG5cbiAgICB2YXIgbG9naW5VcmwgPSBcIi9sb2dpblwiO1xuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgdXNlciBsb2dpbi5cbiAgICAgKiBAc2VlIHZpZXdzL2xvZ2luLmVqc1xuICAgICAqIEBwYXJhbSAkc2NvcGVcbiAgICAgKiBAcGFyYW0gJGh0dHBcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBMb2dpbkZvcm1Db250cm9sbGVyKCRzY29wZSwkaHR0cCwkbG9jYXRpb24sJHRpbWVvdXQpXG4gICAge1xuICAgICAgICAkc2NvcGUuc3VibWl0dGluZyA9IGZhbHNlO1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG4gICAgICAgICRzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAkc2NvcGUuZ3Vlc3QgPSB7XG4gICAgICAgICAgICB1c2VybmFtZTogbnVsbCxcbiAgICAgICAgICAgIHBhc3N3b3JkOiBudWxsLFxuICAgICAgICAgICAgX2NzcmY6IG51bGxcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24oJGV2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICRzY29wZS5ndWVzdC5fY3NyZiA9IGJzdGFyLmNzcmZUb2tlbigpO1xuICAgICAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSB0cnVlO1xuXG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICRodHRwLnBvc3QobG9naW5VcmwsICRzY29wZS5ndWVzdClcbiAgICAgICAgICAgICAgICAgICAgLnN1Y2Nlc3MobG9naW5TdWNjZXNzKVxuICAgICAgICAgICAgICAgICAgICAuZXJyb3IobG9naW5FcnJvcik7XG4gICAgICAgICAgICB9LDIwMDApO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmlzRmlsbGVkID0gZnVuY3Rpb24oZmllbGQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiAkc2NvcGUuZ3Vlc3RbZmllbGRdICE9IG51bGwgJiYgJHNjb3BlLmd1ZXN0W2ZpZWxkXSAhPSBcIlwiO1xuICAgICAgICB9O1xuXG5cbiAgICAgICAgZnVuY3Rpb24gbG9naW5TdWNjZXNzKGRhdGEpIHtcbiAgICAgICAgICAgICRzY29wZS5zdWJtaXR0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuICAgICAgICAgICAgaWYgKGRhdGEucmVkaXJlY3QpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUudXNlciA9IGRhdGEudXNlcjtcbiAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBkYXRhLnJlZGlyZWN0O1xuICAgICAgICAgICAgICAgIH0sIDIwMDApO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBsb2dpbkVycm9yKGVycikge1xuICAgICAgICAgICAgJHNjb3BlLnN1Ym1pdHRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9IGVyci5lcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxufSkoYnN0YXIuYXBwKTsiLCIoZnVuY3Rpb24gKGFwcCkge1xuXG4gICAgYXBwLmNvbnRyb2xsZXIoJ3N1Ym1pc3Npb25DdHJsJywgU3VibWlzc2lvbkZvcm1Db250cm9sbGVyKTtcblxuICAgIHZhciBzdWJtaXRVcmwgPSBcIi9zdWJtaXRcIjtcbiAgICB2YXIgcGVvcGxlVXJsID0gXCIvcGVvcGxlXCI7XG5cbiAgICB2YXIgcmVzZXQgPSB7fTtcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHVzZXIgbG9naW4uXG4gICAgICogQHNlZSB2aWV3cy9sb2dpbi5lanNcbiAgICAgKiBAcGFyYW0gJHNjb3BlXG4gICAgICogQHBhcmFtICRodHRwXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gU3VibWlzc2lvbkZvcm1Db250cm9sbGVyKCRzY29wZSwkaHR0cCwkdGltZW91dClcbiAgICB7XG4gICAgICAgICRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLVJFUVVFU1RFRC1XSVRIJ10gPSBcIlhNTEh0dHBSZXF1ZXN0XCI7XG4gICAgICAgICRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLUNTUkYtVE9LRU4nXSA9IGJzdGFyLmNzcmZUb2tlbigpO1xuXG4gICAgICAgICRzY29wZS5wcm9jZXNzaW5nID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5mb3JtQ29tcGxldGUgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiAkc2NvcGUuc3VibWlzc2lvbkZvcm0uJHZhbGlkO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS50eXBlcyA9IFtcbiAgICAgICAgICAgIHt2YWx1ZTogXCJzbWJcIiwgICAgICAgdGV4dDogXCJTbWFsbC9NZWRpdW0gQnVzaW5lc3NcIn0sXG4gICAgICAgICAgICB7dmFsdWU6IFwiY29ycGdvdnRcIiwgIHRleHQ6IFwiQ29ycG9yYXRlL0dvdmVybm1lbnRcIn0sXG4gICAgICAgIF07XG5cbiAgICAgICAgLy8gU3VwcG9ydCBhbGxvd2VkIGlzIHRoZSB0b3RhbCBhbW91bnQgb2Ygc3VwcG9ydGluZyByZXBzIGZvciB0aGlzIGdyb3VwLlxuICAgICAgICAkc2NvcGUuYWxsb3dlZCA9IHtcbiAgICAgICAgICAgIHNtYjoxLCBjb3JwZ292dDoyXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRm9ybSBpbnB1dFxuICAgICAgICAkc2NvcGUuaW5wdXQgPSB7XG4gICAgICAgICAgICBjdXN0b21lcl9uYW1lOiAgbnVsbCxcbiAgICAgICAgICAgIHNhbGVfZGF0ZTogICAgICBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgdHlwZTogICAgICAgICAgIFwic21iXCIsXG4gICAgICAgICAgICBkZXRhaWxzOiAgICAgICAgXCJcIixcbiAgICAgICAgICAgIGJ1c2luZXNzX3ByaW9yaXR5IDogXCJcIixcbiAgICAgICAgICAgIG1hbmFnZXJfaWQ6ICAgICBudWxsLFxuICAgICAgICAgICAgYWNjb3VudF9yZXBfaWQ6IG51bGwsXG4gICAgICAgICAgICBzYWxlc19hc3NvY19pZDogbnVsbCxcbiAgICAgICAgICAgIHNhbGVzX3JlcF9pZDogICBudWxsLFxuICAgICAgICAgICAgc3VwcG9ydF9hc3NvY3M6IFtdXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRm9yIHJlc2V0dGluZ1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluICRzY29wZS5pbnB1dCkge1xuICAgICAgICAgICAgaWYgKCRzY29wZS5pbnB1dC5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgICAgIHJlc2V0W3Byb3BdID0gJHNjb3BlLmlucHV0W3Byb3BdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbCBzdGF0ZVxuICAgICAgICAkc2NvcGUucGVvcGxlID0gbmV3IGJzdGFyLlBlb3BsZTtcblxuICAgICAgICAkc2NvcGUuc2FsZXNSZXBOYW1lID0gXCJcIjtcblxuICAgICAgICAvLyBEYXRlcyBzaG91bGQgbm90IGJlIGluIHRoZSBmdXR1cmUgOylcbiAgICAgICAgJHNjb3BlLm1heFNhbGVEYXRlID0gbW9tZW50KCk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFplcm8gb3V0IHRoZSBzdXBwb3J0IGFzc29jcyB3aGVuIHRoZSB1c2VyIGNoYW5nZXMgdGhlIHR5cGUgYWdhaW4uXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS5jaGFuZ2VUeXBlID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuaW5wdXQuc3VwcG9ydF9hc3NvY3MgPSBbXTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWRkIGEgc2FsZXMgcmVwIHRvIHRoZSBsaXN0LlxuICAgICAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUuYWRkU2FsZXNSZXAgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9ICRzY29wZS5zYWxlc1JlcE5hbWUudHJpbSgpO1xuICAgICAgICAgICAgaWYgKCRzY29wZS5pbnB1dC5zdXBwb3J0X2Fzc29jcy5sZW5ndGggPCAkc2NvcGUuYWxsb3dlZFskc2NvcGUuaW5wdXQudHlwZV0gJiYgdmFsdWUgIT0gXCJcIikge1xuICAgICAgICAgICAgICAgICRzY29wZS5pbnB1dC5zdXBwb3J0X2Fzc29jcy5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2FsZXNSZXBOYW1lID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlIGEgc2FsZXMgcmVwIGZyb20gdGhlIGxpc3QuXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS5yZW1vdmVTYWxlc1JlcCA9IGZ1bmN0aW9uKGluZGV4KVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuaW5wdXQuc3VwcG9ydF9hc3NvY3Muc3BsaWNlKGluZGV4LDEpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGVuIHRoZSBrZXkgaXMgcHJlc3NlZCB3aGVuIGVudGVyaW5nIHN1cHBvcnQgcmVwc1xuICAgICAgICAgKiBAcGFyYW0gJGV2ZW50XG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUuc2FsZXNSZXBFbnRlciA9IGZ1bmN0aW9uKCRldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKCRldmVudC5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgICAgICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICRzY29wZS5hZGRTYWxlc1JlcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdWJtaXQgdGhlIGZvcm0uXG4gICAgICAgICAqIEBwYXJhbSAkZXZlbnRcbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS5zdWJtaXQgPSBmdW5jdGlvbigkZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJHNjb3BlLnByb2Nlc3NpbmcgPSB0cnVlO1xuICAgICAgICAgICAgJGh0dHAucG9zdChzdWJtaXRVcmwsICRzY29wZS5pbnB1dClcbiAgICAgICAgICAgICAgICAuc3VjY2VzcyhzdWJtaXRTdWNjZXNzKVxuICAgICAgICAgICAgICAgIC5lcnJvcihzdWJtaXRFcnJvcilcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2hlY2sgaWYgYSBmaWVsZCBpcyBmaWxsZWQuXG4gICAgICAgICAqIEBwYXJhbSBmaWVsZCBzdHJpbmdcbiAgICAgICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUuaXNGaWxsZWQgPSBmdW5jdGlvbihmaWVsZClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuICRzY29wZS5pbnB1dFtmaWVsZF0gIT0gbnVsbCAmJiAkc2NvcGUuaW5wdXRbZmllbGRdICE9IFwiXCI7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZvY3VzIG9uIGFuIGlucHV0IGJ5IElELlxuICAgICAgICAgKiBAcGFyYW0gZWxlbWVudElkIHN0cmluZ1xuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLmZvY3VzT24gPSBmdW5jdGlvbihlbGVtZW50SWQpXG4gICAgICAgIHtcbiAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkgeyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtZW50SWQpLmZvY3VzKCk7IH0pO1xuICAgICAgICB9O1xuXG5cbiAgICAgICAgJGh0dHAuZ2V0KHBlb3BsZVVybCkuc3VjY2VzcyhmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAkc2NvcGUucGVvcGxlLnJlc2V0KGRhdGEpO1xuICAgICAgICB9KTtcblxuICAgICAgICBmdW5jdGlvbiBzdWJtaXRTdWNjZXNzKHJlc3BvbnNlKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUucHJvY2Vzc2luZyA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLmlucHV0ID0gcmVzZXQ7XG4gICAgICAgICAgICBic3Rhci5tb2RhbC5vcGVuS2V5KCdzdWJtaXR0ZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHN1Ym1pdEVycm9yKHJlc3BvbnNlKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUucHJvY2Vzc2luZyA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICB9XG5cbn0pKGJzdGFyLmFwcCk7IiwiKGZ1bmN0aW9uIChhcHApIHtcblxuICAgIGFwcC5jb250cm9sbGVyKCdhZG1pbkN0cmwnLCBBZG1pblRhYmxlQ29udHJvbGxlcik7XG5cbiAgICBmdW5jdGlvbiBnZXRWYWx1ZXMob2JqZWN0LHByb3BzKVxuICAgIHtcbiAgICAgICAgdmFyIG91dCA9IHt9O1xuICAgICAgICBwcm9wcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgICAgICAgIG91dFtwcm9wXSA9IG9iamVjdFtwcm9wXTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gQWRtaW5UYWJsZUNvbnRyb2xsZXIoJHNjb3BlLCRodHRwLCR0aW1lb3V0KVxuICAgIHtcbiAgICAgICAgJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtUkVRVUVTVEVELVdJVEgnXSA9IFwiWE1MSHR0cFJlcXVlc3RcIjtcbiAgICAgICAgJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtQ1NSRi1UT0tFTiddID0gYnN0YXIuY3NyZlRva2VuKCk7XG5cbiAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAkc2NvcGUuc3VibWlzc2lvbnMgPSBbXTtcbiAgICAgICAgJHNjb3BlLnBhZ2VyID0gbnVsbDtcbiAgICAgICAgJHNjb3BlLnNvcnQgPSBudWxsO1xuICAgICAgICAkc2NvcGUuc29ydERpciA9IHRydWU7XG5cbiAgICAgICAgJHNjb3BlLmRhdGVzID0ge1xuICAgICAgICAgICAgc3RhcnQ6IGdldEZyb21TdG9yYWdlKCdzdGFydERhdGUnLG1vbWVudCgpLnN1YnRyYWN0KDEsJ21vbnRoJykudG9EYXRlKCkpLFxuICAgICAgICAgICAgZW5kOiBnZXRGcm9tU3RvcmFnZSgnZW5kRGF0ZScsIG1vbWVudCgpLnRvRGF0ZSgpKVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRoZSB0YWJsZSBzZWFyY2ggY3JpdGVyaWEuXG4gICAgICAgICRzY29wZS5zZWFyY2ggPSB7XG4gICAgICAgICAgICBzb3J0OiB7cGVuZGluZzotMSwgY3JlYXRlZF9hdDotMX0sXG4gICAgICAgICAgICB3aGVyZToge1xuICAgICAgICAgICAgICAgIGNyZWF0ZWRfYXQ6IGdldERhdGVSYW5nZSgpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEdldCBhIHZhbHVlIGZyb20gbG9jYWwgc3RvcmFnZS5cbiAgICAgICAgICogQHBhcmFtIGtleSBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIGRlZiBEYXRlXG4gICAgICAgICAqIEByZXR1cm5zIHtEYXRlfVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gZ2V0RnJvbVN0b3JhZ2Uoa2V5LGRlZilcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oa2V5KTtcbiAgICAgICAgICAgIGlmICghIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtb21lbnQobmV3IERhdGUodmFsdWUpKS50b0RhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm4gYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGRhdGUgcmFuZ2UuXG4gICAgICAgICAqIEByZXR1cm5zIHt7JGd0ZTogbnVtYmVyLCAkbHRlOiBudW1iZXJ9fVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gZ2V0RGF0ZVJhbmdlKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAkZ3RlOiRzY29wZS5kYXRlcy5zdGFydC50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICRsdGU6JHNjb3BlLmRhdGVzLmVuZC50b0lTT1N0cmluZygpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cblxuICAgICAgICAvKipcbiAgICAgICAgICogVG9nZ2xlIGFuIGl0ZW0gb3BlbiBvciBjbG9zZWQuXG4gICAgICAgICAqIEBwYXJhbSBpdGVtXG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUudG9nZ2xlSXRlbSA9IGZ1bmN0aW9uKGl0ZW0pXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChpdGVtLm9wZW4gPT0gdW5kZWZpbmVkKSBpdGVtLm9wZW4gPSBmYWxzZTtcbiAgICAgICAgICAgIGl0ZW0ub3BlbiA9ICEgaXRlbS5vcGVuO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBY2NlcHQgb3IgZGVueSBhbiBpdGVtLlxuICAgICAgICAgKiBAcGFyYW0gaXRlbVxuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLml0ZW1BY2NlcHQgPSBmdW5jdGlvbihpdGVtKVxuICAgICAgICB7XG4gICAgICAgICAgICBpdGVtLnBlbmRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBwb3N0ID0gZ2V0VmFsdWVzKGl0ZW0sIFsncGVuZGluZycsJ2FjY2VwdGVkJ10pO1xuXG4gICAgICAgICAgICAkaHR0cC5wdXQoaXRlbS5fdXJsLCBwb3N0KS5zdWNjZXNzKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cblxuICAgICAgICAgICAgfSkuZXJyb3IoZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBic3Rhci5tb2RhbC5lcnJvcihcIlRoZXJlIHdhcyBhbiBlcnJvciB1cGRhdGluZyB0aGUgaXRlbS5cIik7XG4gICAgICAgICAgICAgICAgaXRlbS5wZW5kaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zb3J0QnkgPSBmdW5jdGlvbihmaWVsZClcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKCRzY29wZS5zb3J0ID09IGZpZWxkKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNvcnREaXIgPSAhJHNjb3BlLnNvcnREaXI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzY29wZS5zb3J0RGlyID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5zb3J0ID0gZmllbGQ7XG4gICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbnMuc29ydChmdW5jdGlvbihhLGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLnNvcnREaXIgPyBhWyRzY29wZS5zb3J0XSA+IGJbJHNjb3BlLnNvcnRdIDogYVskc2NvcGUuc29ydF0gPCBiWyRzY29wZS5zb3J0XTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNvcnRpbmdCeSA9IGZ1bmN0aW9uKGZpZWxkKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gZmllbGQgPT0gJHNjb3BlLnNvcnQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEdlbmVyYXRlIGEgcmVwb3J0IHVybCBmcm9tIHRoZSBzZWFyY2ggY3JpdGVyaWEuXG4gICAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUucmVwb3J0VXJsID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gXCIvYXBpL3YxL3N1Ym1pc3Npb24vcmVwb3J0P3M9XCIrYnRvYShKU09OLnN0cmluZ2lmeSgkc2NvcGUuc2VhcmNoKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFVwZGF0ZSB0aGUgdGFibGUgd2l0aCB0aGUgbmV3IHNlYXJjaCBjcml0ZXJpYS5cbiAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLnVwZGF0ZSA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGdvID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAkaHR0cC5wb3N0KCcvYXBpL3YxL3N1Ym1pc3Npb24vc2VhcmNoJywgJHNjb3BlLnNlYXJjaCkuc3VjY2VzcyhmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbnMgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICR0aW1lb3V0KGdvLCA1MDApO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5jaGFuZ2VTZWFyY2ggPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5zZWFyY2gud2hlcmUuY3JlYXRlZF9hdCA9IGdldERhdGVSYW5nZSgpO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3N0YXJ0RGF0ZScsICRzY29wZS5kYXRlcy5zdGFydCk7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZW5kRGF0ZScsICRzY29wZS5kYXRlcy5lbmQpO1xuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEluaXRcbiAgICAgICAgJHNjb3BlLnVwZGF0ZSgpO1xuICAgIH1cblxufSkoYnN0YXIuYXBwKTsiLCIoZnVuY3Rpb24gKGFwcCkge1xuXG4gICAgYXBwLmNvbnRyb2xsZXIoJ3VzZXJDdHJsJywgVXNlclRhYmxlQ29udHJvbGxlcik7XG5cblxuICAgIGZ1bmN0aW9uIFVzZXJUYWJsZUNvbnRyb2xsZXIoJHNjb3BlLCRodHRwLCR0aW1lb3V0KVxuICAgIHtcbiAgICAgICAgJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtUkVRVUVTVEVELVdJVEgnXSA9IFwiWE1MSHR0cFJlcXVlc3RcIjtcbiAgICAgICAgJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtQ1NSRi1UT0tFTiddID0gYnN0YXIuY3NyZlRva2VuKCk7XG5cblxuICAgICAgICAkc2NvcGUubG9hZGluZyA9IHRydWU7XG4gICAgICAgICRzY29wZS51c2VycyA9IFtdO1xuICAgICAgICAkc2NvcGUubmV3VXNlciA9IHtcbiAgICAgICAgICAgIGZpcnN0X25hbWU6IG51bGwsXG4gICAgICAgICAgICBsYXN0X25hbWU6IG51bGwsXG4gICAgICAgICAgICBlbWFpbDogbnVsbCxcbiAgICAgICAgICAgIHBhc3N3b3JkOm51bGwsXG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmNoYW5nZVBhc3N3b3JkT3B0aW9uID0gZnVuY3Rpb24oaW5kZXgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciB1c2VyID0gJHNjb3BlLnVzZXJzW2luZGV4XTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUucmVtb3ZlVXNlck9wdGlvbiA9IGZ1bmN0aW9uKGluZGV4KVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgdXNlciA9ICRzY29wZS51c2Vyc1tpbmRleF07XG4gICAgICAgICAgICAkaHR0cC5kZWxldGUoJy9hcGkvdjEvdXNlci8nK3VzZXIuaWQpLnN1Y2Nlc3MoZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUudXNlcnMuc3BsaWNlKGluZGV4LDEpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuY3JlYXRlVXNlciA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgJGh0dHAucG9zdCgnL2FwaS92MS91c2VyJywgJHNjb3BlLm5ld1VzZXIpLnN1Y2Nlc3MoZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUudXNlcnMucHVzaChyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldERhdGEoKVxuICAgICAgICB7XG4gICAgICAgICAgICAkaHR0cC5nZXQoJy9hcGkvdjEvdXNlcicpLnN1Y2Nlc3MoZnVuY3Rpb24ocmVzcG9uc2Upe1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAkc2NvcGUudXNlcnMgPSByZXNwb25zZS5kYXRhO1xuXG4gICAgICAgICAgICB9KS5lcnJvcihmdW5jdGlvbihyZXNwb25zZSkge1xuXG4gICAgICAgICAgICAgICAgYnN0YXIubW9kYWwuZXJyb3IoXCJUaGVyZSB3YXMgYW4gZXJyb3IuLi5cIik7XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgJHRpbWVvdXQoZ2V0RGF0YSw1MDApO1xuICAgIH1cblxufSkoYnN0YXIuYXBwKTsiLCIoZnVuY3Rpb24gKGFwcCkge1xuXG4gICAgYXBwLmRpcmVjdGl2ZSgnYnN0YXJNb2RhbCcsIE1vZGFsRGlyZWN0aXZlKTtcbiAgICBhcHAuZGlyZWN0aXZlKCdtb2RhbE9wZW4nLCBNb2RhbE9wZW5EaXJlY3RpdmUpO1xuXG4gICAgdmFyIEFjdGlvbnMgPSB7fTtcblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyIGEgbmV3IG1vZGFsIGFjdGlvbi5cbiAgICAgKiBAcGFyYW0gbmFtZSBzdHJpbmdcbiAgICAgKiBAcGFyYW0gb2JqZWN0XG4gICAgICogQHJldHVybnMge29iamVjdH1cbiAgICAgKi9cbiAgICBic3Rhci5yZWdpc3Rlck1vZGFsQWN0aW9uID0gZnVuY3Rpb24obmFtZSwgb2JqZWN0KVxuICAgIHtcbiAgICAgICAgcmV0dXJuIEFjdGlvbnNbbmFtZV0gPSBvYmplY3Q7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3J0Y3V0IGZvciBhZGRpbmcgbW9kYWwub3BlbktleSB0byBlbGVtZW50cy5cbiAgICAgKiBAcmV0dXJucyB7e3Jlc3RyaWN0OiBzdHJpbmcsIGxpbms6IGxpbmt9fVxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIE1vZGFsT3BlbkRpcmVjdGl2ZSgpXG4gICAge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6IFwiQVwiLFxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsZWxlbWVudCxhdHRycylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGJzdGFyLm1vZGFsLm9wZW5LZXkoYXR0cnMubW9kYWxPcGVuKTtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERpcmVjdGl2ZSBmb3IgbWFuYWdpbmcgdGhlIG1vZGFsIGRpYWxvZy5cbiAgICAgKiBAcGFyYW0gJGh0dHBcbiAgICAgKiBAcGFyYW0gJHRpbWVvdXRcbiAgICAgKiBAcmV0dXJucyB7e3Jlc3RyaWN0OiBzdHJpbmcsIHJlcGxhY2U6IGJvb2xlYW4sIGNvbnRyb2xsZXJBczogc3RyaW5nLCBjb250cm9sbGVyOiBNb2RhbENvbnRyb2xsZXIsIHRlbXBsYXRlVXJsOiBzdHJpbmd9fVxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIE1vZGFsRGlyZWN0aXZlKCRodHRwLCR0aW1lb3V0KVxuICAgIHtcbiAgICAgICAgZnVuY3Rpb24gcmVnaXN0ZXJEZWZhdWx0QWN0aW9ucyhjb250cm9sbGVyKVxuICAgICAgICB7XG4gICAgICAgICAgICBic3Rhci5yZWdpc3Rlck1vZGFsQWN0aW9uKCdvaycsIHtcbiAgICAgICAgICAgICAgICBsYWJlbDogJ09LJyxcbiAgICAgICAgICAgICAgICB0eXBlOiAncHJpbWFyeScsXG4gICAgICAgICAgICAgICAgY2xpY2s6IGZ1bmN0aW9uKClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBic3Rhci5tb2RhbC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBic3Rhci5yZWdpc3Rlck1vZGFsQWN0aW9uKCdjbG9zZScsIHtcbiAgICAgICAgICAgICAgICBsYWJlbDogJ0Nsb3NlJyxcbiAgICAgICAgICAgICAgICB0eXBlOiAncHJpbWFyeScsXG4gICAgICAgICAgICAgICAgY2xpY2s6IGZ1bmN0aW9uKClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBic3Rhci5tb2RhbC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnRyb2xsZXIgb2YgdGhlIG1vZGFsLlxuICAgICAgICAgKiBAcGFyYW0gJHNjb3BlXG4gICAgICAgICAqIEBwYXJhbSAkZWxlbWVudFxuICAgICAgICAgKiBAcGFyYW0gJGF0dHJzXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gTW9kYWxDb250cm9sbGVyKCRzY29wZSwkZWxlbWVudCwkYXR0cnMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJlZ2lzdGVyRGVmYXVsdEFjdGlvbnModGhpcyk7XG5cbiAgICAgICAgICAgIGJzdGFyLm1vZGFsID0gdGhpcztcblxuICAgICAgICAgICAgJHNjb3BlLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLmlzRmV0Y2hpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS50aXRsZSA9IG51bGw7XG4gICAgICAgICAgICAkc2NvcGUuY29udGVudCA9IFwiXCI7XG4gICAgICAgICAgICAkc2NvcGUuYWN0aW9ucyA9IFtdO1xuICAgICAgICAgICAgJHNjb3BlLnR5cGUgPSBcIm5vcm1hbFwiO1xuXG4gICAgICAgICAgICAkZWxlbWVudC5vbignaGlkZGVuLmJzLm1vZGFsJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRvZ2dsZShmYWxzZSk7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE9wZW4gdGhlIG1vZGFsIGRpYWxvZyB3aXRoIHBhcmFtZXRlcnMuXG4gICAgICAgICAgICAgKiBAcGFyYW0gc3BlY3Mgc3RyaW5nfG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMgYm9vbGVhblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLm9wZW4gPSBmdW5jdGlvbihzcGVjcylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHNwZWNzID09ICdzdHJpbmcnIHx8ICFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jb250ZW50ID0gc3BlY3N8fG51bGw7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9nZ2xlKHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkc2NvcGUudGl0bGUgPSBzcGVjcy50aXRsZSB8fCBudWxsO1xuICAgICAgICAgICAgICAgICRzY29wZS5jb250ZW50ID0gc3BlY3MuY29udGVudDtcbiAgICAgICAgICAgICAgICAkc2NvcGUudHlwZSA9IHNwZWNzLnR5cGUgfHwgXCJub3JtYWxcIjtcbiAgICAgICAgICAgICAgICAkc2NvcGUuYWN0aW9ucyA9IGdldEFjdGlvbnMoc3BlY3MuYWN0aW9ucyB8fCAnb2snKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnRvZ2dsZSh0cnVlKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ2xvc2UgdGhlIG1vZGFsLlxuICAgICAgICAgICAgICogQHJldHVybnMgeyp9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMuY2xvc2UgPSBmdW5jdGlvbigpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9nZ2xlKGZhbHNlKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogT3BlbiBhIG1vZGFsIGtleSBieSBuYW1lLlxuICAgICAgICAgICAgICogQHBhcmFtIG5hbWUgc3RyaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMub3BlbktleSA9IGZ1bmN0aW9uKG5hbWUpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gYnN0YXIua2V5c1tuYW1lXTtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcGVuKHt0aXRsZTogdmFsdWUudGl0bGUsIGNvbnRlbnQ6IHZhbHVlLmNvbnRlbnQsIGFjdGlvbnM6J29rJ30pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVG9nZ2xlIHRoZSBtb2RhbCBvcGVuIG9yIGNsb3NlZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSBib29sXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy50b2dnbGUgPSBmdW5jdGlvbihib29sKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNPcGVuID0gISBhcmd1bWVudHMubGVuZ3RoID8gISB0aGlzLmlzT3BlbiA6IGJvb2w7XG4gICAgICAgICAgICAgICAgJGVsZW1lbnQubW9kYWwodGhpcy5pc09wZW4gPyAnc2hvdycgOiAnaGlkZScpO1xuICAgICAgICAgICAgICAgIGlmICghIHRoaXMuaXNPcGVuKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVzZXQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPcGVuO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBPcGVuIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZSBzdHJpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5lcnJvciA9IGZ1bmN0aW9uKG1lc3NhZ2UpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdGhpcy5vcGVuKHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6XCJFcnJvci4uLlwiLFxuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOlwiZXJyb3JcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBGZXRjaCB0aGUgY29udGVudHMgb2YgYSB1cmwgYW5kIGFkZCB0byB0aGUgbW9kYWwgZGlhbG9nLlxuICAgICAgICAgICAgICogQHBhcmFtIHVybCBzdHJpbmdcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5mZXRjaCA9IGZ1bmN0aW9uKHVybClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmlzRmV0Y2hpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHNlbGYub3BlbigpO1xuICAgICAgICAgICAgICAgICRodHRwLmdldCh1cmwpLnN1Y2Nlc3MoZnVuY3Rpb24oaHRtbCl7XG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaXNGZXRjaGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5vcGVuKGh0bWwpO1xuICAgICAgICAgICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXNldCB0aGUgY29udGVudHMuXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMucmVzZXQgPSBmdW5jdGlvbigpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnRpdGxlID0gbnVsbDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY29udGVudCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmFjdGlvbnMgPSBbXTtcbiAgICAgICAgICAgICAgICAkc2NvcGUudHlwZSA9IFwibm9ybWFsXCI7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNldCB0aGUgZ2l2ZW4gYWN0aW9ucyBieSBuYW1lLlxuICAgICAgICAgICAgICogQHBhcmFtIGFjdGlvbnMgYXJyYXl8c3RyaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZ1bmN0aW9uIGdldEFjdGlvbnMoYWN0aW9ucylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZiAoISBBcnJheS5pc0FycmF5KGFjdGlvbnMpKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbnMgPSBbYWN0aW9uc107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBhY3Rpb25zLm1hcChmdW5jdGlvbihhY3Rpb25OYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBBY3Rpb25zW2FjdGlvbk5hbWVdO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiBcIkVcIixcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6IFwibW9kYWxcIixcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IE1vZGFsQ29udHJvbGxlcixcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL3RlbXBsYXRlcy9tb2RhbC5odG1sJ1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufSkoYnN0YXIuYXBwKTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
