'use strict';

var queueFactory = require('./queueFactory');
var assert = require('chai').assert;

describe('Queue.config @http', function () {

  var queue;

  before(function () {
    return queueFactory.create()
      .then(function (_queue) {
        queue = _queue;
      });
  });

  it('should return default configuration', function () {
    return queue.config()
      .then(function (config) {
        assert.propertyVal(config, 'timeout', 30000);
        assert.notOk(config.removeFailedAfter);
        assert.notOk(config.removeCompletedAfter);
        assert.notOk(config.throttle);
        assert.notOk(config.attempts);
        assert.notOk(config.backoff);
        assert.notOk(config.unique);
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
      throttle: 4,
      attempts: 5,
      backoff: 6,
      unique: true
    })
      .then(function (config) {
        assert.propertyVal(config, 'timeout', 1);
        assert.propertyVal(config, 'removeFailedAfter', 2);
        assert.propertyVal(config, 'removeCompletedAfter', 3);
        assert.propertyVal(config, 'throttle', 4);
        assert.propertyVal(config, 'attempts', 5);
        assert.propertyVal(config, 'backoff', 6);
        assert.propertyVal(config, 'unique', true);
      });
  });

});
