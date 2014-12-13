"use strict";
/*jshint -W081 */
/*global describe: true, before: true, it: true */
/*jslint vars: true, stupid: true */
var expect = require('chai').expect;
var Calendar = require('../calendar.js').Calendar;
var mu = require('../miscutils.js');
var moment = require('moment');

function hackedNewDate(y, m, d) {
    return mu.hackDateForTZ(new Date(y, m, d));
}

describe('Testing calendars functionality', function () {
    this.timeout(600000);
    var calendar;
    before(function () {
        calendar = new Calendar('./holidays.txt', hackedNewDate(1999, 0, 1), hackedNewDate(2014, 10, 30));
    });
    describe("Calendar.isHoliday", function () {
        it('should be true when it is saturday or sunday', function () {
            expect(calendar._isHoliday(hackedNewDate(2014, 10, 8))).to.be.true();
            expect(calendar._isHoliday(hackedNewDate(2014, 10, 9))).to.be.true();
        });
        it('should be true when it is an exchange holiday', function () {
            expect(calendar._isHoliday(hackedNewDate(2014, 10, 4))).to.be.true();
        });
        it('should be false on a working day', function () {
            expect(calendar._isHoliday(hackedNewDate(2014, 10, 10))).to.be.false();
        });
    });

    describe("Calendar.adjustBackwardForHoliday", function () {
        it('should return fri when i pass sat or sun', function () {
            expect(calendar._adjBk(hackedNewDate(2014, 10, 29)).toISOString()).to.be.equal(hackedNewDate(2014, 10, 28).toISOString());
            expect(calendar._adjBk(hackedNewDate(2014, 10, 30)).toISOString()).to.be.equal(hackedNewDate(2014, 10, 28).toISOString());
        });
        it('should go back to a working day when the today is a holiday', function () {
            expect(calendar._adjBk(hackedNewDate(2014, 10, 4)).toISOString()).to.be.equal(hackedNewDate(2014, 10, 3).toISOString());
        });
        it('should not go back when today is not a holiday', function () {
            expect(calendar._adjBk(hackedNewDate(2014, 10, 3)).toISOString()).to.be.equal(hackedNewDate(2014, 10, 3).toISOString());
        });
        it('should go back several days when there are several holidays in a row', function () {
            expect(calendar._adjBk(hackedNewDate(2014, 9, 6)).toISOString()).to.be.equal(hackedNewDate(2014, 9, 1).toISOString());
        });
    });

    describe("Calendar.adjustForwardForHoliday", function () {
        it('should return mon when i pass sat or sun', function () {
            expect(calendar._adjFwd(hackedNewDate(2014, 10, 29)).toISOString()).to.be.equal(hackedNewDate(2014, 11, 1).toISOString());
            expect(calendar._adjFwd(hackedNewDate(2014, 10, 30)).toISOString()).to.be.equal(hackedNewDate(2014, 11, 1).toISOString());
        });
        it('should go forward to a working day when the today is a holiday', function () {
            expect(calendar._adjFwd(hackedNewDate(2014, 10, 4)).toISOString()).to.be.equal(hackedNewDate(2014, 10, 5).toISOString());
        });
        it('should not go forward when today is not a holiday', function () {
            expect(calendar._adjFwd(hackedNewDate(2014, 10, 3)).toISOString()).to.be.equal(hackedNewDate(2014, 10, 3).toISOString());
        });
        it('should go forward several days when there are several holidays in a row', function () {
            expect(calendar._adjFwd(hackedNewDate(2014, 9, 2)).toISOString()).to.be.equal(hackedNewDate(2014, 9, 7).toISOString());
        });
    });

    describe("Calendar.enrichDate", function () {
        it('should have all fields populated and none undefined', function () {
            expect(JSON.stringify(calendar.date(2014, 10, 13)).indexOf('undefined')).to.equal(-1);
        });
        describe('common attributes for the date', function () {
            it('should have isWeekday true for a weekday', function () {
                expect(calendar.date(2014, 10, 10).isWeekday).to.be.true();
            });
            it('should have isWeekday false for a weekend', function () {
                expect(calendar.date(2014, 10, 15).isWeekday).to.be.false();
            });
            it('should have isWorkingDay = true and isHoliday = false for a working day', function () {
                expect(calendar.date(2014, 10, 17).isWorkingDay).to.be.true();
                expect(calendar.date(2014, 10, 17).isHoliday).to.be.false();
                expect(calendar.date(2014, 10, 17).isWorkingDay).to.be.true();
            });
            it('should have isWeekend = true and isHoliday = true for a weekend', function () {
                expect(calendar.date(2014, 10, 15).isWorkingDay).to.be.false();
                expect(calendar.date(2014, 10, 15).isHoliday).to.be.true();
                expect(calendar.date(2014, 10, 15).isWeekend).to.be.true();
            });
            it('should have isWeekend = false and isHoliday = true for a holiday', function () {
                expect(calendar.date(2014, 10, 4).isWorkingDay).to.be.false();
                expect(calendar.date(2014, 10, 4).isHoliday).to.be.true();
                expect(calendar.date(2014, 10, 4).isWeekday).to.be.true();
            });
        });
        describe('prev and next attributes should be populated correctly', function () {
            it('should have prev as a working day', function () {
                expect(calendar._isHoliday(calendar.date(2014, 10, 4).prevDate)).to.be.false();
                expect(calendar._isHoliday(calendar.date(2014, 10, 17).prevDate)).to.be.false();
            });
            it('should have next as a working day', function () {
                expect(calendar._isHoliday(calendar.date(2014, 10, 4).nextDate)).to.be.false();
                expect(calendar._isHoliday(calendar.date(2014, 10, 17).nextDate)).to.be.false();
            });
        });
        describe('prev week, month, quarter and year dates should be populated correctly', function () {
            var dt1, dt2;
            before(function () {
                dt1 = calendar.date(2014, 10, 4);
                dt2 = calendar.date(2014, 10, 17);
            });
            it('should have prev week as a working day', function () {
                expect(calendar._isHoliday(dt1.prevWeek)).to.be.false();
                expect(calendar._isHoliday(dt2.prevWeek)).to.be.false();
            });
            it('should have prev month as a working day', function () {
                expect(calendar._isHoliday(dt1.prevMonth)).to.be.false();
                expect(calendar._isHoliday(dt2.prevMonth)).to.be.false();
            });
            it('should have prev quarter as a working day', function () {
                expect(calendar._isHoliday(dt1.prevQuarter)).to.be.false();
                expect(calendar._isHoliday(dt2.prevQuarter)).to.be.false();
            });
            it('should have prev year as a working day', function () {
                expect(calendar._isHoliday(dt1.prevYear)).to.be.false();
                expect(calendar._isHoliday(dt2.prevYear)).to.be.false();
            });
            it('should have prev week atleast 7 days before today', function () {
                expect(moment(dt1.date).diff(moment(dt1.prevWeek), 'weeks')).to.equal(1);
                expect(moment(dt2.date).diff(moment(dt2.prevWeek), 'weeks')).to.equal(1);
            });
            it('should have prev month atleast a month before today', function () {
                expect(moment(dt1.date).diff(moment(dt1.prevMonth), 'months')).to.equal(1);
                expect(moment(dt2.date).diff(moment(dt2.prevMonth), 'months')).to.equal(1);

            });
            it('should have prev quarter atleast 3 months before today', function () {
                expect(moment(dt1.date).diff(moment(dt1.prevQuarter), 'months')).to.equal(3);
                expect(moment(dt2.date).diff(moment(dt2.prevQuarter), 'months')).to.equal(3);
            });
            it('should have prev year atleast a year before today', function () {
                expect(moment(dt1.date).diff(moment(dt1.prevYear), 'years')).to.equal(1);
                expect(moment(dt2.date).diff(moment(dt2.prevYear), 'years')).to.equal(1);
            });
        });
        describe('isFirstDayOfXX, isLastDayOfXX should be properly defined', function () {
            it('should have isFirstDayOfWeek and isLastDayOfWeek to be working days', function () {
                expect(calendar.date(2014, 7, 14).isLastDayOfWeek).to.be.true();
                expect(calendar.date(2014, 7, 15).isLastDayOfWeek).to.be.false();
                expect(calendar.date(2014, 9, 7).isFirstDayOfWeek).to.be.true();
                expect(calendar.date(2014, 9, 6).isFirstDayOfWeek).to.be.false();
            });
            it('should have isFirstDayOfMonth and isLastDayOfMonth to be working days', function () {
                expect(calendar.date(2014, 10, 3).isFirstDayOfMonth).to.be.true();
                expect(calendar.date(2014, 10, 1).isFirstDayOfMonth).to.be.false();
                expect(calendar.date(2014, 7, 28).isLastDayOfMonth).to.be.true();
                expect(calendar.date(2014, 7, 30).isLastDayOfMonth).to.be.false();
            });
        });
    });
});

