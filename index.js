"use strict";
/*jshint -W081 */
/*jslint vars: true, stupid: true */

var getProgramOpts = require('./options.js').getProgramOpts;
var Calendar = require('./calendar.js').Calendar;
var mongoclient = require('mongodb').MongoClient;
var mu = require('./miscutils.js');
var events = new (require('events').EventEmitter)();
var moment = require('moment');
var logger = require('./logger.js');
var Bhavcopy = require('./bhavcopy.js').Bhavcopy;

var retries = [];
var mongodb;

var opts = getProgramOpts(process.argv);
var calendar = new Calendar(opts.holidaysFile, opts.fromDate, opts.toDate);

mongoclient.connect(opts.mongouri, function (err, db) {
    if (err) {
        mu.handleError.reportError(new Error('MongoConnectionError: ' + JSON.stringify({err: err})));
    }
    mongodb = db;
    logger.info('connected to mongo');
});

events.on('start downloads', function (event, errCb) {
    var options = event.options;
    mu.doForEveryDate(calendar, options.fromDate, options.toDate, options.downloadPause, function (dt, counter, total) {
        events.emit('download for date', {
            bhavcopy: new Bhavcopy(dt, options.outputFolder),
            options: options,
            counter: counter,
            total: total,
            retryCount: 0
        }, errCb);
    });
});
events.on('download for date', function (event, errCb) {
    var bhavcopy = event.bhavcopy,
        retryCount = event.retryCount;
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
    logger.info('download complete ', event.bhavcopy.zipfilename(), ' ' + event.counter + ' of ' + event.total + ' took ' + (event.endTime - event.startTime) + ' ms');
    if (event.counter === event.total) {
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
    errCb.listErrors();
    retries = [];
    errCb.clearErrors();
    events.emit('start unzip', {options: event.options}, errCb);
});
events.on('start unzip', function (event, errCb) {
    var options = event.options;
    mu.doForEveryDate(calendar, options.fromDate, options.toDate, options.unzipPause, function (dt, counter, total) {
        events.emit('unzip', {
            bhavcopy: new Bhavcopy(dt, options.outputFolder),
            options: options,
            counter: counter,
            total: total,
            retryCount: 0
        }, errCb);
    });
});
events.on('unzip', function (event, errCb) {
    if (event.retryCount <= 1) {
        event.startTime = +new Date();
        var unzipped = event.bhavcopy.unzip(errCb);
        event.endTime = +new Date();
        logger.info('unzipped ' + event.bhavcopy.zipfilename() + ' ' + event.counter + ' of ' + event.total + ' took ' + (event.endTime - event.startTime) + ' ms');
        if (unzipped.length === 0) {
            retries.push(event);
        } else {
            event.unzipped = unzipped[0];
        }
        if (event.counter === event.total) {
            //hopefully this is the last one;
            events.emit('all unzip complete', event, errCb);
        }
    }
});
events.on('all unzip complete', function (event, errCb) {
    logger.info('all unzip complete');
    logger.warn('retrying failed unzips');
    retries.forEach(function (evt) {
        evt.retryCount += 1;
        events.emit('unzip', evt, errCb);
    });
    errCb.listErrors();
    retries = [];
    errCb.clearErrors();
    events.emit('start csv process', {options: event.options}, errCb);
});
events.on('start csv process', function (event, errCb) {
    var options = event.options;
    mu.doForEveryDate(calendar, options.fromDate, options.toDate, options.unzipPause, function (dt, counter, total) {
        events.emit('process csv', {
            bhavcopy: new Bhavcopy(dt, options.outputFolder),
            options: options,
            counter: counter,
            total: total
        }, errCb);
    });
});
events.on('process csv', function (event, errCb) {
    event.startTime = +new Date();
    event.bhavcopy.parse(function (record) {
        events.emit('save record', {date: event.date, record: record, options: event.options}, errCb);
    }, function (count) {
        event.count = count;
        event.endTime = +new Date();
        logger.info('csv processing complete ' + event.bhavcopy.csvfilename() + '. ' + event.count + ' records processed. file ' + event.counter + ' of ' + event.total + ' took ' + (event.endTime - event.startTime) + ' ms');
        events.emit('csv parse complete', event, errCb);
    }, errCb);
});
events.on('save record', function (event, errCb) {
    var record = event.record;
    var prices = mongodb.collection('prices');
    prices.findAndModify({
        date: record.date,
        symbol: record.symbol,
        series: record.series
    }, [['_id', 'asc']], record, {upsert: true}, function (err, doc) {
        if (err) {
            errCb.reportError(new Error('MongoSaveError: ' + JSON.stringify({err: err, record: record})));
        } else {
            record._id = doc._id;
        }
    });
});
events.on('csv parse complete', function (event, errCb) {
    if (event.counter === event.total) {
        //hopefully this is the last one;
        events.emit('all csv processing complete', event, errCb);
    }
});
events.on('all csv processing complete', function (event, errCb) {
    logger.info('all csv processing complete');
    errCb.listErrors();
    errCb.clearErrors();
    events.emit('start analysis', {options: event.options}, errCb);
});

events.on('start analysis', function (event, errCb) {
    var options = event.options;
    mu.doForEveryDate(calendar, options.fromDate, options.toDate, options.analysisPause, function (dt, counter, total) {
        events.emit('analyze date', {
            date: dt,
            options: options,
            counter: counter,
            total: total,
            retryCount: 0
        }, errCb);
    });
});
events.on('analyze date', function (event, errCb) {
    var dt = event.date;
    event.startTime = +new Date();
    var prices = mongodb.collection('prices');
    prices.find({date: dt}, {sort: 'symbol'}).toArray(function (err, docs) {
        if (err) {
            errCb.reportError(new Error('MongoQueryError: ' + JSON.stringify({err: err, date: dt})));
        }
        if (docs) {
            var total = docs.length;
            var counter = 1;
            var cdt = calendar.date(event.date);
            docs.forEach(function (doc) {
                events.emit('analyze ticker for date', {
                    date: cdt,
                    options: event.options,
                    counter: counter,
                    total: total,
                    dateCounter: event.counter,
                    dateTotal: event.total,
                    dateStartTime: event.startTime,
                    ticker: doc
                }, errCb);
                counter += 1;
            });
        } else {
            errCb.reportError(new Error('MongoQueryError: ' + JSON.stringify({
                err: 'did not find any documents',
                date: dt
            })));
        }
        //event.endTime = +new Date();
        //logger.info('analyze date ' + dt + ' started.' + total + ' tickers to analyze further. ' + event.counter + ' of ' + event.total + ' took ' + (event.endTime - event.startTime) + ' ms');
    });
    //done;
});
function getPrevDoc(ticker, doc) {
    return {
        date: doc.date,
        open: doc.open,
        high: doc.high,
        low: doc.low,
        close: doc.close,
        change: ticker.close - doc.close,
        pctChg: (ticker.close - doc.close) / doc.close
    };
}
events.on('analyze ticker for date', function (event, errCb) {
    var cdt = event.date;
    var ticker = event.ticker;
    event.startTime = +new Date();
    var prices = mongodb.collection('prices');
    prices.find({
        $or: [{date: cdt.prevDate}, {date: cdt.prevWeek}, {date: cdt.prevMonth}, {date: cdt.prevQuarter}, {date: cdt.prevHalfYear}, {date: cdt.prevYear}],
        symbol: ticker.symbol,
        series: ticker.series
    }).toArray(function (err, docs) {
        var missing = 'yest,weekAgo,monthAgo,quarterAgo,sixMonthsAgo,yearAgo,';
        if (err) {
            errCb.reportError(new Error('MongoHistoricQueryError: ' + JSON.stringify({
                err: err,
                date: cdt.date,
                symbol: ticker.symbol,
                series: ticker.series
            })));
        }
        if (docs) {
            docs.forEach(function (doc) {
                if (mu.areEqual(doc.date, cdt.prevDate)) {
                    ticker.yest = getPrevDoc(ticker, doc);
                    missing = missing.replace('yest,', '');
                } else if (mu.areEqual(doc.date, cdt.prevWeek)) {
                    ticker.weekAgo = getPrevDoc(ticker, doc);
                    missing = missing.replace('weekAgo,', '');
                } else if (mu.areEqual(doc.date, cdt.prevMonth)) {
                    ticker.monthAgo = getPrevDoc(ticker, doc);
                    missing = missing.replace('monthAgo,', '');
                } else if (mu.areEqual(doc.date, cdt.prevQuarter)) {
                    ticker.quarterAgo = getPrevDoc(ticker, doc);
                    missing = missing.replace('quarterAgo,', '');
                } else if (mu.areEqual(doc.date, cdt.prevHalfYear)) {
                    ticker.sixMonthsAgo = getPrevDoc(ticker, doc);
                    missing = missing.replace('sixMonthsAgo,', '');
                } else if (mu.areEqual(doc.date, cdt.prevYear)) {
                    ticker.yearAgo = getPrevDoc(ticker, doc);
                    missing = missing.replace('yearAgo,', '');
                }
            });
            if (missing !== '') {
                ticker.missing = missing;
            }
            prices.findAndModify({
                date: cdt.date,
                symbol: ticker.symbol,
                series: ticker.series
            }, [['_id', 'asc']], ticker, {upsert: true}, function (err, doc) {
                if (err) {
                    errCb.reportError(new Error('MongoUpdateTickerError: ' + JSON.stringify({
                        err: err,
                        record: ticker
                    })));
                }
            });
            event.endTime = +new Date();
            //logger.info('analyze ticker ' + moment(cdt.date).format('YYYYMMDD') + ':' + ticker.symbol + ':' + ticker.series + ' completed. missing ' + missing + '. ' + event.counter + ' of ' + event.total + ' took ' + (event.endTime - event.startTime) + ' ms');
        } else {
            errCb.reportError(new Error('MongoHistoricQueryError: ' + JSON.stringify({
                err: 'no documents found',
                date: cdt.date,
                symbol: ticker.symbol,
                series: ticker.series
            })));
        }
    });
    if (event.counter === event.total) {
        events.emit('analyze date complete', {
            date: cdt.date,
            options: event.options,
            startTime: event.dateStartTime,
            endTime: +new Date(),
            counter: event.dateCounter,
            total: event.dateTotal
        }, errCb);
    }
});
events.on('analyze date complete', function (event, errCb) {
    logger.info('analyze date ' + moment(event.date).format('YYYYMMDD') + ' completed. ' + event.counter + ' of ' + event.total + ' took ' + (event.endTime - event.startTime) + ' ms');
    errCb.listErrors();
    errCb.clearErrors();
    if (event.counter === event.total) {
        events.emit('all analyze date complete', event, errCb);
    }
});
events.on('all analyze date complete', function (event, errCb) {
    logger.info('all analysis complete');
    errCb.listErrors();
    errCb.clearErrors();
    events.emit('all complete', {options: event.options}, errCb);
});

events.on('all complete', function (event, errCb) {
    logger.info('ALL DONE. sleeping');
    setTimeout(function () {
        mongodb.close();
        logger.warn('Exiting now');
    }, 300000);
});

events.emit('start analysis', {options: opts}, mu.handleError);

