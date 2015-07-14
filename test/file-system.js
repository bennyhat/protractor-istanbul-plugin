var sinon = require('sinon');
var chai = require('chai');
var assert = require('assert');
var utilities = require('./utilities');

var subjectPath = '../lib/file-system';
var subject;

describe('file-system', function () {
    beforeEach(function (done) {
        subject = require(subjectPath);
        done();
    });
    describe('::outputJsonSync', function () {
        beforeEach(function (done) {
            sinon.stub(subject.fs, 'outputJsonSync');
            done();
        });
        describe('when given a valid object', function () {
            describe('when given a valid path', function () {
                it('uses its underlying fs library to write the object to the file', function (done) {
                    var assignedObject = {};
                    var assignedFilePath = 'some/path';
                    subject.writeJsonToFile(assignedObject, assignedFilePath);
                    sinon.assert.calledWith(subject.fs.outputJsonSync, assignedFilePath, assignedObject);
                    done();
                });
            });
            describe('when given an invalid path', function () {
                it('it rejects a non-string path with an appropriate error code', function (done) {
                    var assignedObject = {};
                    var assignedFilePath = null;
                    chai.expect(function () {
                        subject.writeJsonToFile(assignedObject, assignedFilePath);
                    }).to.throw('ArgumentError');
                    done();
                });
            });
        });
        describe('when given an invalid object', function () {
            it('it rejects a non-object object with an appropriate error code', function (done) {
                var assignedObject = undefined; // null is okay
                var assignedFilePath = 'some/path';
                chai.expect(function () {
                    subject.writeJsonToFile(assignedObject, assignedFilePath);
                }).to.throw('ArgumentError');
                done();
            });
        });
        afterEach(function (done) {
            subject.fs.outputJsonSync.restore();
            done();
        });
    });
    afterEach(function (done) {
        delete require.cache[require.resolve(subjectPath)];
        done();
    });
});
