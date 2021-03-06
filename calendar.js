"use strict";
/*jshint -W081 */
/*jslint vars: true, stupid: true */

var fs = require('fs');
var mu = require('./miscutils.js');
var moment = require('moment');

var weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var daysToAddForThisWeekStart = [1, 0, -1, -2, -3, -4, -5, -6];
var daysToAddForThisWeekEnd = [6, 5, 4, 3, 2, 1, 0, -1];
var daysToAddForNextWeekStart = [8, 7, 6, 5, 4, 3, 2];
var daysToAddForPrevWeekEnd = [2, 3, 4, 5, 6, 7, 8];

function dayOfWeek(date) {
    return weekdays[date.getDay()];
}

function isWeekend(date) {
    return (date.getDay() === 0 || date.getDay() === 6);
}

function isWeekday(date) {
    return !isWeekend(date);
}

function nextDate(date) {
    return mu.hackDateForTZ(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1));
}

module.exports.nextDate = nextDate;

function prevDate(date) {
    return mu.hackDateForTZ(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1));
}

function prevWeek(date) {
    return mu.hackDateForTZ(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7));
}

function prevMonth(date) {
    return mu.hackDateForTZ(new Date(date.getFullYear(), date.getMonth() - 1, date.getDate()));
}

function prevQuarter(date) {
    return mu.hackDateForTZ(new Date(date.getFullYear(), date.getMonth() - 3, date.getDate()));
}

function prevHalfYr(date) {
    return mu.hackDateForTZ(new Date(date.getFullYear(), date.getMonth() - 6, date.getDate()));
}

function prevYear(date) {
    return mu.hackDateForTZ(new Date(date.getFullYear() - 1, date.getMonth(), date.getDate()));
}

function prev3Year(date) {
    return mu.hackDateForTZ(new Date(date.getFullYear() - 3, date.getMonth(), date.getDate()));
}

function prev5Year(date) {
    return mu.hackDateForTZ(new Date(date.getFullYear() - 5, date.getMonth(), date.getDate()));
}

function isFirstDayOfWeek(isHoliday, date, prevDate) {
    return !isHoliday && moment(date).format("W") > moment(prevDate).format("W");
}

function isLastDayOfWeek(isHoliday, date, nextDate) {
    return !isHoliday && moment(date).format("W") < moment(nextDate).format("W");
}
function isFirstDayOfMonth(isHoliday, date, prevDate) {
    return !isHoliday && date.getMonth() !== prevDate.getMonth();
}

function isLastDayOfMonth(isHoliday, date, nextDate) {
    return !isHoliday && nextDate.getMonth() !== date.getMonth();
}

function isFirstDayOfQuarter(isHoliday, date, prevDate) {
    var mt = date.getMonth();
    var pmt = prevDate.getMonth();
    return !isHoliday && (pmt !== mt) && (mt === 0 || mt === 3 || mt === 6 || mt === 9);
}

function isLastDayOfQuarter(isHoliday, date, nextDate) {
    var mt = date.getMonth();
    var nmt = nextDate.getMonth();
    return !isHoliday && (nmt !== mt) && (mt === 2 || mt === 5 || mt === 8 || mt === 11);
}

function isFirstDayOfYear(isHoliday, date, prevDate) {
    return !isHoliday && date.getFullYear() !== prevDate.getFullYear();
}

function isLastDayOfYear(isHoliday, date, nextDate) {
    return !isHoliday && date.getFullYear() !== nextDate.getFullYear();
}

function addDays(date, numberOfDays) {
    var dt = new Date(date);
    return mu.hackDateForTZ(new Date(dt.setDate(dt.getDate() + numberOfDays)));
}

function thisWeekStart(date) {
    return addDays(date, daysToAddForThisWeekStart[dayOfWeek(date)]);
}

function thisWeekEnd(date) {
    return addDays(date, daysToAddForThisWeekEnd[dayOfWeek(date)]);
}

function prevWeekEnd(date) {
    return addDays(date, daysToAddForPrevWeekEnd[dayOfWeek(date)]);
}

function nextWeekStart(date) {
    return addDays(date, daysToAddForNextWeekStart[dayOfWeek(date)]);
}

function thisMonthStart(yr, mt) {
    return mu.hackDateForTZ(new Date(yr, mt, 1));
}

function thisMonthEnd(yr, mt) {
    return mu.hackDateForTZ(new Date(yr, mt + 1, 0));
}

