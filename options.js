"use strict";
var nopt = require('nopt');
var mu = require('./miscutils.js');
var logger = require('./logger.js');

var defaultOptions = {
    fromDate: new Date(Date.parse('2012-04-01')),
    toDate: new Date(Date.parse('2014-11-04')),
    outputFolder: 'f:/projects/data/nseData',
    holidaysFile: './holidays.txt',
    monoguri: 'mongodb://localhost:27017/test',
    downloadPause: 2000,
    unzipPause: 100,
    parsePause: 1000,
    analysisPause: 25000
};

function getProgramOpts(args) {
    var knownOpts = {
            'fromDate': Date,
            'toDate': Date,
            'outputFolder': String,
            'holidaysFile': String,
            'mongouri': String,
            'downloadPause': Number,
            'unzipPause': Number,
            'parsePause': Number,
            'analysisPause': Number
        },
        parsed = nopt(knownOpts, {}, args, 2);
    parsed.fromDate = parsed.fromDate || defaultOptions.fromDate;
    parsed.toDate = parsed.toDate || defaultOptions.toDate;
    parsed.outputFolder = parsed.outputFolder || defaultOptions.outputFolder;
    parsed.holidaysFile = parsed.holidaysFile || defaultOptions.holidaysFile;
    parsed.mongouri = parsed.mongouri || defaultOptions.monoguri;
    parsed.downloadPause = parsed.downloadPause || defaultOptions.downloadPause;
    parsed.unzipPause = parsed.unzipPause || defaultOptions.unzipPause;
    parsed.parsePause = parsed.parsePause || defaultOptions.parsePause;
    parsed.analysisPause = parsed.analysisPause || defaultOptions.analysisPause;
    parsed.fromDate = mu.hackDateForTZ(parsed.fromDate);
    parsed.toDate = mu.hackDateForTZ(parsed.toDate);
    parsed.pid = process.pid;
    delete parsed.argv;
    logger.info('running with options : ' + JSON.stringify(parsed));
    return parsed;
}

module.exports.getProgramOpts = getProgramOpts;
