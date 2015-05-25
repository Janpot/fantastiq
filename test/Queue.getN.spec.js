var redis = require('then-redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;
var config = require('./config');

describe('Queue.getN', function () {

  var client = redis.createClient(config.redis);
  var queue = new Queue('test', client);

  beforeEach(function () {
    return client.flushall();
  });


  it('should return n jobs', function () {
    return queue.addN([0, 1, 2, 3, 4])
      .then(function (ids) {
        return queue.getN(ids.slice(2, 4));
      })
      .then(function (jobs) {
        assert.lengthOf(jobs, 2);
        assert.propertyVal(jobs[0], 'data', 2);
        assert.propertyVal(jobs[1], 'data', 3);
      });
  });

  it('shouldn\'t error on empty id array', function () {
    return queue.addN([0, 1, 2, 3, 4])
      .then(function (ids) {
        return queue.getN([]);
      })
      .then(function (jobs) {
        assert.lengthOf(jobs, 0);
      });
  });

});

