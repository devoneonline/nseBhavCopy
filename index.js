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
var logger = require('./logger.js');
var mongoclient = require('mongodb').MongoClient;
var moment = require('moment');
var promise = require('when').promise;
var unfold = require('when').unfold;
var settle = require('when').settle;

var opts = getProgramOpts(process.argv);
var calendar = new Calendar(opts.holidaysFile, opts.fromDate, opts.toDate);
var total = moment(opts.toDate).diff(moment(opts.fromDate), 'days') + 1;
var counter = 1;

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
                    params.errors.push(descriptor.reason);
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
        logger.warn(JSON.stringify(params.errors));
        status = status + ' with errors';
    }
    params.errors = [];
    logger.info(params.fdt + ':(' + params.counter + ' of ' + params.total + '): ' + action + ': ' +  obj +  ': ' + msg + ': ' + status + ': took ' + params[action + 'EndTime'].diff(params[action + 'StartTime']) + ' ms');
}

function onError(params, actions, e) {
    return promise(function (resolve, reject, notify) {
        handleError.reportError(e);
        logger.warn(JSON.stringify(actions));
        logger.warn(JSON.stringify(params));
        resolve(e);
    });
}

function doForEveryDate(params) {
    params.allStartTime = moment();
    var actions = [];
    return promise(function (resolve, reject, notify) {
        if (params.cdt.isHoliday) {
            progress(params, actions, 'all', 'skipped', '', 'isWeekend: ' + params.cdt.isWeekend + ', isHoliday: ' + params.cdt.isHoliday);
            resolve(params);
        } else {
            bhavcopy2.download(params)
                .tap(function () {
                    progress(params, actions, 'download', 'completed', params.uri, 'zipfilesize: ' + params.zipFileSize + ' bytes');
                })
                .then(bhavcopy2.unzip)
                .tap(function () {
                    progress(params, actions, 'unzip', 'completed', params.zipFileName, 'csvfilesize: ' + params.csvFileSize + ' bytes');
                })
                .then(bhavcopy2.parse)
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
                    progress(params, actions, 'all', 'completed', '', '');
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


function nextDateToProcess(date) {
    var cdt = calendar.date(date);
    var params = {
        date: cdt.date,
        outputFolder: opts.outputFolder,
        db: opts.mongodb,
        collection: opts.mongocollection,
        fdt: moment(cdt.date).format('YYYYMMDD'),
        cdt: calendar.date(cdt.date),
        counter: counter,
        total: total
    };
    counter += 1;
    return [params, nextDate(date)];
}

var toDatem = moment(opts.toDate);
function untilToDate(date) {
    return toDatem.diff(moment(date), 'days') < 0;
}

var mongodb;
mongoclient.connect(opts.mongouri, function (err, db) {
    if (err) {
        handleError.reportError(new Error('MongoConnectionError: ' + JSON.stringify({err: err})));
    }
    mongodb = db;
    prices.init(db);
    analyzer.init(db);
    logger.info('connected to mongo');
});

var startTime = moment();
function shutDown() {
    var endTime = moment();
    logger.info(total + ' dates took ' + endTime.diff(startTime) + ' ms');
    setTimeout(function () {
        logger.info('ALL DONE. sleeping');
        mongodb.close();
        logger.warn('Exiting now');
    }, 1000);
}

unfold(nextDateToProcess, untilToDate, doForEveryDate, opts.fromDate).finally(shutDown).done();

