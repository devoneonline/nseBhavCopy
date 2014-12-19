"use strict";
/*jshint -W081, -W098*/
/*jslint vars: true, stupid: true, unparam: true */

var mu = require('./miscutils.js');
var promise = require('when').promise;
var settle = require('when').settle;
var moment = require('moment');

var mongodb;

function init(db) {
    mongodb = db;
}

module.exports.init = init;

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

function analyzeTickerForPrevDate(collection, price, prevDate, tagToUpdate) {
    return promise(function (resolve, reject, notify) {
        var prices = mongodb.collection(collection);
        prices.findOne({
            date: prevDate,
            symbol: price.symbol,
            series: price.series
        }, {fields: {date: 1, open: 1, high: 1, low: 1, close: 1}}, function (err, doc) {
            if (err || doc === null || doc === undefined) {
                reject(mu.newErrorObj(err, {
                    couldNotFind: tagToUpdate + ':' + moment(prevDate).format('YYYYMMDD')
                }));
            } else {
                price.missing = price.missing.replace(tagToUpdate + ',', '');
                price[tagToUpdate] = getPrevDoc(price, doc);
                resolve(price);
            }
        });
    });
}

function analyzeTicker(collection, price, cdt) {
    return promise(function (resolve, reject, notify) {
        price.missing = 'yest,weekAgo,monthAgo,quarterAgo,sixMonthsAgo,yearAgo,threeYearsAgo,fiveYearsAgo';
        var prevDates = [{date: cdt.prevDate, tagToUpdate: 'yest'},
            {date: cdt.prevWeek, tagToUpdate: 'weekAgo'},
            {date: cdt.prevMonth, tagToUpdate: 'monthAgo'},
            {date: cdt.prevQuarter, tagToUpdate: 'quarterAgo'},
            {date: cdt.prevHalfYear, tagToUpdate: 'sixMonthsAgo'},
            {date: cdt.prevYear, tagToUpdate: 'yearAgo'},
            {date: cdt.prev3Year, tagToUpdate: 'threeYearsAgo'},
            {date: cdt.prev5Year, tagToUpdate: 'fiveYearsAgo'}];
        settle(prevDates.map(function (pd) {
            return analyzeTickerForPrevDate(collection, price, pd.date, pd.tagToUpdate);
        })).then(function (descriptors) {
            var errcount = 0;
            var reasons = [];
            descriptors.forEach(function (descriptor) {
                if (descriptor.state === 'rejected') {
                    errcount += 1;
                    reasons.push(descriptor.reason.toString().replace('Error: ', '').replace('couldNotFind:', '').replace(/\"/g, ''));
                }
            });
            if (errcount >= 7) {
                reject(mu.newErrorObj(price.identity, {couldNotFind: reasons}));
            } else {
                var prices = mongodb.collection(collection);
                prices.findAndModify({
                    date: price.date,
                    symbol: price.symbol,
                    series: price.series
                }, [['_id', 'asc']], price, {upsert: true}, function (err, doc) {
                    if (err) {
                        reject(mu.newErrorObj('MongoUpdateTickerError: ', {err: err, id: price.identity}));
                    }
                    resolve(price);
                });
            }
        }).done();
    });
}
module.exports.analyzeTicker = analyzeTicker;
