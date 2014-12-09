"use strict";
/*jshint -W081 */
/*jslint vars: true, stupid: true */

var nopt = require('nopt');
var mongoclient = require('mongodb').MongoClient;
var timer = require('exectimer');
var logger = require('./logger.js');
var mu = require('./miscutils.js');
var DateIterator = mu.dateIterator;
var Bhavcopy = require('./bhavcopy.js').Bhavcopy;
var events = new (require('events').EventEmitter)();
var mongodb;
var retries = [];

function getProgramOpts(args) {
    var knownOpts = {
            "fromDate": Date,
            "toDate": Date,
            "outputFolder": String,
            "holidaysFile": String,
            "mongouri": String,
            "downloadPause": Number,
            "unzipPause": Number,
            "parsePause": Number
        },
        parsed = nopt(knownOpts, {}, args, 2);
    parsed.fromDate = parsed.fromDate || new Date(Date.parse('1999-01-01'));
    parsed.toDate = parsed.toDate || new Date(Date.parse('2014-12-05'));
    parsed.outputFolder = parsed.outputFolder || "f:/projects/data/nseData";
    parsed.holidaysFile = parsed.holidaysFile || "./holidays.txt";
    parsed.mongouri = parsed.mongouri || "mongodb://localhost:27017/test";
    parsed.downloadPause = parsed.downloadPause || 700;
    parsed.unzipPause = parsed.unzipPause || 750;
    parsed.parsePause = parsed.parsePause || 2000;

    parsed.fromDate = mu.hackDateForTZ(parsed.fromDate);
    parsed.toDate = mu.hackDateForTZ(parsed.toDate);
    delete parsed.argv;
    return parsed;
}

