var assert = require('assert');
var chai = require('chai');
var sinon = require('sinon');
var webdriver = require('selenium-webdriver');
var path = require('path');
var uuid = require('uuid');

require('./utilities');
var subjectPath = '../index';
var subject;
var result;

var expectedWrappedFunction = function () {
    return 'expected-result';
};
var expectedWrappedObject = {expectedWrappedFunction: expectedWrappedFunction};
expectedWrappedFunction.boundParent = expectedWrappedObject;
expectedWrappedFunction.boundName = "expectedWrappedFunction";

describe('protractor-istanbul-plugin', function () {
    beforeEach(function (done) {
        subject = require(subjectPath);
        done();
    });
    describe('::plugin', function () {
        it('should implement the setup plugin function', function (done) {
            assert.equal(subject.setup instanceof Function, true);
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
        it('should define a name via the name property', function (done) {
            assert.notEqual(subject.name, undefined);
            done();
        });
    });
    describe('#setup', function () {
        describe('with valid options', function () {
            describe('with enabled option provided and set to false', function () {
                beforeEach(function (done) {
                    subject.setup({
                        functions: [expectedWrappedObject.expectedWrappedFunction],
                        enabled: false
                    });
                    done();
                });
                it('should set its postTest function to undefined', function (done) {
                    assert.equal(subject.postTest, undefined);
                    done();
                });
                it('should set its preserveCoverage function to undefined', function (done) {
                    assert.equal(subject.preserveCoverage, undefined);
                    done();
                });
                it('should set its teardown function to undefined', function (done) {
                    assert.equal(subject.teardown, undefined);
                    done();
                });
                it('should not wrap the passed in function', function (done) {
                    assert.equal(expectedWrappedObject.expectedWrappedFunction, expectedWrappedFunction);
                    done();
                });
            });
            describe('with logAssertions option provided and set to false and failing call made', function () {
                beforeEach(function (done) {
                    subject.setup({
                        logAssertions: false
                    });
                    subject.logAssertion("whatever");
                    result = undefined;
                    var promised = subject.teardown();
                    promised.then(function (output) {
                        result = output;
                        done();
                    });
                });
                it('teardown call should produce no assertions', function (done) {
                    assert.deepEqual(result.specResults[0].assertions, []);
                    done();
                });
            });
            describe('with failAssertions option provided and set to true and failing call made', function () {
                beforeEach(function (done) {
                    subject.setup({
                        failAssertions: true
                    });
                    subject.logAssertion("whatever");
                    result = undefined;
                    var promised = subject.teardown();
                    promised.then(function (output) {
                        result = output;
                        done();
                    });
                });
                it('teardown call should produce a failure', function (done) {
                    assert.deepEqual(result.failedCount, 1);
                    done();
                });
            });
            describe('with all options provided', function () {
                beforeEach(function (done) {
                    sinon.spy(expectedWrappedObject, 'expectedWrappedFunction');
                    subject.setup({
                        outputPath: "some/path",
                        functions: [expectedWrappedObject.expectedWrappedFunction],
                        enabled: true,
                        logAssertions: true,
                        failAssertions: false
                    });
                    // this will be implicitly available via protractor
                    subject.driver = {
                        executeScript: function () {
                        }
                    };
                    done();
                });
                it('should wrap the provided functions(s) in its preserveCoverage method', function (done) {
                    assert.equal(expectedWrappedObject.expectedWrappedFunction, subject.preserveCoverage);
                    done();
                });
                describe('#preserveCoverage', function () {
                    describe('when wrapped function called with any number of arguments', function () {
                        beforeEach(function (done) {
                            sinon.stub(console, 'log');
                            done();
                        });
                        describe('and everything goes as planned', function () {
                            beforeEach(function (done) {
                                result = undefined;
                                sinon.stub(subject.driver, 'executeScript').returns(webdriver.promise.fulfilled({coverage: 'object'}));
                                var promised = expectedWrappedObject.expectedWrappedFunction('first arg', 'second arg');
                                promised.then(function (output) {
                                    result = output;
                                    done();
                                });
                            });
                            it('preserves coverage by getting it from the page with its driver', function (done) {
                                sinon.assert.calledWith(subject.driver.executeScript, 'return __coverage__;');
                                done();
                            });
                            it('calls the wrapped function with those arguments', function (done) {
                                sinon.assert.calledWithMatch(expectedWrappedObject.expectedWrappedFunction.originalFunction, 'first arg', 'second arg');
                                done();
                            });
                            it('returns (via promise) whatever the wrapped function would have returned', function (done) {
                                assert.equal(result, 'expected-result');
                                done();
                            });
                            it('preserves coverage by setting it back to the page with its driver', function (done) {
                                sinon.assert.calledWith(subject.driver.executeScript, '__coverage__ = arguments[0];', {coverage: 'object'});
                                done();
                            });
                            afterEach(function (done) {
                                subject.driver.executeScript.restore();
                                done();
                            });
                        });
                        describe('and some things fail', function () {
                            describe('like the task of getting the coverage', function () {
                                beforeEach(function (done) {
                                    result = undefined;
                                    sinon.stub(subject.driver, 'executeScript').onFirstCall().returns(webdriver.promise.rejected(new Error("error")));
                                    var promised = expectedWrappedObject.expectedWrappedFunction('first arg', 'second arg');
                                    promised.then(function (output) {
                                        result = output;
                                        done();
                                    }); // a lack of reject path here implies (unfortunately) that this should NOT reject
                                });
                                it('calls the wrapped function with those arguments', function (done) {
                                    sinon.assert.calledWithMatch(expectedWrappedObject.expectedWrappedFunction.originalFunction, 'first arg', 'second arg');
                                    done();
                                });
                                it('returns (via promise) whatever the wrapped function would have returned', function (done) {
                                    assert.equal(result, 'expected-result');
                                    done();
                                });
                                it('stores a resultsObject assertion warning that coverage preservation failed', function (done) {
                                    assert.equal(/Warning:.*?failed.*?preserve/.test(subject.teardownOutput.specResults[0].assertions[0].errorMsg), true);
                                    done();
                                });
                                afterEach(function (done) {
                                    subject.driver.executeScript.restore();
                                    done();
                                });
                            });
                            describe('like the execution of the wrapped function', function () {
                                beforeEach(function (done) {
                                    result = undefined;
                                    sinon.stub(subject.driver, 'executeScript').returns(webdriver.promise.fulfilled({coverage: 'object'}));
                                    expectedWrappedObject.expectedWrappedFunction.originalFunction = expectedWrappedFunction;
                                    sinon.stub(expectedWrappedObject.expectedWrappedFunction, 'originalFunction').throws(new Error("error"));
                                    var promised = expectedWrappedObject.expectedWrappedFunction('first arg', 'second arg');
                                    promised.then(
                                        function (output) {
                                            result = output;
                                            done();
                                        }
                                    ); // a lack of reject path here implies (unfortunately) that this should NOT reject
                                });
                                it('stores a resultsObject assertion warning that coverage preservation failed', function (done) {
                                    assert.equal(/Warning:.*?failed.*?preserve/.test(subject.teardownOutput.specResults[0].assertions[0].errorMsg), true);
                                    done();
                                });
                                afterEach(function (done) {
                                    subject.driver.executeScript.restore();
                                    expectedWrappedObject.expectedWrappedFunction.originalFunction.restore();
                                    done();
                                });
                            });
                            describe('like the task of setting the coverage', function () {
                                beforeEach(function (done) {
                                    result = undefined;
                                    sinon.stub(subject.driver, 'executeScript').onFirstCall().returns(webdriver.promise.fulfilled({coverage: 'object'}));
                                    subject.driver.executeScript.onSecondCall().returns(webdriver.promise.rejected(new Error('error')));
                                    var promised = expectedWrappedObject.expectedWrappedFunction('first arg', 'second arg');
                                    promised.then(function (output) {
                                        result = output;
                                        done();
                                    }); // a lack of reject path here implies (unfortunately) that this should NOT reject
                                });
                                it('calls the wrapped function with those arguments', function (done) {
                                    sinon.assert.calledWithMatch(expectedWrappedObject.expectedWrappedFunction.originalFunction, 'first arg', 'second arg');
                                    done();
                                });
                                it('returns (via promise) whatever the wrapped function would have returned', function (done) {
                                    assert.equal(result, 'expected-result');
                                    done();
                                });
                                it('stores a resultsObject assertion warning that coverage preservation failed', function (done) {
                                    assert.equal(/Warning:.*?failed.*?preserve/.test(subject.teardownOutput.specResults[0].assertions[0].errorMsg), true);
                                    done();
                                });
                                afterEach(function (done) {
                                    subject.driver.executeScript.restore();
                                    done();
                                });
                            });
                        });
                        afterEach(function (done) {
                            console.log.restore();
                            done();
                        });
                    });
                });
                describe('#postTest', function () {
                    describe('when called as part of a protractor run', function () {
                        beforeEach(function (done) {
                            sinon.stub(uuid, 'v4').returns('whonko');
                            sinon.stub(console, 'log');
                            done();
                        });
                        describe('and everything goes as planned', function () {
                            beforeEach(function (done) {
                                sinon.stub(subject.driver, 'executeScript').returns(webdriver.promise.fulfilled({coverage: 'object'}));
                                sinon.stub(subject.fs, 'outputJsonSync').returns(true);
                                var promised = subject.postTest();
                                promised.then(function (output) {
                                    result = output;
                                    done();
                                });
                            });
                            it('collects the coverage data from the page by calling its driver', function (done) {
                                sinon.assert.calledWith(subject.driver.executeScript, 'return __coverage__;');
                                done();
                            });
                            it('writes the coverage data to a file by calling its fs, using the output path and using a uuid for the file name', function (done) {
                                var expectedPath = path.join("some/path", 'whonko.json');
                                sinon.assert.calledWith(subject.fs.outputJsonSync, expectedPath, {coverage: 'object'});
                                done();
                            });
                            afterEach(function (done) {
                                subject.driver.executeScript.restore();
                                subject.fs.outputJsonSync.restore();
                                done();
                            });
                        });
                        describe('and some things fail', function () {
                            describe('like the script execution', function () {
                                beforeEach(function (done) {
                                    sinon.stub(subject.driver, 'executeScript').returns(webdriver.promise.rejected("some reason!"));
                                    sinon.stub(subject.fs, 'outputJsonSync').returns(true);
                                    var promised = subject.postTest();
                                    promised.then(
                                        function (output) {
                                            result = output;
                                            done();
                                        }
                                    ); // a lack of reject path here implies (unfortunately) that this should NOT reject
                                });
                                it('does not write the coverage data to a file by calling its fs, using the output path and using a uuid for the file name', function (done) {
                                    sinon.assert.neverCalledWith(subject.fs.outputJsonSync);
                                    done();
                                });
                                it('stores a resultsObject assertion warning that coverage gathering failed', function (done) {
                                    assert.equal(/Warning:.*?failed.*?gather.*?coverage/.test(subject.teardownOutput.specResults[0].assertions[0].errorMsg), true);
                                    done();
                                });
                                afterEach(function (done) {
                                    subject.driver.executeScript.restore();
                                    subject.fs.outputJsonSync.restore();
                                    done();
                                });
                            });
                            describe('like the file writing', function () {
                                beforeEach(function (done) {
                                    sinon.stub(subject.driver, 'executeScript').returns(webdriver.promise.fulfilled({coverage: 'object'}));
                                    sinon.stub(subject.fs, 'outputJsonSync').throws(new Error("error"));
                                    var promised = subject.postTest();
                                    promised.then(
                                        function (output) {
                                            result = output;
                                            done();
                                        }
                                    ); // a lack of reject path here implies (unfortunately) that this should NOT reject
                                });
                                it('stores a resultsObject assertion error that coverage gathering failed', function (done) {
                                    assert.equal(/Error:.*?failed.*?writ.*?coverage/.test(subject.teardownOutput.specResults[0].assertions[0].errorMsg), true);
                                    done();
                                });
                                it('it increments the failed count on the resultsObject for the plugin', function (done) {
                                    assert.equal(subject.teardownOutput.failedCount, 1);
                                    done();
                                });
                                afterEach(function (done) {
                                    subject.driver.executeScript.restore();
                                    subject.fs.outputJsonSync.restore();
                                    done();
                                });
                            });
                        });
                        afterEach(function (done) {
                            uuid.v4.restore();
                            console.log.restore();
                            done();
                        });
                    });
                });
                describe('#teardown', function () {
                    beforeEach(function (done) {
                        result = undefined;
                        var promised = subject.teardown();
                        promised.then(function (output) {
                            result = output;
                            done();
                        });
                    });
                    it('should just return whatever it has set in its teardownOutput object, which has been verified to update correctly in other tests', function (done) {
                        assert.equal(result, subject.teardownOutput);
                        done();
                    });
                });
                afterEach(function (done) {
                    expectedWrappedObject = {expectedWrappedFunction: expectedWrappedFunction};
                    expectedWrappedFunction.boundParent = expectedWrappedObject;
                    expectedWrappedFunction.boundName = "expectedWrappedFunction";
                    done();
                });
            });
        });
        describe('with invalid options', function () {
            describe('with invalid enabled option', function () {
                it('throws an exception stating that enabled is invalid', function (done) {
                    chai.expect(function () {
                        subject.setup({enabled: undefined});
                    }).to.throw('ArgumentError');
                    done();
                })
            });
            describe('with invalid outputPath option', function () {
                it('throws an exception stating that outputPath is invalid', function (done) {
                    chai.expect(function () {
                        subject.setup({outputPath: undefined});
                    }).to.throw('ArgumentError');
                    done();
                })
            });
            describe('with invalid functions option', function () {
                describe('with functions option that is not an array', function () {
                    it('throws an exception stating that functions is/are invalid', function (done) {
                        chai.expect(function () {
                            subject.setup({functions: undefined});
                        }).to.throw('ArgumentError');
                        done();
                    })
                });
                describe('with functions option that is not an array of functions', function () {
                    it('throws an exception stating that functions is/are invalid', function (done) {
                        chai.expect(function () {
                            subject.setup({functions: [undefined]});
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
                            subject.setup({functions: [badFunction]});
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
                            subject.setup({functions: [badFunction]});
                        }).to.throw('ArgumentError');
                        done();
                    })
                });
            });
        });
    });
    afterEach(function (done) {
        delete require.cache[require.resolve(subjectPath)];
        done();
    });
});