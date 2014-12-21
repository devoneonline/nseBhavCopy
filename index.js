"use strict";
/*jshint -W081, -W098*/
/*jslint vars: true, stupid: true, unparam: true */

var getProgramOpts = require('./options.js').getProgramOpts;
var Calendar = require('./calendar.js').Calendar;
var nextDate = require('./calendar.js').nextDate;
var bhavcopy2 = require('./bhavcopy2.js');
var prices = require('./prices.js');
var analyzer = require('./analyze.js');
var handleError = require('./miscutils.js').handleError;
var newErrorObj = require('./miscutils.js').newErrorObj;
var stringify = require('./miscutils.js').stringify;
var logger = require('./logger.js');
var mongoclient = require('mongodb').MongoClient;
var moment = require('moment');
var promise = require('when').promise;
var unfold = require('when').unfold;
var settle = require('when').settle;
var when = require('when');

//TODO: hate globals but dont know good way to get rid of this yet
var mongodb;

function init(params) {
    params.calendar = new Calendar(params.holidaysFile, params.fromDate, params.toDate);
    params.counter = 1;
    params.total = moment(params.toDate).diff(moment(params.fromDate), 'days') + 1;
    return when.resolve(params);
}

function connect(params) {
    return promise(function (resolve, reject, notify) {
        mongoclient.connect(params.mongouri, function (err, db) {
            if (err) {
                reject(newErrorObj('MongoConnectionError: ', {err: err}));
            }
            mongodb = db;
            prices.init(db);
            analyzer.init(db);
            logger.info('connected to mongo');
            resolve(params);
        });
    });
}

