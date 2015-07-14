var ArgumentError = require('./error').ArgumentError;
var InterfaceError = require('./error').InterfaceError;
var ScriptExecutionError = require('./error').ScriptExecutionError;

// closured/private driver, as this must be set at runtime
var driver;

module.exports = {
    setDriver: function setDriver(updatedDriver) {
        if (!updatedDriver || !updatedDriver.executeScript) throw new InterfaceError('please provide a selenium based web driver');
        driver = updatedDriver;
    },
    executeScript: function executeScript(scriptToExecute, callback) {
        if (typeof scriptToExecute !== 'string') return callback(new ArgumentError('must provide a script for executing'));
        if (!driver) return callback(new InterfaceError('no driver has been set, can\'t execute script'));

        return driver.executeScript(scriptToExecute).then(
            function (returnedValue) {
                return callback(null, returnedValue);
            },
            function (error) {
                return callback(new ScriptExecutionError(error));
            }
        );
    }
};