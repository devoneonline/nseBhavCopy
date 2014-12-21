"use strict";
var nopt = require('nopt');
var mu = require('./miscutils.js');
var logger = require('./logger.js');

var defaultOptions = {
    fromDate: new Date(Date.parse('1995-01-01')),
    toDate: new Date(Date.parse('2014-12-19')),
    outputFolder: 'f:/projects/data/nseData',
    holidaysFile: './holidays.txt',
    mongohost: 'localhost',
    mongoport: '27017',
    mongodb: 'nse',
    mongocollection: 'prices',
    actionsToPerform: 'parse,save,analyze' //download,unzip,parse,save,analyze
};

function getProgramOpts(args) {
    var knownOpts = {
            'fromDate': Date,
            'toDate': Date,
            'outputFolder': String,
            'holidaysFile': String,
            'mongohost': String,
            'mongoport': String,
            'mongodb': String,
            'mongocollection': String,
            'actions': String
        },
        parsed = nopt(knownOpts, {}, args, 2);
    parsed.fromDate = parsed.fromDate || defaultOptions.fromDate;
    parsed.toDate = parsed.toDate || defaultOptions.toDate;
    parsed.outputFolder = parsed.outputFolder || defaultOptions.outputFolder;
    parsed.holidaysFile = parsed.holidaysFile || defaultOptions.holidaysFile;
    parsed.mongodb = (parsed.mongodb || defaultOptions.mongodb);
    parsed.mongouri = 'mongodb://' + (parsed.mongohost || defaultOptions.mongohost) + ':' + (parsed.mongoport || defaultOptions.mongoport) + '/' + (parsed.mongodb || defaultOptions.mongodb);
    parsed.mongocollection = parsed.mongocollection || defaultOptions.mongocollection;
    parsed.actionsToPerform = parsed.actions || defaultOptions.actionsToPerform;
    parsed.fromDate = mu.hackDateForTZ(parsed.fromDate);
    parsed.toDate = mu.hackDateForTZ(parsed.toDate);
    parsed.pid = process.pid;
    delete parsed.argv;
    logger.info('running with options : ' + mu.stringify(parsed));
    return parsed;
}

module.exports.getProgramOpts = getProgramOpts;
