/* eslint-env mocha */

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');

module.exports = function (createQueue) {
  return function () {
    var clock = null;
    var queue = null;

    before(() => {
      queue = createQueue();
    });

    afterEach(function () {
      if (clock) {
        clock.restore();
        clock = null;
      }
    });

    it('should time out a job', function () {
      clock = sinon.useFakeTimers(Date.now());
      var jobId;
      return queue.config({
        timeout: 1000
      })
        .then(function () {
          return queue.addN([1, 2, 3, 4, 5]);
        })
        .then(function () {
          return queue.retrieve();
        })
        .then(function (result) {
          jobId = result.id;
          clock.tick(999);
          return queue._runTimeoutCycle();
        })
        .then(function (canceled) {
          assert.strictEqual(canceled, 0);
          return queue.get(jobId);
        })
        .then(function (job) {
          assert.propertyVal(job, 'state', 'active');
          return queue.stat();
        })
        .then(function (stats) {
          assert.propertyVal(stats, 'activeCount', 1);
          assert.propertyVal(stats, 'failedCount', 0);
          clock.tick(2);
          return queue._runTimeoutCycle();
        })
        .then(function (canceled) {
          assert.strictEqual(canceled, 1);
          return queue.get(jobId);
        })
        .then(function (job) {
          assert.propertyVal(job, 'state', 'failed');
          assert.instanceOf(job.error, Error);
          assert.propertyVal(job.error, 'message', 'Job timed out');
          assert.ok(job.error.stack);
          return queue.stat();
        })
        .then(function (stats) {
          assert.propertyVal(stats, 'activeCount', 0);
          assert.propertyVal(stats, 'failedCount', 1);
        });
    });

    it('should time out multiple jobs', function () {
      clock = sinon.useFakeTimers(Date.now());
      return queue.config({
        timeout: 1000
      })
        .then(function () {
          return queue.addN([1, 2, 3, 4, 5]);
        })
        .then(function () {
          return queue.retrieve();
        })
        .then(function () {
          clock.tick(500);
          return queue.retrieve();
        })
        .then(function () {
          clock.tick(499);
          return queue._runTimeoutCycle();
        })
        .then(function (canceled) {
          assert.strictEqual(canceled, 0);
          clock.tick(500);
          return queue.retrieve();
        })
        .then(function () {
          clock.tick(2);
          return queue._runTimeoutCycle();
        })
        .then(function (canceled) {
          assert.strictEqual(canceled, 2);
          return queue.range('failed');
        })
        .then(queue.getN.bind(queue))
        .each(function (job) {
          assert.propertyVal(job, 'state', 'failed');
          assert.instanceOf(job.error, Error);
          assert.propertyVal(job.error, 'message', 'Job timed out');
        });
    });

    it('should handle multiple attempts', function () {
      clock = sinon.useFakeTimers(Date.now());
      var jobId;
      return queue.config({
        timeout: 1000,
        attempts: 3
      })
        .then(function () {
          return queue.addN([1, 2, 3, 4, 5]);
        })
        .then(function () {
          return queue.retrieve();
        })
        .then(function (result) {
          jobId = result.id;
          clock.tick(1001);
          return queue._runTimeoutCycle();
        })
        .then(function (canceled) {
          assert.strictEqual(canceled, 1);
          return queue.get(jobId);
        })
        .then(function (job) {
          assert.propertyVal(job, 'state', 'inactive');
          assert.propertyVal(job, 'attempts', 1);
          assert.notOk(job.started);
          assert.notOk(job.finished);
        });
    });
  };
};
