"use strict";
/*jshint -W081, -W098 */
/*jslint vars: true, stupid: true, unparam: true */

var moment = require('moment');
var promise = require('when').promise;
var request = require('request-promise');
var fs = require('fs');
var Zip = require('adm-zip');
var csv = require('fast-csv');
var mu = require('./miscutils.js');

function download(params) {
    return promise(function (resolve, reject, notify) {
        //http://stackoverflow.com/questions/14107470/nodejs-download-and-unzipBhavcopyCsv-file-from-url-error-no-end-header-found
        var uri = 'http://www.nseindia.com/content/historical/EQUITIES/' + params.date.getFullYear() + "/" + moment(params.date).format('MMM').toUpperCase() + '/cm' + moment(params.date).format('DDMMMYYYY').toUpperCase() + 'bhav.csv.zip';
        params.zipFileName = params.outputFolder + '/' + params.fdt + '.csv.zip';
        params.uri = uri;
        request.get({
            //http://stackoverflow.com/questions/14855015/getting-binary-content-in-node-js-using-request
            encoding: null,
            uri: uri,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36',
                'Accept-Encoding': 'gzip,deflate,sdch',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Cookie': 'NSE-TEST-1=1809850378.20480.0000'
            }
        }).then(function (body) {
            fs.writeFileSync(params.zipFileName, body);
            var exists = fs.existsSync(params.zipFileName);
            var stats = exists && fs.statSync(params.zipFileName);
            if (exists && stats.size > 100) {
                params.zipFileSize = stats.size;
                resolve(params);
            } else {
                reject(mu.newErrorObj('DownloadError: ', {
                    filename: params.zipFileName,
                    err: 'file does not exist or less than 100 bytes.',
                    exists: exists,
                    stats: stats
                }));
            }
        }).catch(function (e) {
            reject(mu.newErrorObj('DownloadError: ', {filename: params.zipFileName, err: e}));
        });
    });
}

module.exports.download = download;

function unzip(params) {
    return promise(function (resolve, reject, notify) {
        var folder = params.outputFolder;
        params.csvFileName = folder + '/' + params.fdt + '.csv';
        try {
            var zipfile = new Zip(params.zipFileName);
            var entryname = null;
            zipfile.getEntries().forEach(function (zipEntry) {
                zipfile.extractEntryTo(zipEntry.entryName, folder, false, true);
                entryname = folder + '\\' + zipEntry.entryName;
            });
            if (fs.existsSync(entryname)) {
                fs.renameSync(entryname, params.csvFileName);
                var stats = fs.statSync(params.csvFileName);
                params.csvFileSize = stats.size;
                resolve(params);
            } else {
                reject(mu.newErrorObj('UnzipError: ', {
                    filename: params.zipFileName,
                    err: 'could not unzip'
                }));
            }
        } catch (err) {
            reject(mu.newErrorObj('UnzipError: ', {filename: params.zipFileName, error: err}));
        }
    });
}
module.exports.unzip = unzip;

function parse(params) {
    return promise(function (resolve, reject, notify) {
        var lines = [];
        var tickers = {};
        try {
            csv.fromPath(params.csvFileName, {
                objectMode: true,
                headers: true,
                ignoreEmpty: true,
                trim: true
            }).on('data', function (data) {
                if (data.symbol !== 'SYMBOL' && tickers[data.SYMBOL + '.' + data.SERIES] === undefined) {
                    tickers[data.SYMBOL + '.' + data.SERIES] = data;
                    lines.push(data);
                }
            }).on('end', function () {
                params.totalRecords = lines.length;
                params.records = lines;
                tickers = {};
                resolve(params);
            }).on('error', function (err) {
                reject(mu.newErrorObj('CSVError: ', {filename: params.csvFileName, err: err}));
            });
        } catch (err) {
            reject(mu.newErrorObj('CSVOpenError: ', {filename: params.csvFileName, err: err}));
        }
    });
}
module.exports.parse = parse;
