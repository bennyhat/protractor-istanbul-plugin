var merge = require('merge');
var Q = require('q');
var fse = require('fs-extra');
var uuid = require('uuid');
var path = require('path');

var ArgumentError = require('./lib/error').ArgumentError;
var successfulPostTestOutput = {failedCount: 0, specResults: []};

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
            description: 'Coverage gathering errors and/or warnings',
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
                    instance.teardownOutput.specResults[0].assertions.push({passed: true, errorMsg: failureMessage});
                    deferred.resolve(originalReturn);
                }
                instance.driver.executeScript('__coverage__ = arguments[0];', coverageObject).then(
                    function () {
                        deferred.resolve(originalReturn);
                    },
                    function () {
                        instance.teardownOutput.specResults[0].assertions.push({passed: true, errorMsg: failureMessage});
                        deferred.resolve(originalReturn);
                    }
                );
            },
            function () {
                instance.teardownOutput.specResults[0].assertions.push({passed: true, errorMsg: failureMessage});
                originalReturn = originalFunction.apply(this, originalArguments);
                deferred.resolve(originalReturn);
            });
        return deferred.promise;
    };

    instance.postTest = function () {
        var deferred = Q.defer();
        var outputFilePath = path.join(instance.options.outputPath, uuid.v4() + '.json');
        var successMessage = 'Successfully gathered coverage for test and stored in ' + outputFilePath;
        var failureMessage = 'Failed to gather coverage for test and store in ' + outputFilePath;

        instance.driver.executeScript('return __coverage__;')
            .then(
            function (coverageObject) {
                try {
                    instance.fs.outputJsonSync(outputFilePath, coverageObject);
                }
                catch (error) {
                    console.log(failureMessage);
                    deferred.resolve(successfulPostTestOutput);
                }
                console.log(successMessage);
                deferred.resolve(successfulPostTestOutput);
            },
            function (error) {
                console.log(failureMessage);
                deferred.resolve(successfulPostTestOutput);
            });

        return deferred.promise;
    };
}