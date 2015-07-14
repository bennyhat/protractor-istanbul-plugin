var assert = require('assert');
var chai = require('chai');

var ProtractorIstanbulPlugin = require('../index');
var subject;

var expectedWrappedFunction = function () {
};
var expectedWrappedObject = {expectedWrappedFunction: expectedWrappedFunction};
expectedWrappedFunction.boundParent = expectedWrappedObject;
expectedWrappedFunction.boundName = "expectedWrappedFunction";

describe('protractor-istanbul-plugin', function () {
    describe('#constructor', function () {
        describe('with valid options', function () {
            describe('with all options provided', function () {
                beforeEach(function (done) {
                    subject = new ProtractorIstanbulPlugin({
                        outputPath: "some/path",
                        functions: [expectedWrappedFunction]
                    });
                    done();
                });
                it('should implement the postTest plugin function', function (done) {
                    assert.equal(subject.postTest instanceof Function, true);
                    done();
                });
                it('should implement the teardown plugin function', function (done) {
                    assert.equal(subject.teardown instanceof Function, true);
                    done();
                });
                it('should wrap the provided functions(s) in its preserveCoverage method', function (done) {
                    assert.equal(expectedWrappedObject.expectedWrappedFunction, subject.preserveCoverage);
                    done();
                });
            });

        });
        describe('with invalid options', function () {
            describe('with invalid outputPath option', function () {
                it('throws an exception stating that outputPath is invalid', function (done) {
                    chai.expect(function () {
                        subject = new ProtractorIstanbulPlugin({outputPath: undefined});
                    }).to.throw('ArgumentError');
                    done();
                })
            });
            describe('with invalid functions option', function () {
                describe('with functions option that is not an array', function () {
                    it('throws an exception stating that functions is/are invalid', function (done) {
                        chai.expect(function () {
                            subject = new ProtractorIstanbulPlugin({functions: undefined});
                        }).to.throw('ArgumentError');
                        done();
                    })
                });
                describe('with functions option that is not an array of functions', function () {
                    it('throws an exception stating that functions is/are invalid', function (done) {
                        chai.expect(function () {
                            subject = new ProtractorIstanbulPlugin({functions: [undefined]});
                        }).to.throw('ArgumentError');
                        done();
                    })
                });
                describe('with functions that do not have boundParent set', function () {
                    it('throws an exception stating that functions is/are invalid', function (done) {
                        var badFunction = function () {
                        };
                        badFunction.boundName = "whatever";
                        chai.expect(function () {
                            subject = new ProtractorIstanbulPlugin({functions: [badFunction]});
                        }).to.throw('ArgumentError');
                        done();
                    })
                });
                describe('with functions that do not have boundName set', function () {
                    it('throws an exception stating that functions is/are invalid', function (done) {
                        var badFunction = function () {
                        };
                        badFunction.boundParent = {};
                        chai.expect(function () {
                            subject = new ProtractorIstanbulPlugin({functions: [badFunction]});
                        }).to.throw('ArgumentError');
                        done();
                    })
                });
            });
        });
    });
});