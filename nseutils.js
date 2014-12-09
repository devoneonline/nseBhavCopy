"use strict";
var request = require('request'),
    fs = require('fs'),
    dateformat = require('dateformat'),
    logger = require('./logger.js'),
    Zip = require('adm-zip'),
    csv = require('fast-csv'),
    mu = require('./miscutils.js');

function formBhavcopyCsvUri(date) {
    return "http://www.nseindia.com/content/historical/EQUITIES/" + date.getFullYear() + "/" + dateformat(date, 'mmm').toUpperCase() + "/cm" + dateformat(date, 'ddmmmyyyy').toUpperCase() + "bhav.csv.zip";
}

function formBhavcopyFilename(inFolder, forDate) {
    return inFolder + '/' + dateformat(forDate, 'yyyymmdd') + '.csv.zip';
}
module.exports.formBhavcopyFilename = formBhavcopyFilename;

function downloadBhavcopyCsv(forDate, inFolder, done, retryCb, errCb, retryCount) {
    //http://stackoverflow.com/questions/14107470/nodejs-download-and-unzipBhavcopyCsv-file-from-url-error-no-end-header-found
    var filename = formBhavcopyFilename(inFolder, forDate),
        out = fs.createWriteStream(filename),
        uri = formBhavcopyCsvUri(forDate),
        req = request({
            method: 'GET',
            uri: uri,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
                "Accept-Encoding": "gzip,deflate,sdch",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Cookie": "NSE-TEST-1=1809850378.20480.0000"
            }
        });
    logger.info("downloading url: ", uri);
    req.pipe(out);
    req.on('end', function () {
        fs.exists(filename, function (exists) {
            if (exists) {
                fs.stat(filename, function (err, stats) {
                    if (err) {
                        logger.error("could not stat ", filename);
                    }
                    if (stats.size < 1000) {
                        errCb.reportError({filename: filename, error: stats});
                        fs.unlink(filename);
                        if (retryCount === 0) {
                            retryCb();
                        } else {
                            logger.error('giving up retry download for file ', filename);
                        }
                    }
                    done(filename);
                });
            }
        });
    });
    req.on('error', function (err) {
        errCb.reportError("while trying to download " + filename + " : " + err);
    });
    return filename;
}
module.exports.downloadBhavcopyCsv = downloadBhavcopyCsv;

function unzipBhavcopyCsv(file, inFolder, errCb) {
    var entry = [],
        zipfile;
    if (fs.existsSync(file)) {
        try {
            zipfile = new Zip(file);
            zipfile.getEntries().forEach(function (zipEntry) {
                zipfile.extractEntryTo(zipEntry.entryName, inFolder, false, true);
                entry.push(file.slice(0, -4));
                fs.rename(inFolder + "\\" + zipEntry.entryName, file.slice(0, -4));
            });
        } catch (err) {
            errCb.reportError({file: file, error: err});
        }
    } else {
        logger.error("trying to unzipBhavcopyCsv non existent file ", file);
    }
    return entry;
}
module.exports.unzipBhavcopyCsv = unzipBhavcopyCsv;

function parseBhavcopyCsv(filename, parseCb, endCb, errCb) {
    var recordCounter = 0;
    try {
        csv.fromPath(filename, {
            objectMode: true,
            headers: true,
            ignoreEmpty: false,
            trim: true
        }).on('data', function (data) {
            recordCounter += 1;
            var price = {
                symbol: data.SYMBOL,
                series: data.SERIES,
                date: mu.hackDateForTZ(new Date(Date.parse(data.TIMESTAMP))),
                open: data.OPEN,
                high: data.HIGH,
                low: data.LOW,
                close: data.CLOSE,
                last: data.LAST,
                trdQty: data.TOTTRDQTY,
                trdVal: data.TOTTRDVAL,
                transactionCosts: (data.HIGH - data.LOW) / data.CLOSE
            };
            parseCb(price);
        }).on('end', function () {
            endCb(recordCounter);
        }).on('error', function (err) {
            errCb.reportError("while trying to parse " + filename + " : " + err);
        });
    } catch (err) {
        errCb.reportError("while trying to open " + filename + " : " + err);
    }
}
module.exports.parseBhavcopyCsv = parseBhavcopyCsv;