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
    return date1.getDate() === date2.getDate() && date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
}
module.exports.areEqual = isSameDate;

var dateIterator = function (holidaysFile) {
    var self = this;
    self.holidaysDts = fs.readFileSync(holidaysFile).toString().split("\n").map(function (date) {
        return hackDateForTZ(new Date(Date.parse(date)));
    });
    self.iteratedUntil = 0;
    self.iteratedSince = self.holidaysDts.length;
};

dateIterator.prototype._next = function (date) {
    var self = this;
    var dt = new Date(date);
    var nextdate = hackDateForTZ(new Date(dt.setDate(dt.getDate() + 1)));
    var isHoliday = false;
    var i = 0;
    for (i = self.iteratedUntil; i < self.holidaysDts.length && !isHoliday && self.holidaysDts[i] <= nextdate; i += 1) {
        isHoliday = isSameDate(self.holidaysDts[i], nextdate);
    }
    self.iteratedUntil = i;
    return isHoliday ? this._next(nextdate) : nextdate;
};

dateIterator.prototype.isHoliday = function (date) {
    var self = this;
    var ret = false;
    var i = 0;
    for (i = 0; i < self.holidaysDts.length && !ret; i += 1) {
        ret = isSameDate(self.holidaysDts[i], date);
    }
    return ret;
};

dateIterator.prototype._prev = function (date) {
    var self = this;
    var dt = new Date(date);
    var prevdate = hackDateForTZ(new Date(dt.setDate(dt.getDate() - 1)));
    var isHoliday = false;
    var i = 0;
    for (i = self.iteratedSince; i > 0 && !isHoliday && self.holidaysDts[i] >= prevdate; i -= 1) {
        isHoliday = isSameDate(self.holidaysDts[i], prevdate);
    }
    self.iteratedSince = i;
    return isHoliday ? this._prev(prevdate) : prevdate;
};

dateIterator.prototype.getAllDates = function (fromDate, toDate) {
    var self = this;
    var endDate = new Date(toDate);
    if (self.isHoliday(endDate)) {
        endDate = self._prev(endDate);
    }
    var startDate = new Date(fromDate);
    var date = startDate;
    var datesQueue = [];
    while (date <= endDate) {
        datesQueue.push(date);
        date = self._next(date);
    }
    return datesQueue;
};

module.exports.dateIterator = dateIterator;