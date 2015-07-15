require('blanket')({
    pattern: function (filename) {
        var shouldInstrumentFile = !/node_modules/.test(filename);
        shouldInstrumentFile = shouldInstrumentFile && !/test/.test(filename);
        return shouldInstrumentFile;
    }
});