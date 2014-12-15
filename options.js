var defaultOptions = {
    fromDate: new Date(Date.parse('1999-01-01')),
    toDate: new Date(Date.parse('2014-11-04')),
    outputFolder: 'f:/projects/data/nseData',
    holidaysFile: './holidays.txt',
    monoguri: 'mongodb://localhost:27017/test',
    downloadPause: 2000,
    unzipPause: 100,
    parsePause: 1000,
    analysisPause: 5000
};

module.exports.defaultOptions = defaultOptions;