events.on('start downloads', function (event, errCb) {
    var options = event.options;
    var dateIter = new DateIterator(options.holidaysFile);
    var dates = dateIter.getAllDates(options.fromDate, options.toDate);
    var counter = 1;
    var total = dates.length;
    var id = setInterval(function (dates) {
        if (dates.length === 0) {
            clearInterval(id);
        } else {
            var dt = dates.shift();
            events.emit('download for date', {
                bhavcopy: new Bhavcopy(dt, options.outputFolder),
                options: options,
                counter: counter,
                total: total
            }, errCb);
            counter += 1;
        }
    }, options.downloadPause, dates);
});
events.on('download for date', function (event, errCb) {
    var bhavcopy = event.bhavcopy,
        retryCount = event.retryCount || 0;
    event.startTime = +new Date();
    bhavcopy.download(function (filename) {
        event.filename = filename;
        event.endTime = +new Date();
        events.emit('download complete', event, errCb);
    }, function () {
        event.retryCount += 1;
        retries.push(event);
    }, retryCount, errCb);
});
events.on('download complete', function (event, errCb) {
    logger.info('download complete ', event.bhavcopy.zipfilename(), ' ' + event.counter + ' of ' + event.total + " took " + (event.endTime - event.startTime) + " ms");
    var date = event.bhavcopy.forDate(),
        options = event.options,
        endDate = options ? options.toDate : null;
    if (options && date >= endDate) {
        //hopefully this is the last one;
        events.emit('all downloads complete', event, errCb);
    }
});
events.on('all downloads complete', function (event, errCb) {
    logger.info('all downloads complete');
    logger.warn('retrying failed downloads');
    retries.forEach(function (evt) {
        evt.startTime = +new Date();
        events.emit('download for date', evt, errCb);
    });
    logger.info('------------');
    errCb.listErrors();
    retries = [];
    errCb.clearErrors();
    events.emit('start unzip', {options: event.options}, errCb);
});
events.on('start unzip', function (event, errCb) {
    var options = event.options;
    var dateIter = new DateIterator(options.holidaysFile);
    var dates = dateIter.getAllDates(options.fromDate, options.toDate);
    var counter = 1;
    var total = dates.length;
    var id = setInterval(function (dates) {
        if (dates.length === 0) {
            clearInterval(id);
        } else {
            var dt = dates.shift();
            events.emit('unzip', {
                bhavcopy: new Bhavcopy(dt, options.outputFolder),
                options: options,
                counter: counter,
                total: total
            }, errCb);
            counter += 1;
        }
    }, options.unzipPause, dates);
});
events.on('unzip', function (event, errCb) {
    event.startTime = +new Date();
    var unzipped = event.bhavcopy.unzip(errCb);
    event.endTime = +new Date();
    logger.info("unzipped ", event.bhavcopy.zipfilename(), " " + event.counter + " of " + event.total + " took " + (event.startTime - event.endTime) + " ms");
    if (unzipped.length === 0) {
        retries.push(event);
    } else {
        event.unzipped = unzipped[0];
    }
    var date = event.bhavcopy.forDate(),
        options = event.options,
        endDate = options ? options.toDate : null;
    if (options && date >= endDate) {
        //hopefully this is the last one;
        events.emit('all unzip complete', event, errCb);
    }
});
events.on('all unzip complete', function (event, errCb) {
    logger.info('all unzip complete');
    logger.warn('retrying failed unzips');
    retries.forEach(function (evt) {
        evt.retryCount += 1;
        events.emit('unzip', evt, errCb);
    });
    logger.info('------------');
    errCb.listErrors();
    retries = [];
    errCb.clearErrors();
    events.emit('start csv process', {options: event.options}, errCb);
});
events.on('start csv process', function (event, errCb) {
    var options = event.options;
    var dateIter = new DateIterator(options.holidaysFile);
    var dates = dateIter.getAllDates(options.fromDate, options.toDate);
    var counter = 1;
    var total = dates.length;
    var id = setInterval(function (dates) {
        if (dates.length === 0) {
            clearInterval(id);
        } else {
            var dt = dates.shift();
            events.emit('process csv', {
                bhavcopy: new Bhavcopy(dt, options.outputFolder),
                options: options,
                counter: counter,
                total: total
            }, errCb);
            counter += 1;
        }
    }, options.parsePause, dates);
});
events.on('process csv', function (event, errCb) {
    event.startTime = +new Date();
    logger.info("processing csv file : ", event.bhavcopy.csvfilename() + " " + event.counter + " of " + event.total);
    event.bhavcopy.parse(function (record) {
        events.emit('save record', {record: record}, errCb);
    }, function (count) {
        event.count = count;
        event.endTime = +new Date();
        events.emit('csv parse complete', event, errCb);
    }, errCb);
});
var tick = new timer.Tick('mongoSave');
events.on('save record', function (event, errCb) {
    var record = event.record;
    tick.start();
    var prices = mongodb.collection('prices');
    prices.find({symbol: record.symbol, series: record.series, date: record.date}, function (err, docs) {
        if (err) {
            errCb.reportError(new Error("MongoFindError", {err: err, record: record}));
        }
        if (docs.length > 1) {
            errCb.reportError(new Error("MongoDuplicateError", {err: "Record already exists", record: record}));
        }
        if (docs.length === 1) {
            record._id = docs[0]._id;
        }
        prices.save(record, {w: 1}, function (err, doc) {
            if (err) {
                errCb.reportError(new Error("MongoSaveError", {err: err, record: record}));
            }
            if (doc !== 1) {
                record._id = doc._id;
                //logger.info('saved: ', record._id);
            }
        });
    });
    tick.stop();
});
events.on('csv parse complete', function (event, errCb) {
    var options = event.options,
        date = event.date,
        endDate = options.toDate;
    logger.info('csv processing complete ', event.bhavcopy.csvfilename() + " " + event.count + " records processed. file " + event.counter + " of " + event.total + " took " + (event.endTime - event.startTime) + " ms");
    if (options && date >= endDate) {
        //hopefully this is the last one;
        events.emit('all csv processing complete', event, errCb);
    }
});
events.on('all csv processing complete', function (event, errCb) {
    logger.info('all csv processing complete');
    logger.info('------------');
    errCb.listErrors();
    errCb.clearErrors();
    events.emit('all complete', {}, errCb);
});

var opts = getProgramOpts(process.argv);
mongoclient.connect(opts.mongouri, function (err, db) {
    if (err) {
        mu.handleError.reportError(new Error("MongoConnectionError", {err: err}));
    }
    mongodb = db;
    logger.info('connected to mongo');
});

events.emit('start downloads', {options: opts}, mu.handleError);

events.on('all complete', function (event, errCb) {
    logger.info('ALL DONE. sleeping');
    setTimeout(function () {
        mongodb.close();
        var mongoSaveStats = tick.timers.mongoSave;
        // Display the results
        logger.info(mongoSaveStats.duration()); // total duration of all ticks
        logger.info(mongoSaveStats.min()); // minimal tick duration
        logger.info(mongoSaveStats.max()); // maximal tick duration
        logger.info(mongoSaveStats.mean()); // mean tick duration
        logger.info(mongoSaveStats.median()); // median tick duration
        logger.warn('Exiting now');
    }, 180000);
});

