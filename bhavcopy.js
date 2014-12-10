"use strict";
/*jshint -W081 */
/*jslint vars: true, stupid: true */

var dateformat = require('dateformat');
var fs = require('fs');
var request = require('request');
var logger = require('./logger.js');
var Zip = require('adm-zip');
var csv = require('fast-csv');
var mu = require('./miscutils.js');

var Bhavcopy = function (date, folder) {
    var self = this;
    self.date = date;
    self.inFolder = folder;
};

Bhavcopy.prototype.forDate = function () {
    var self = this;
    return self.date;
};

Bhavcopy.prototype._csvUri = function () {
    var self = this;
    return "http://www.nseindia.com/content/historical/EQUITIES/" + self.date.getFullYear() + "/" + dateformat(self.date, 'mmm').toUpperCase() + "/cm" + dateformat(self.date, 'ddmmmyyyy').toUpperCase() + "bhav.csv.zip";
};

Bhavcopy.prototype.zipfilename  = function () {
    var self = this;
    return self.inFolder + '/' + dateformat(self.date, 'yyyymmdd') + '.csv.zip';
};

Bhavcopy.prototype.csvfilename = function () {
    var self = this;
    return self.inFolder + '/' + dateformat(self.date, 'yyyymmdd') + '.csv';
};

Bhavcopy.prototype.download = function (doneCb, retryCb, retryCount, errCb) {
    var self = this;
    //http://stackoverflow.com/questions/14107470/nodejs-download-and-unzipBhavcopyCsv-file-from-url-error-no-end-header-found
    var filename = self.zipfilename();
    var req = request({
            method: 'GET',
            uri: self._csvUri(),
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
                "Accept-Encoding": "gzip,deflate,sdch",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Cookie": "NSE-TEST-1=1809850378.20480.0000"
            }
        });
    logger.info("downloading url: ", self._csvUri());
    req.pipe(fs.createWriteStream(filename));
    req.on('end', function () {
        fs.exists(filename, function (exists) {
            if (exists) {
                fs.stat(filename, function (err, stats) {
                    if (err) {
                        errCb.reportError(new Error("DownloadFailed: " + JSON.stringify({err: err, msg: "could not stat file " + filename})));
                    }
                    if (stats.size < 100) {
                        errCb.reportError(new Error("DownloadError: " + JSON.stringify({filename: filename, err: stats })));
                        fs.unlink(filename);
                        if (retryCount === 0) {
                            retryCb();
                        } else {
                            errCb.reportError(new Error("DownloadError: " + JSON.stringify({filename: filename, err: "downloaded file < 1000 bytes, something is wrong"})));
                        }
                    }
                    doneCb(filename);
                });
            }
        });
    });
    req.on('error', function (err) {
        errCb.reportError(new Error("DownloadError: " + JSON.stringify({filename: filename, err: err})));
    });
    return filename;
};

Bhavcopy.prototype.unzip = function (errCb) {
    var self = this;
    var entry = [];
    var zipfile;
    var filename = self.zipfilename();
    if (fs.existsSync(filename)) {
        try {
            zipfile = new Zip(filename);
            zipfile.getEntries().forEach(function (zipEntry) {
                zipfile.extractEntryTo(zipEntry.entryName, self.inFolder, false, true);
                entry.push(self.csvfilename());
                fs.rename(self.inFolder + "\\" + zipEntry.entryName, self.csvfilename());
            });
        } catch (err) {
            errCb.reportError(new Error("UnzipError: " + JSON.stringify({filename: filename, error: err})));
        }
    } else {
        errCb.reportError(new Error("UnzipError: " + JSON.stringify({filename: filename, err: "trying to unzip nonexistent file"})));
    }
    return entry;
};

Bhavcopy.prototype.parse = function (parseCb, doneCb, errCb) {
    var self = this;
    var filename = self.csvfilename();
    var recordCounter = 0;
    try {
        csv.fromPath(filename, {
            objectMode: true,
            headers: true,
            ignoreEmpty: true,
            trim: true
        }).on('data', function (data) {
            if (data.symbol !== 'SYMBOL') {
                recordCounter += 1;
                var price = {
                    symbol: data.SYMBOL,
                    series: data.SERIES,
                    date: mu.hackDateForTZ(new Date(Date.parse(data.TIMESTAMP))),
                    open: Number(data.OPEN),
                    high: Number(data.HIGH),
                    low: Number(data.LOW),
                    close: Number(data.CLOSE),
                    last: Number(data.LAST),
                    trdQty: Number(data.TOTTRDQTY),
                    trdVal: Number(data.TOTTRDVAL),
                    transactionCosts: (data.HIGH - data.LOW) / data.CLOSE
                };
                parseCb(price);
            }
        }).on('end', function () {
            doneCb(recordCounter);
        }).on('error', function (err) {
            errCb.reportError(new Error("CSVError: " + JSON.stringify({filename: filename, err: err})));
        });
    } catch (err) {
        errCb.reportError(new Error("CSVOpenError: " + JSON.stringify({filename: filename, err: err})));
    }
};

module.exports.Bhavcopy = Bhavcopy;
