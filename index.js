var merge = require('merge');
var Q = require('q');
var fse = require('fs-extra');
var uuid = require('uuid');
var path = require('path');

var ArgumentError = require('./lib/error').ArgumentError;

var protractorIstanbulPluginInstance = new ProtractorIstanbulPlugin();
module.exports = protractorIstanbulPluginInstance;

function ProtractorIstanbulPlugin() {
    var instance = this;
    instance.options = {
        outputPath: "coverage",
        functions: []
    };

    instance.setup = function (options) {
        instance.options = merge(instance.options, options);

        // TODO - this is pretty jank
        instance.driver = undefined;
        instance.fs = fse;
        try {
            instance.driver = browser.driver;
        }
        catch (error) {}

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

        var successMessage = 'successfully preserved coverage during wrapped function call';
        var failureMessage = 'failed to preserve coverage during wrapped function call';

        instance.driver.executeScript('return __coverage__;')
            .then(
            function (coverageObject) {
                originalReturn = originalFunction.apply(this, originalArguments);
                instance.driver.executeScript('__coverage__ = arguments[0];', coverageObject).then(
                    function () {
                        console.log(successMessage);
                        deferred.resolve(originalReturn);
                    },
                    function () {
                        console.log(failureMessage);
                        deferred.resolve(originalReturn);
                    }
                );
            },
            function () {
                console.log(failureMessage);
                originalReturn = originalFunction.apply(this, originalArguments);
                deferred.resolve(originalReturn);
            })
            .catch(function (error) {
                console.log(failureMessage);
                deferred.reject(error);
            });
        return deferred.promise;
    };

    instance.postTest = function () {
        var deferred = Q.defer();
        var outputFilePath = path.join(instance.options.outputPath, uuid.v4() + '.json');
        var successMessage = 'successfully gathered coverage for test and stored in ' + outputFilePath;
        var failureMessage = 'failed to gather coverage for test and store in ' + outputFilePath;

        instance.driver.executeScript('return __coverage__;')
            .then(
            function (coverageObject) {
                instance.fs.outputJsonSync(outputFilePath, coverageObject);
                console.log(successMessage);
                deferred.resolve(coverageObject);
            },
            function (error) {
                console.log(failureMessage);
                deferred.reject(error);
            })
            .catch(function (error) {
                console.log(failureMessage);
                deferred.reject(error);
            });

        return deferred.promise;
    };
    instance.teardown = function () {
        return Q.resolve('no sweat');
    };
}