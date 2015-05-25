var redis = require('then-redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;
var config = require('./config');

describe('Queue.config', function () {

  var client = redis.createClient(config.redis);
  var queue = new Queue('test', client);


  beforeEach(function () {
    return client.flushall();
  });

  it('should return default configuration', function () {
    return queue.config()
      .then(function (config) {
        assert.propertyVal(config, 'timeout', 30000);
        assert.propertyVal(config, 'removeFailedAfter', null);
        assert.propertyVal(config, 'removeCompletedAfter', null);
      });
  });

  it('shouldn\'t error on empty configuration', function () {
    return queue.config({});
  });

  it('should set a configuration', function () {
    return queue.config({
      timeout: 1,
      removeFailedAfter: 2,
      removeCompletedAfter: 3,
      throttle: 4
    })
      .then(function (config) {
        assert.propertyVal(config, 'timeout', 1);
        assert.propertyVal(config, 'removeFailedAfter', 2);
        assert.propertyVal(config, 'removeCompletedAfter', 3);
        assert.propertyVal(config, 'throttle', 4);
      });
  });

});
