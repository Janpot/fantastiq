/* eslint-env mocha */

'use strict';

var Worker = require('../lib/Worker');
var Promise = require('bluebird');
var assert = require('chai').assert;
var redis = require('redis');
var Queue = require('../lib/Queue');

describe('Worker', function () {
  var client = null;
  var queue = null;

  before(() => {
    client = redis.createClient({
      host: process.env.REDIS_HOST
    });
    queue = new Queue('test', client);
  });

  beforeEach(function (done) {
    return client.flushall(done);
  });

  after(function (done) {
    queue.quit().then(function () {
      return client.quit(done);
    });
  });

  it('should execute jobs', function () {
    var count = 0;
    var ids;

    var worker = new Worker(queue, function (job) {
      count += 1;
      if (count >= 5) {
        worker.stop();
      }

      return Promise.delay(1).then(function () {
        if (count % 2 === 0) {
          throw new Error('Job failed');
        }
        return job * 2;
      });
    });

    Promise.delay(1).then(function () {
      queue.addN([1, 2, 3, 4, 5, 6]).then(function (_ids) {
        ids = _ids;
      });
    });

    return worker.start()
      .then(function (result) {
        assert.propertyVal(result, 'completed', 3);
        assert.propertyVal(result, 'failed', 2);
        return queue.getN(ids);
      })
      .then(function (jobs) {
        assert.propertyVal(jobs[0], 'state', 'completed');
        assert.propertyVal(jobs[0], 'result', 2);
        assert.propertyVal(jobs[1], 'state', 'failed');
        assert.strictEqual(jobs[1].error.message, 'Job failed');
        assert.propertyVal(jobs[2], 'state', 'completed');
        assert.propertyVal(jobs[2], 'result', 6);
        assert.propertyVal(jobs[3], 'state', 'failed');
        assert.strictEqual(jobs[3].error.message, 'Job failed');
        assert.propertyVal(jobs[4], 'state', 'completed');
        assert.propertyVal(jobs[4], 'result', 10);
        assert.propertyVal(jobs[5], 'state', 'inactive');
      });
  });

  it('shouldn\'t fail when workfunction throws', function () {
    var id;
    var worker = new Worker(queue, function () {
      worker.stop();
      throw new Error('Worker error');
    });
    queue.add(1).then(function (_id) {
      id = _id;
    });
    return worker.start()
      .then(function (result) {
        assert.propertyVal(result, 'completed', 0);
        assert.propertyVal(result, 'failed', 1);
        return queue.get(id);
      })
      .then(function (job) {
        assert.propertyVal(job, 'state', 'failed');
        assert.strictEqual(job.error.message, 'Worker error');
      });
  });

  it('should restart', function () {
    var worker = new Worker(queue, function (job) {
      worker.stop();
      return Promise.delay(1).then(function () {
        return job * 2;
      });
    });
    queue.addN([1, 2, 3]);
    return worker.start()
      .then(function (result) {
        assert.propertyVal(result, 'completed', 1);
        assert.propertyVal(result, 'failed', 0);
        return worker.start();
      })
      .then(function (result) {
        assert.propertyVal(result, 'completed', 2);
        assert.propertyVal(result, 'failed', 0);
      });
  });
});
