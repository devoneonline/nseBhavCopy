"use strict";
/*jshint -W081 */
/*jslint vars: true, stupid: true */

var mu = require('./miscutils.js');
var when = require('when');

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

function analyzeTicker(collection, price, cdt) {
    var promise = when.promise(function (resolve, reject, notify) {
        var prices = mongodb.collection(collection);
        prices.find({
            $or: [{date: cdt.prevDate}, {date: cdt.prevWeek}, {date: cdt.prevMonth}, {date: cdt.prevQuarter}, {date: cdt.prevHalfYear}, {date: cdt.prevYear}, {date: cdt.prev3Year}, {date: cdt.prev5Year}],
            symbol: price.symbol,
            series: price.series
        }).toArray(function (err, docs) {
            var missing = 'yest,weekAgo,monthAgo,quarterAgo,sixMonthsAgo,yearAgo,threeYearsAgo,fiveYearsAgo';
            if (err) {
                reject(new Error('MongoHistoricQueryError: ' + JSON.stringify({
                    err: err,
                    id: price.identity
                })));
            }
            if (docs) {
                docs.forEach(function (doc) {
                    if (mu.areEqual(doc.date, cdt.prevDate)) {
                        price.yest = getPrevDoc(price, doc);
                        missing = missing.replace('yest,', '');
                    } else if (mu.areEqual(doc.date, cdt.prevWeek)) {
                        price.weekAgo = getPrevDoc(price, doc);
                        missing = missing.replace('weekAgo,', '');
                    } else if (mu.areEqual(doc.date, cdt.prevMonth)) {
                        price.monthAgo = getPrevDoc(price, doc);
                        missing = missing.replace('monthAgo,', '');
                    } else if (mu.areEqual(doc.date, cdt.prevQuarter)) {
                        price.quarterAgo = getPrevDoc(price, doc);
                        missing = missing.replace('quarterAgo,', '');
                    } else if (mu.areEqual(doc.date, cdt.prevHalfYear)) {
                        price.sixMonthsAgo = getPrevDoc(price, doc);
                        missing = missing.replace('sixMonthsAgo,', '');
                    } else if (mu.areEqual(doc.date, cdt.prevYear)) {
                        price.yearAgo = getPrevDoc(price, doc);
                        missing = missing.replace('yearAgo,', '');
                    } else if (mu.areEqual(doc.date, cdt.prev3Year)) {
                        price.threeYearsAgo = getPrevDoc(price, doc);
                        missing = missing.replace('threeYearsAgo,', '');
                    } else if (mu.areEqual(doc.date, cdt.prev5Year)) {
                        price.fiveYearsAgo = getPrevDoc(price, doc);
                        missing = missing.replace('fiveYearsAgo,', '');
                    }
                });
                if (missing !== '') {
                    price.missing = missing;
                }
                prices.findAndModify({
                    date: price.date,
                    symbol: price.symbol,
                    series: price.series
                }, [['_id', 'asc']], price, {upsert: true}, function (err, doc) {
                    if (err) {
                        reject(new Error('MongoUpdateTickerError: ' + JSON.stringify({
                            err: err,
                            id: price.identity
                        })));
                    }
                    resolve(price);
                });
            } else {
                reject(new Error('MongoHistoricQueryError: ' + JSON.stringify({
                    err: 'no documents found',
                    id: price.identity
                })));
            }
        });
    });
    return promise;
}
module.exports.analyzeTicker = analyzeTicker;
