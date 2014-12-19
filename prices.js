"use strict";
/*jshint -W081, -W098 */
/*jslint vars: true, stupid: true, unparam: true */

var mu = require('./miscutils.js');
var moment = require('moment');
var promise = require('when').promise;

var mongodb;

function init(db) {
    mongodb = db;
}

module.exports.init = init;

function emptyDoc() {
    return {
        identity: undefined,
        symbol: undefined,
        series: undefined,
        date: undefined,
        open: undefined,
        high: undefined,
        low: undefined,
        close: undefined,
        last: undefined,
        trdQty: undefined,
        trdVal: undefined,
        transactionCosts: undefined,
        yest: {
            date: undefined,
            open: undefined,
            high: undefined,
            close: undefined,
            change: undefined,
            pctChg: undefined
        },
        weekAgo: {
            date: undefined,
            open: undefined,
            high: undefined,
            low: undefined,
            close: undefined,
            change: undefined,
            pctChg: undefined
        },
        monthAgo: {
            date: undefined,
            open: undefined,
            high: undefined,
            low: undefined,
            close: undefined,
            change: undefined,
            pctChg: undefined
        },
        quarterAgo: {
            date: undefined,
            open: undefined,
            high: undefined,
            low: undefined,
            close: undefined,
            change: undefined,
            pctChg: undefined
        },
        sixMonthsAgo: {
            date: undefined,
            open: undefined,
            high: undefined,
            low: undefined,
            close: undefined,
            change: undefined,
            pctChg: undefined
        },
        yearAgo: {
            date: undefined,
            open: undefined,
            high: undefined,
            low: undefined,
            close: undefined,
            change: undefined,
            pctChg: undefined
        },
        threeYearsAgo: {
            date: undefined,
            open: undefined,
            high: undefined,
            low: undefined,
            close: undefined,
            change: undefined,
            pctChg: undefined
        },
        fiveYearsAgo: {
            date: undefined,
            open: undefined,
            high: undefined,
            low: undefined,
            close: undefined,
            change: undefined,
            pctChg: undefined
        },
        highsAndLows: {
            '3m': {
                high: undefined,
                highDate: undefined,
                low: undefined,
                lowDate: undefined
            },
            '6m': {
                high: undefined,
                highDate: undefined,
                low: undefined,
                lowDate: undefined
            },
            '1y': {
                high: undefined,
                highDate: undefined,
                low: undefined,
                lowDate: undefined
            },
            '3y': {
                high: undefined,
                highDate: undefined,
                low: undefined,
                lowDate: undefined
            },
            '5y': {
                high: undefined,
                highDate: undefined,
                low: undefined,
                lowDate: undefined
            },
            'allTime': {
                high: undefined,
                highDate: undefined,
                low: undefined,
                lowDate: undefined
            }
        }
    };
}

function savePrice(collection, data, cdt) {
    return promise(function (resolve, reject, notify) {
        var price = emptyDoc();
        price.symbol = data.SYMBOL;
        price.series = data.SERIES;
        price.date = mu.hackDateForTZ(new Date(Date.parse(data.TIMESTAMP)));
        price.identity = price.symbol + ':' + price.series + ':' + moment(price.date).format('YYYYMMDD');
        price.open = Number(data.OPEN);
        price.high = Number(data.HIGH);
        price.low = Number(data.LOW);
        price.close = Number(data.CLOSE);
        price.last = Number(data.LAST);
        price.trdQty = Number(data.TOTTRDQTY);
        price.trdVal = Number(data.TOTTRDVAL);
        price.transactionCosts = (data.HIGH - data.LOW) / data.CLOSE;
        price.yest.date = cdt.prevDate;
        price.weekAgo.date = cdt.prevWeek;
        price.monthAgo.date = cdt.prevMonth;
        price.quarterAgo.date = cdt.prevQuarter;
        price.sixMonthsAgo.date = cdt.prevHalfYear;
        price.yearAgo.date = cdt.prevYear;
        price.threeYearsAgo.date = cdt.prev3Year;
        price.fiveYearsAgo.date = cdt.prev5Year;

        var prices = mongodb.collection(collection);
        prices.findAndModify({
            date: price.date,
            symbol: price.symbol,
            series: price.series
        }, [['_id', 'asc']], price, {upsert: true}, function (err, doc) {
            if (err) {
                reject(new Error('MongoSaveError: ' + JSON.stringify({err: err, id: price.identity})));
            } else {
                price._id = doc._id;
            }
            resolve(price);
        });
    });
}
module.exports.savePrice = savePrice;