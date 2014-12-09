"use strict";
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PricesSchema = new Schema({
    symbol: {type: String, index: true},
    series: String,
    date: {type: Date, index: true},
    open: Number,
    high: Number,
    low: Number,
    close: Number,
    last: Number,
    trdQty: Number,
    trdVal: Number,
    transactionCosts: Number
}, {strict: false});

PricesSchema.index({symbol: 1, series: 1, date: 1});

PricesSchema.statics.findBySymbol = function (symbol, cb) {
    this.find({symbol: symbol}, cb).sort({date: 'asc'});
};

PricesSchema.statics.findBySymbol = function (symbol, date, cb) {
    this.find({symbol: symbol, date: date}, cb).sort({date: 'asc'});
};

PricesSchema.statics.findBySymbolSeries = function (symbol, series, cb) {
    this.find({symbol: symbol, series: series}, cb).sort({date: 'asc'});
};

PricesSchema.statics.findBySymbolSeriesDate = function (symbol, series, date, cb) {
    this.find({symbol: symbol, series: series, date: date}, cb).sort({date: 'asc'});
};

PricesSchema.statics.findByDateRange = function (fromDate, toDate, cb) {
    this.find().where('date').gte(fromDate).lte(toDate).sort({date: 'asc', symbol: 'desc'}).exec(cb);
};

PricesSchema.statics.findBySymbolDateRange = function (symbol, fromDate, toDate, cb) {
    this.find({symbol: symbol}).where('date').gte(fromDate).lte(toDate).sort({date: 'asc'}).exec(cb);
};

PricesSchema.statics.findBySymbolSeriesDateRange = function (symbol, series, fromDate, toDate, cb) {
    this.find({symbol: symbol, series: series}).where('date').gte(fromDate).lte(toDate).sort({date: 'asc'}).exec(cb);
};

PricesSchema.index({date: 1, symbol: 1});

var AnalyticsSchema = new Schema({
    symbol: {type: String, index: true},
    series: String,
    date: {type: Date, index: true},
    close: Number,
    prevDay: {
        date: Date,
        close: Number,
        change: Number
    },
    prevWeek: {
        date: Date,
        close: Number,
        change: Number
    },
    prevMonth: {
        date: Date,
        close: Number,
        change: Number
    },
    prevQuarter: {
        date: Date,
        close: Number,
        change: Number
    },
    prev6m: {
        date: Date,
        close: Number,
        change: Number
    },
    prevYear: {
        date: Date,
        close: Number,
        change: Number
    },
    priceBookRatio: Number,
    priceEarningRatio: Number,
    divYield: Number,
    earningsYield: Number,
    announcements: String,
    corporateActions: String
}, {strict: false});

AnalyticsSchema.statics.findBySymbol = function (symbol, cb) {
    this.find({symbol: symbol}, cb).sort({date: 'asc'});
};

AnalyticsSchema.statics.findBySymbolDate = function (symbol, date, cb) {
    this.find({symbol: symbol, date: date}, cb).sort({date: 'asc'});
};

AnalyticsSchema.statics.findBySymbolSeries = function (symbol, series, cb) {
    this.find({symbol: symbol, series: series}, cb).sort({date: 'asc'});
};

AnalyticsSchema.statics.findBySymbolSeriesDate = function (symbol, series, date, cb) {
    this.find({symbol: symbol, series: series, date: date}, cb).sort({date: 'asc'});
};

AnalyticsSchema.statics.findByDateRange = function (fromDate, toDate, cb) {
    this.find().where('date').gte(fromDate).lte(toDate).sort({date: 'asc', symbol: 'desc'}).exec(cb);
};

AnalyticsSchema.statics.findBySymbolDateRange = function (symbol, fromDate, toDate, cb) {
    this.find({symbol: symbol}).where('date').gte(fromDate).lte(toDate).sort({date: 'asc'}).exec(cb);
};

AnalyticsSchema.statics.findBySymbolSeriesDateRange = function (symbol, series, fromDate, toDate, cb) {
    this.find({symbol: symbol, series: series}).where('date').gte(fromDate).lte(toDate).sort({date: 'asc'}).exec(cb);
};

AnalyticsSchema.index({date: 1, symbol: 1});

var Prices = mongoose.model('Prices', PricesSchema);
var Analytics = mongoose.model('Analytics', AnalyticsSchema);

module.exports.Prices = Prices;
module.exports.Analytics = Analytics;
