var merge = require('merge');

var ArgumentError = require('./lib/error').ArgumentError;

module.exports = ProtractorIstanbulPlugin;

function ProtractorIstanbulPlugin(options) {
    var instance = this;
    instance.preserveCoverage = function () {

    };

    instance.postTest = function () {

    };
    instance.teardown = function () {

    };


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
        boundFunction.boundParent[boundFunction.boundName] = instance.preserveCoverage;
    });
}