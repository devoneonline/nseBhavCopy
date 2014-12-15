"use strict";
/*jshint -W081 */
/*jslint vars: true, stupid: true */

var fs = require('fs'),
    logger = require('./logger.js');

function errorCb() {
    var errors = [];
    return {
        reportError: function (err) {
            logger.error(err.toString());
            errors.push(err);
        },
        listErrors: function () {
            logger.warn(errors);
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
