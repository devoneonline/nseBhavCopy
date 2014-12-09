var winston = require('winston');
var logger = new winston.Logger({
    transports: [
        new winston.transports.File({
            filename: 'bhavcopy.out',
            level: 'debug',
            handleExceptions: true,
            json: true,
            maxsize: 100000000,
            colorize: false,
            timestamp: true
        }),
        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
            colorize: true,
            timestamp: true
        })
    ],
    exitOnError: false
});

module.exports = logger;