function prevMonthEnd(yr, mt) {
    return mu.hackDateForTZ(new Date(yr, mt, 0));
}

function nextMonthStart(yr, mt) {
    return mu.hackDateForTZ(new Date(yr, mt + 1, 1));
}

var thisQuarterStartMth = [0, 0, 0, 3, 3, 3, 6, 6, 6, 9, 9, 9];
function thisQuarterStart(yr, mt) {
    return mu.hackDateForTZ(new Date(yr, thisQuarterStartMth[mt], 1));
}

var thisQuarterEndMth = [2, 2, 2, 5, 5, 5, 8, 8, 8, 11, 11, 11];
function thisQuarterEnd(yr, mt) {
    return mu.hackDateForTZ(new Date(yr, thisQuarterEndMth[mt], 1));
}

var prevQuarterEndMth = [11, 11, 11, 2, 2, 2, 5, 5, 5, 8, 8, 8];
function prevQuarterEnd(yr, mt) {
    if (prevQuarterEndMth[mt] === 11) {
        yr = yr - 1;
    }
    return mu.hackDateForTZ(new Date(yr, prevQuarterEndMth[mt], 1));
}

var nextQuarterStartMth = [3, 3, 3, 6, 6, 6, 9, 9, 9, 0, 0, 0];
function nextQuarterStart(yr, mt) {
    if (nextQuarterStartMth[mt] === 0) {
        yr = yr + 1;
    }
    return mu.hackDateForTZ(new Date(yr, nextQuarterStartMth[mt], 1));
}

function thisYearStart(yr) {
    return mu.hackDateForTZ(new Date(yr, 0, 1));
}

function thisYearEnd(yr) {
    return mu.hackDateForTZ(new Date(yr, 11, 31));
}

function prevYearEnd(yr) {
    return mu.hackDateForTZ(new Date(yr - 1, 11, 31));
}

function nextYearStart(yr) {
    return mu.hackDateForTZ(new Date(yr + 1, 0, 1));
}

var Calendar = function (holidaysFile, fromDate, toDate) {
    var self = this;
    self.holidays = {};
    self.dates = {};
    var holidaysDts = fs.readFileSync(holidaysFile).toString().split("\n").map(function (date) {
        return mu.hackDateForTZ(new Date(Date.parse(date)));
    });
    holidaysDts.forEach(function (dt) {
        self.holidays[dt] = true;
    });
    var enrichedDates = self._getAllDates(fromDate, toDate);
    enrichedDates.forEach(function (edt) {
        self.dates[edt.date] = edt;
    });
};

Calendar.prototype._isHoliday = function (date) {
    var self = this;
    return self.holidays[date] === true || moment(date).format('d') === 0 || moment(date).format('d') === 6;
};

Calendar.prototype._adjBk = function (date) {
    var self = this;
    var ret;
    if (self._isHoliday(date)) {
        var dt = mu.hackDateForTZ(new Date(date));
        while (self._isHoliday(dt)) {
            dt = mu.hackDateForTZ(new Date(dt.setDate(dt.getDate() - 1)));
        }
        ret = dt;
    } else {
        ret = date;
    }
    return ret;
};

Calendar.prototype._adjFwd = function (date) {
    var self = this;
    var ret;
    if (self._isHoliday(date)) {
        var dt = mu.hackDateForTZ(new Date(date));
        while (self._isHoliday(dt)) {
            dt = mu.hackDateForTZ(new Date(dt.setDate(dt.getDate() + 1)));
        }
        ret = mu.hackDateForTZ(dt);
    } else {
        ret = date;
    }
    return ret;
};

Calendar.prototype._adjFwdNextDate = function (date) {
    var self = this;
    return self._adjFwd(nextDate(date));
};

Calendar.prototype._adjBkPrevDate = function (date) {
    var self = this;
    return self._adjBk(prevDate(date));
};

Calendar.prototype._nearestPrevDates = function (date, prevFn, noOfDays) {
    var self = this;
    var dt = prevFn(date);
    var ret = [];
    var i = 0;
    while (i < noOfDays) {
        dt = mu.hackDateForTZ(new Date(self._adjBkPrevDate(dt)));
        ret.push(dt);
        i += 1;
    }
    return ret;
};

