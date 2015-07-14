var fse = require('fs-extra');
var ArgumentError = require('./error').ArgumentError;

module.exports = {
    fs: fse,
    writeJsonToFile: function outputJsonSync(objectToWrite, filePath) {
        if (typeof objectToWrite !== 'object') throw new ArgumentError('must provide an object for writing');
        if (typeof filePath !== 'string') throw new ArgumentError('must provide a valid file path');

        this.fs.outputJsonSync(filePath, objectToWrite);
    }
};