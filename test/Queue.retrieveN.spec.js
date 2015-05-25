var redis = require('then-redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;
var Promise = require('bluebird');
var util = require('./util');

describe('Queue.retrieveN', function () {

  var client = redis.createClient({
    host: process.env.REDIS_HOST
  });
  var queue = new Queue('test', client);

  beforeEach(function () {
    return client.flushall();
  });


  it('should retrieve multiple items', function () {
    return queue.addN([0, 1, 2, 3, 4, 5])
      .then(function () {
        return queue.retrieveN(3);
      })
      .then(function (result) {
        assert.lengthOf(result.ids, 3);
        return result.ids;
      })
      .bind(queue)
      .then(queue.getN)
      .then(function (jobs) {
        jobs.forEach(function (job) {
          assert.strictEqual(job.state, 'active');
          assert.typeOf(job.started, 'number');
        });
        var data = jobs.map(function (job) {
          return job.data;
        });
        assert.deepEqual(data, [0, 1, 2]);
      });
  });

  it('should retrieve no items from empty queue', function () {
    return queue.retrieveN(3)
      .then(function (result) {
        assert.lengthOf(result.ids, 0);
      });
  });

  it('should retrieve no items when called with 0', function () {
    return queue.retrieveN(0)
      .then(function (result) {
        assert.lengthOf(result.ids, 0);
      });
  });

  it('should retrieve all items when more asked than exist', function () {
    return queue.addN([0, 1, 2])
      .then(function () {
        return queue.retrieveN(6);
      })
      .then(function (result) {
        assert.lengthOf(result.ids, 3);
        return result.ids;
      })
      .map(util.idToDataFrom(queue))
      .then(function (data) {
        assert.deepEqual(data, [0, 1, 2]);
      });
  });

  it('should default to 1 when throttled', function () {
    return queue.addN([0, 1, 2, 3, 4, 5])
      .then(function () {
        queue.config({
          throttle: 10000
        });
      })
      .then(function () {
        return queue.retrieveN(3);
      })
      .then(function (result) {
        assert.lengthOf(result.ids, 1);
        assert.isNotNull(result.wait);
      });
  });

});
