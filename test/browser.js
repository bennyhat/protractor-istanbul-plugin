var sinon = require('sinon');
var assert = require('assert');
var Q = require('q');
var driver = {executeScript: function(){}};
var utilities = require('./utilities');

var subjectPath = '../lib/browser';
var subject;

function unaryPromisePassThrough() { return Q.resolve('script return value') }
function unaryPromiseRejection() { return Q.reject('failure something, something') }

describe('browser', function () {
    beforeEach(function (done) {
        subject = require(subjectPath);
        done();
    });
    describe('::executeJavaScript', function () {
        describe('when given a valid selenium driver to use', function () {
            beforeEach(function (done) {
                sinon.stub(driver, 'executeScript', unaryPromisePassThrough);
                subject.setDriver(driver);
                done();
            });
            describe('when given a valid piece of JavaScript to execute', function () {
                it('uses its underlying browser driver to execute the script', function (done) {
                    var assignedScript = 'valid script chunk;';
                    subject.executeScript(assignedScript, function (error) {
                        if (error) throw error;
                        sinon.assert.calledWith(driver.executeScript, assignedScript);
                        done();
                    });
                });
                describe('but the script executes unsuccessfully', function () {
                    beforeEach(function (done) {
                        driver.executeScript.restore();
                        sinon.stub(driver, 'executeScript', unaryPromiseRejection);
                        subject.setDriver(driver);
                        done();
                    });
                    it('it returns an appropriate error', function (done) {
                        var assignedScript = 'valid script chunk;';
                        subject.executeScript(assignedScript, function (error) {
                            assert.notEqual(error, undefined);
                            assert.equal(error.name, 'ScriptExecutionError');
                            done();
                        });
                    });
                });
            });
            describe('when given an invalid piece of JavaScript to execute', function () {
                it('it rejects a non-string piece of script with an appropriate error code', function (done) {
                    var assignedScript = null;
                    subject.executeScript(assignedScript, function (error) {
                        assert.notEqual(error, undefined);
                        assert.equal(error.name, 'ArgumentError');
                        done();
                    });
                });
            });
            afterEach(function (done) {
                driver.executeScript.restore();
                done();
            });
        });
    });
    describe('::setDriver', function () {
        describe('when given an invalid selenium driver to use', function () {
            it('it rejects a non-webdriver driver with an appropriate error code', function (done) {
                var assignedDriver = null;
                try {
                    subject.setDriver(assignedDriver);
                }
                catch (error) {
                    assert.notEqual(error, undefined);
                    assert.equal(error.name, 'InterfaceError');
                    done();
                }
            });
        });
        describe('when not given any driver at all to use', function () {
            describe('when given a valid piece of JavaScript to execute', function () {
                it('it returns an appropriate error', function (done) {
                    var assignedScript = 'valid script chunk;';
                    subject.executeScript(assignedScript, function (error) {
                        assert.notEqual(error, undefined);
                        assert.equal(error.name, 'InterfaceError');
                        done();
                    });
                });
            });
        });
    });
    afterEach(function (done) {
        delete require.cache[require.resolve(subjectPath)];
        done();
    });
});
