var ExpressMVC = require('express-mvc');
var mongoose = require('mongoose');

ExpressMVC.Application.root = __dirname+"/";

mongoose.Promise = require('bluebird');

// Different seeder names can be created.
var seeder = new ExpressMVC.Seeder('installation');

// The root path where all your seed .csv files are stored.
seeder.seedPath = __dirname + "/seeds/";

/**
 * Create a new model to seed using the seeder.add() method.
 * @param name string of seed
 * @param path string of seed, relative to seeder.seedPath
 * @param parser function, optional
 */
//seeder.add('media', 'media.csv');

var objects = [];
seeder.add('person', 'participants.csv', function(row,i) {
    objects.push(row);
    if (row.manager_id > 0) {
        row.manager_id = objects[row.manager_id-1]._id;
    } else {
        row.manager_id = null;
    }
    // Person can be apart of both groups
    if (row.group == "") row.group = null;
    return row;
});

/**
 * A callback is required when all the CSV files are processed.
 * Then, you can start persisting the models to the database.
 */
seeder.on('done', function(seeds)
{
    seeder.createModels();
});

// Start the seeding process.
// When finished, the script will end.
seeder.seed();