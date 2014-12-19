"use strict";
/*jshint -W081 */
/*jslint vars: true, stupid: true */

var logger = require('./logger.js');
var c = require('./calendar.js');
var moment = require('moment');

function errorCb() {
    var errors = [];
    return {
        reportError: function (err) {
            logger.error(err.toString());
            errors.push(err);
        },
        listErrors: function () {
            if (errors.length > 0) {
                logger.info('------------');
                logger.warn(errors);
            }
        },
        clearErrors: function () {
            errors = [];
        }
    };
}
module.exports.handleError = errorCb();

function hackDateForTZ(date) {
    if (date) {
        date.setHours(5, 30, 0, 0);
    }
    return date;
}
module.exports.hackDateForTZ = hackDateForTZ;

function isSameDate(date1, date2) {
    return date1 && date2 && date1.getDate() === date2.getDate() && date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
}
module.exports.areEqual = isSameDate;

function deepFreeze(o) {
    Object.freeze(o);
    var oIsFunction = typeof o === "function";
    var hasOwnProp = Object.prototype.hasOwnProperty;
    Object.getOwnPropertyNames(o).forEach(function (prop) {
        if (hasOwnProp.call(o, prop) && (oIsFunction ? prop !== 'caller' && prop !== 'callee' && prop !== 'arguments' : true) && o[prop] !== null && (typeof o[prop] === "object" || typeof o[prop] === "function") && !Object.isFrozen(o[prop])) {
            deepFreeze(o[prop]);
        }
    });
    return o;
}

module.exports.deepFreeze = deepFreeze;

function doForEveryDate(calendar, fromDate, toDate, pause, eventRaiser) {
    var currDate = fromDate;
    var counter = 1;
    var total = moment(toDate).diff(moment(fromDate), 'days');
    var id = setInterval(function () {
        var dt = calendar.date(currDate);
        if (counter <= total) {
            if (dt.isWorkingDay) {
                eventRaiser(dt.date, counter, total);
            } else {
                logger.info('skipping holiday ' + moment(dt.date).format('YYYYMMDD') + ' isWeekend: ' + dt.isWeekend + ' isHoliday: ' + dt.isHoliday);
            }
        } else {
            clearInterval(id);
        }
        currDate = c.nextDate(currDate);
        counter += 1;
    }, pause);
}

module.exports.doForEveryDate = doForEveryDate;

function hackedNewDate(y, m, d) {
    return hackDateForTZ(new Date(y, m, d));
}

module.exports.hackedNewDate = hackedNewDate;
