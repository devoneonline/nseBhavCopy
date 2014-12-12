"use strict";
var fs = require('fs');
var logger = require('./logger.js');

function areEqual(date1, date2) {
    return date1.getDate() === date2.getDate() && date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
}

function dateIterator(holidaysFile) {
    var holidaysDts = fs.readFileSync(holidaysFile).toString().split("\n").map(function (date) {
            return hackDateForTZ(new Date(Date.parse(date)));
        }),
        iteratedUntil = 0,
        iteratedSince = holidaysDts.length;

    return {
        next: function (date) {
            var dt = new Date(date),
                nextdate = hackDateForTZ(new Date(dt.setDate(dt.getDate() + 1))),
                isHoliday = false,
                i = 0;
            for (i = iteratedUntil; i < holidaysDts.length && !isHoliday && holidaysDts[i] <= nextdate; i += 1) {
                isHoliday = areEqual(holidaysDts[i], nextdate);
            }
            iteratedUntil = i;
            return isHoliday ? this.next(nextdate) : nextdate;
        },
        _isHoliday: function (date) {
            var ret = false,
                i = 0;
            for (i = 0; i < holidaysDts.length && !ret; i += 1) {
                ret = areEqual(holidaysDts[i], date);
            }
            return ret;
        },
        prev: function (date) {
            var dt = new Date(date),
                prevdate = hackDateForTZ(new Date(dt.setDate(dt.getDate() - 1))),
                isHoliday = false,
                i = 0;
            for (i = iteratedSince; i > 0 && !isHoliday && holidaysDts[i] >= prevdate; i -= 1) {
                isHoliday = areEqual(holidaysDts[i], prevdate);
            }
            iteratedSince = i;
            return isHoliday ? this.prev(prevdate) : prevdate;

        }
    };
}

function hackDateForTZ(date) {
    if (date) {
        date.setHours(5, 30, 0, 0);
    }
    return date;
}


var iter = dateIterator('./holidays.txt');
var startDt = hackDateForTZ(new Date(Date.parse('1999-01-01')));
var endDt = hackDateForTZ(new Date(Date.parse('2014-12-05')));

var dt = new Date(startDt);
var queue = [];

while (dt <= endDt) {
    queue.push(dt);
    dt = iter.next(dt);
}

var cb = function (dt) {
    logger.info("got " + dt.toString());
};
/*
var id = setInterval(function (queue, cb) {
    if (queue.length === 0) {
        logger.info('all done');
        clearInterval(id);
    }
    cb(queue.shift());
}, 100, queue, cb);
*/

