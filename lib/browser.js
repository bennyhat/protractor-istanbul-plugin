var ArgumentError = require('./error').ArgumentError;
var InterfaceError = require('./error').InterfaceError;
var ScriptExecutionError = require('./error').ScriptExecutionError;
var Q = require('q');

// closured/private driver, as this must be set at runtime
var driver;

module.exports = {
    setDriver: function setDriver(updatedDriver) {
        if (!updatedDriver || !updatedDriver.executeScript) return Q.reject(new InterfaceError('please provide a selenium based web driver'));
        driver = updatedDriver;
        return Q.resolve("driver set");
    },
    executeScript: function executeScript(scriptToExecute) {
        if (typeof scriptToExecute !== 'string') return Q.reject(new ArgumentError('must provide a script for executing'));
        if (!driver) return Q.reject(new InterfaceError('no driver has been set, can\'t execute script'));

        return driver.executeScript(scriptToExecute);
    }
};