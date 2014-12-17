"use strict";
/*jshint -W081 */
/*global describe: true, before: true, it: true */
/*jslint vars: true, stupid: true */
var expect = require('chai').expect;
var Calendar = require('../calendar.js').Calendar;
var mu = require('../miscutils.js');
var moment = require('moment');

describe('testing do for every date', function () {
    this.timeout(600000);
    var calendar;
    var startDate, finishDate;
    var pause;
    before(function () {
        calendar = new Calendar('./holidays.txt', mu.hackedNewDate(1999, 0, 1), mu.hackedNewDate(2014, 10, 30));
        startDate = mu.hackedNewDate(1999, 0, 1);
        finishDate = mu.hackedNewDate(1999, 0, 19);
        pause = 50;
    });
    it('should fire for every second', function (done) {
        var start = moment();
        var tester = function (date, counter, total) {
            expect(counter <= total).to.be.true();
            expect(moment().diff(start)).to.be.above(counter * pause);
            expect(moment(date).diff(moment(startDate), 'days')).to.equal(counter - 1);
            if (counter === total) {
                done();
            }
        };
        mu.doForEveryDate(calendar, startDate, finishDate, pause, tester);
    });
    it('should not call event raiser on holidays', function (done) {
        var tester = function (date, counter, total) {
            expect(calendar.date(date).isWorkingDay).to.be.true();
            if (counter === total) {
                done();
            }
        };
        mu.doForEveryDate(calendar, startDate, finishDate, pause, tester);
    });
});

