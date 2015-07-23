var merge = require('merge');
var Q = require('q');
var fse = require('fs-extra');
var uuid = require('uuid');
var path = require('path');

var ArgumentError = require('./lib/error').ArgumentError;

module.exports = new ProtractorIstanbulPlugin();

function ProtractorIstanbulPlugin() {
    var instance = this;
    instance.options = {
        outputPath: "coverage",
        functions: [],
        enabled: true
    };

    instance.teardownOutput = {
        failedCount: 0,
        specResults: [{
            description: 'Coverage gathering',
            assertions: [],
            duration: 0
        }]
    };

    instance.name = 'protractor-istanbul-plugin';

    instance.setup = function (options) {
        instance.options = merge(instance.options, options);

        if (typeof instance.options.enabled !== 'boolean') throw new ArgumentError("");
        if (!instance.options.enabled) {
            delete instance.postTest;
            delete instance.preserveCoverage;
            delete instance.teardown;
            return;
        }

        // TODO - this is pretty jank
        instance.driver = undefined;
        instance.fs = fse;
        try {
            instance.driver = browser.driver;
        }
        catch (error) {
        }

        if (typeof instance.options.outputPath !== 'string') throw new ArgumentError("");
        if (!(instance.options.functions instanceof Array)) throw new ArgumentError("");
        instance.options.functions.forEach(function (boundFunction) {
            if (!(boundFunction instanceof Function)) throw new ArgumentError("");
            if (!boundFunction.boundParent) throw new ArgumentError("");
            if (!boundFunction.boundName) throw new ArgumentError("");
        });

        instance.options.functions.forEach(function (boundFunction) {
            function Proxy() {
                this.originalFunction = boundFunction;
                var f = instance.preserveCoverage;
                f.__proto__ = this;
                return f;
            }

            boundFunction.boundParent[boundFunction.boundName] = new Proxy();
        });
    };
    instance.preserveCoverage = function () {
        var originalFunction = arguments.callee.originalFunction;
        var originalArguments = arguments;
        var originalReturn = undefined;
        var deferred = Q.defer();

        var failureMessage = 'Warning: failed to preserve coverage during wrapped function call';

        instance.driver.executeScript('return __coverage__;')
            .then(
            function (coverageObject) {
                try {
                    originalReturn = originalFunction.apply(this, originalArguments);
                }
                catch (error) {
                    instance.logAssertion(failureMessage);
                    deferred.resolve(originalReturn);
                }
                instance.driver.executeScript('__coverage__ = arguments[0];', coverageObject).then(
                    function () {
                        deferred.resolve(originalReturn);
                    },
                    function () {
                        instance.logAssertion(failureMessage);
                        deferred.resolve(originalReturn);
                    }
                );
            },
            function () {
                instance.logAssertion(failureMessage);
                originalReturn = originalFunction.apply(this, originalArguments);
                deferred.resolve(originalReturn);
            });
        return deferred.promise;
    };

    instance.postTest = function () {
        var deferred = Q.defer();
        var outputFilePath = path.join(instance.options.outputPath, uuid.v4() + '.json');
        var gatherFailureMessage = 'Warning: failed to gather coverage for test';
        var writeFailureMessage = 'Error: failed to write coverage for test to ' + outputFilePath;

        instance.driver.executeScript('return __coverage__;')
            .then(
            function (coverageObject) {
                try {
                    instance.fs.outputJsonSync(outputFilePath, coverageObject);
                }
                catch (error) {
                    instance.logAssertion(writeFailureMessage, true);
                    deferred.resolve();
                }
                deferred.resolve();
            },
            function () {
                instance.logAssertion(gatherFailureMessage);
                deferred.resolve();
            });

        return deferred.promise;
    };
    instance.teardown = function () {
        return Q.resolve(instance.teardownOutput);
    }

    instance.logAssertion = function (message, shouldFail) {
        if (instance.options.logAssertions) {
            instance.teardownOutput.specResults[0].assertions.push({passed: false, errorMsg: message});
        }
        if (instance.options.failAssertions || shouldFail) {
            instance.teardownOutput.failedCount++;
        }
    }
}