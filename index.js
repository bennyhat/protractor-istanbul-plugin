var merge = require('merge');
var Q = require('q');

var ArgumentError = require('./lib/error').ArgumentError;

module.exports = ProtractorIstanbulPlugin;

function ProtractorIstanbulPlugin(options) {
    var instance = this;
    instance.preserveCoverage = function () {
        var originalFunction = arguments.callee.originalFunction;
        var originalArguments = arguments;
        var deferred = Q.defer();

        instance.driver.executeScript('return __coverage__;').then(
            function (coverageObject) {
                var childDeferred = Q.defer();
                originalFunction.apply(this, originalArguments);
                instance.driver.executeScript('__coverage__ = arguments[0];', coverageObject).then(
                    function () {
                        deferred.resolve('whatever');
                    }
                );
            }
        );
        return deferred.promise;
    };

    instance.postTest = function () {

    };
    instance.teardown = function () {

    };
    // TODO - this is pretty jank
    try {
        instance.driver = driver;
    }
    catch (error) {
        instance.driver = undefined;
    }
    var defaultOptions = {
        outputPath: ".",
        functions: []
    };

    options = merge(defaultOptions, options);

    if (typeof options.outputPath !== 'string') throw new ArgumentError("");
    if (!(options.functions instanceof Array)) throw new ArgumentError("");
    options.functions.forEach(function (boundFunction) {
        if (!(boundFunction instanceof Function)) throw new ArgumentError("");
        if (!boundFunction.boundParent) throw new ArgumentError("");
        if (!boundFunction.boundName) throw new ArgumentError("");
    });

    options.functions.forEach(function (boundFunction) {
        function Proxy() {
            this.originalFunction = boundFunction;
            var f = instance.preserveCoverage;
            f.__proto__ = this;
            return f;
        }

        boundFunction.boundParent[boundFunction.boundName] = new Proxy();
    });
}