var defaultOptions = {
    fromDate: new Date(Date.parse('1995-01-01')),
    toDate: new Date(Date.parse('2014-12-05')),
    outputFolder: "f:/projects/data/nseData",
    holidaysFile: "./holidays.txt",
    monoguri: "mongodb://localhost:27017/test",
    downloadPause: 2000,
    unzipPause: 200,
    parsePause: 1000
};

module.exports.defaultOptions = defaultOptions;