function forAllRecords(params, fnToCall, counterToUpdate) {
    return promise(function (resolve, reject, notify) {
        params[counterToUpdate] = 0;
        params.records2 = [];
        settle(params.records.map(function (record) {
            return fnToCall(params.collection, record, params.cdt);
        })).then(function (descriptors) {
            descriptors.forEach(function (descriptor) {
                if (descriptor.state === 'fulfilled') {
                    params[counterToUpdate] += 1;
                    params.records2.push(descriptor.value);
                } else {
                    params.errors.push(descriptor.reason.toString().replace(/\"/g, ''));
                }
            });
        }).finally(function () {
            params.records = params.records2;
            params.records2 = [];
            delete params.records2;
            if (params[counterToUpdate] === 1) {
                reject(params);
            } else {
                resolve(params);
            }
        }).done();
    });
}

function download(params) {
    params.downloadStartTime = moment();
    var ret;
    if (params.actionsToPerform.indexOf('all') > -1 || params.actionsToPerform.indexOf('download') > -1) {
        ret = when.resolve(bhavcopy2.download(params));
    } else {
        params.zipFileName = params.outputFolder + '/' + params.fdt + '.csv.zip';
        params.uri = 'skipped';
        ret = when.resolve(params);
    }
    return ret;
}

function unzip(params) {
    params.unzipStartTime = moment();
    var ret;
    if (params.actionsToPerform.indexOf('all') > -1 || params.actionsToPerform.indexOf('unzip') > -1) {
        ret = when.resolve(bhavcopy2.unzip(params));
    } else {
        params.csvFileName = params.outputFolder + '/' + params.fdt + '.csv';
        params.zipFileName = 'skipped';
        ret = when.resolve(params);
    }
    return ret;
}

function parse(params) {
    params.parseStartTime = moment();
    return bhavcopy2.parse(params);
}
function save(params) {
    params.saveStartTime = moment();
    return forAllRecords(params, prices.savePrice, 'totalDocs');
}

function analyze(params) {
    params.analyzeStartTime = moment();
    return forAllRecords(params, analyzer.analyzeTicker, 'totalTickers');
}

function progress(params, actions, action, status, obj, msg) {
    var formatstr = 'YYYY.MM.DD.hh.mm.ss.SSS';
    params[action + 'EndTime'] = moment();
    actions.push({
        action: action,
        status: status,
        startTime: params[action + 'StartTime'].format(formatstr),
        endTime: params[action + 'EndTime'].format(formatstr),
        errors: params.errors
    });
    if (params.errors && params.errors.length > 0) {
        logger.warn(stringify({errors: params.errors}));
        status = status + ' with errors';
    }
    params.errors = [];
    logger.info(params.fdt + ':(' + params.counter + ' of ' + params.total + '): ' + action + ': ' + obj + ': ' + msg + ': ' + status + ': took ' + params[action + 'EndTime'].diff(params[action + 'StartTime']) + ' ms');
}

function onError(params, actions, e) {
    handleError.reportError(e);
    logger.warn(stringify(actions));
    logger.warn(stringify(params));
    when.resolve(e);
}

function doForEveryDate(params) {
    params.allStartTime = moment();
    return promise(function (resolve, reject, notify) {
        var actions = [];
        if (params.cdt.isHoliday) {
            progress(params, actions, 'all', 'skipped', '', 'isWeekend: ' + params.cdt.isWeekend + ', isHoliday: ' + params.cdt.isHoliday);
            resolve(params);
        } else {
            download(params)
                .tap(function () {
                    progress(params, actions, 'download', 'completed', params.uri, 'zipfilesize: ' + params.zipFileSize + ' bytes');
                })
                .then(unzip)
                .tap(function () {
                    progress(params, actions, 'unzip', 'completed', params.zipFileName, 'csvfilesize: ' + params.csvFileSize + ' bytes');
                })
                .then(parse)
                .tap(function () {
                    progress(params, actions, 'parse', 'completed', params.csvFileName, 'csvrecords: ' + params.totalRecords + ' lines');
                })
                .then(save)
                .tap(function () {
                    progress(params, actions, 'save', 'completed', params.db + '/' + params.collection, 'mongodocs: ' + params.totalDocs + ' docs');
                })
                .then(analyze)
                .tap(function () {
                    progress(params, actions, 'analyze', 'completed', params.db + '/' + params.collection, 'tickers: ' + params.totalTickers + ' docs');
                })
                .catch(function (e) {
                    onError(params, actions, e);
                })
                .finally(function () {
                    progress(params, actions, 'all', 'completed', '', params.totalRecords + ' lines read, ' + params.totalDocs + ' docs saved, ' + params.totalTickers + ' tickers analyzed, ' + (params.totalDocs - params.totalTickers) + ' failed to analyze');
                    params.records = [];
                    params.errors = [];
                    actions = [];
                    handleError.listErrors();
                    handleError.clearErrors();
                    delete params.records;
                    delete params.errors;
                    delete params.fdt;
                    delete params.cdt;
                    resolve(params);
                })
                .done();
        }
    });
}

function nextDateToProcess(opts) {
    return function (date) {
        var cdt = opts.calendar.date(date);
        var paramsForHandler = {
            date: cdt.date,
            actionsToPerform: opts.actionsToPerform,
            outputFolder: opts.outputFolder,
            collection: opts.mongocollection,
            db: opts.mongodb,
            fdt: moment(cdt.date).format('YYYYMMDD'),
            cdt: cdt,
            counter: opts.counter,
            total: opts.total
        };
        opts.counter += 1;
        return [paramsForHandler, nextDate(date)];
    };
}

function until(toDate) {
    return function (date) {
        return moment(toDate).diff(moment(date), 'days') < 0;
    };
}

function shutDown() {
    mongodb.close();
    logger.info('ALL DONE.');
    logger.warn('Exiting now');
}

function doIt(opts) {
    var startTime = moment();
    return unfold(nextDateToProcess(opts), until(opts.toDate), doForEveryDate, opts.fromDate)
        .then(function () {
            var endTime = moment();
            logger.info('everything took ' + endTime.diff(startTime) + ' ms');
        });
}

init(getProgramOpts(process.argv))
    .then(connect)
    .then(doIt)
    .catch(function (e) {
        handleError.reportError(e);
    })
    .finally(shutDown)
    .done();