Calendar.prototype.enrich = function (dt) {
    var self = this;
    var date = new Date(dt);
    var isHoliday = self._isHoliday(date);
    var adjPrevDt = self._adjBkPrevDate(date);
    var adjNextDt = self._adjFwdNextDate(date);
    var yr = date.getFullYear();
    var mt = date.getMonth();
    var ret = {
        date: mu.hackDateForTZ(new Date(date)),
        dayOfWeek: dayOfWeek(date),
        isWeekend: isWeekend(date),
        isWeekday: isWeekday(date),
        isWorkingDay: !isHoliday,
        isHoliday: isHoliday,
        nextDate: adjNextDt,
        prevDate: adjPrevDt,
        nearestPrevDates: self._nearestPrevDates(date, prevDate, 2),
        prevWeek: self._adjBk(prevWeek(date)),
        nearestPrevWeek: self._nearestPrevDates(date, prevWeek, 2),
        prevMonth: self._adjBk(prevMonth(date)),
        nearestPrevMonth: self._nearestPrevDates(date, prevMonth, 3),
        prevQuarter: self._adjBk(prevQuarter(date)),
        nearestPrevQuarter: self._nearestPrevDates(date, prevMonth, 4),
        prevHalfYear: self._adjBk(prevHalfYr(date)),
        nearestPrevHalfYear: self._nearestPrevDates(date, prevHalfYr, 4),
        prevYear: self._adjBk(prevYear(date)),
        nearestPrevYear: self._nearestPrevDates(date, prevYear, 4),
        prev3Year: self._adjBk(prev3Year(date)),
        nearestPrev3Year: self._nearestPrevDates(date, prev3Year, 4),
        prev5Year: self._adjBk(prev5Year(date)),
        nearestPrev5Year: self._nearestPrevDates(date, prev5Year, 4),
        isFirstDayOfWeek: isFirstDayOfWeek(isHoliday, date, adjPrevDt),
        isLastDayOfWeek: isLastDayOfWeek(isHoliday, date, adjNextDt),
        isFirstDayOfMonth: isFirstDayOfMonth(isHoliday, date, adjPrevDt),
        isLastDayOfMonth: isLastDayOfMonth(isHoliday, date, adjNextDt),
        isFirstDayOfQuarter: isFirstDayOfQuarter(isHoliday, date, adjPrevDt),
        isLastDayOfQuarter: isLastDayOfQuarter(isHoliday, date, adjNextDt),
        isFirstDayOfYear: isFirstDayOfYear(isHoliday, date, adjPrevDt),
        isLastDayOfYear: isLastDayOfYear(isHoliday, date, adjNextDt),
        thisWeekEnd: self._adjBk(thisWeekEnd(date)),
        thisWeekStart: self._adjFwd(thisWeekStart(date)),
        prevWeekEnd: self._adjBk(prevWeekEnd(date)),
        nextWeekStart: self._adjFwd(nextWeekStart(date)),
        thisMonthEnd: self._adjBk(thisMonthEnd(yr, mt)),
        thisMonthStart: self._adjFwd(thisMonthStart(yr, mt)),
        prevMonthEnd: self._adjBk(prevMonthEnd(yr, mt)),
        nextMonthStart: self._adjFwd(nextMonthStart(yr, mt)),
        thisQuarterStart: self._adjFwd(thisQuarterStart(yr, mt)),
        thisQuarterEnd: self._adjBk(thisQuarterEnd(yr, mt)),
        prevQuarterEnd: self._adjBk(prevQuarterEnd(yr, mt)),
        nextQuarterStart: self._adjFwd(nextQuarterStart(yr, mt)),
        thisYearStart: self._adjFwd(thisYearStart(yr)),
        thisYearEnd: self._adjBk(thisYearEnd(yr)),
        prevYearEnd: self._adjBk(prevYearEnd(yr)),
        nextYearStart: self._adjFwd(nextYearStart(yr))
    };
    return mu.deepFreeze(ret);
};

Calendar.prototype._getAllDates = function (fromDate, toDate) {
    var self = this;
    var endDate = mu.hackDateForTZ(new Date(toDate));
    var date = mu.hackDateForTZ(new Date(fromDate));
    var datesQueue = [];
    while (date <= endDate) {
        datesQueue.push(self.enrich(date));
        date = nextDate(date);
    }
    return datesQueue;
};

Calendar.prototype._date = function (y, m, d) {
    var self = this;
    return self.dates[mu.hackDateForTZ(new Date(y, m, d))];
};

Calendar.prototype.date = function (dt) {
    var self = this;
    return self.dates[mu.hackDateForTZ(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()))];
};

module.exports.Calendar = Calendar;