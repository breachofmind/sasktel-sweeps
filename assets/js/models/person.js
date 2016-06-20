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