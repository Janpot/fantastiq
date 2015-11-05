'use strict';

var queueFactory = require('./queueFactory');
var assert = require('chai').assert;

describe('Queue.getN @http', function () {

  var queue;

  before(function () {
    return queueFactory.create()
      .then(function (_queue) {
        queue = _queue;
      });
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
      .then(function () {
        return queue.getN([]);
      })
      .then(function (jobs) {
        assert.lengthOf(jobs, 0);
      });
  });

  it('should preserve errors', function () {
    return queue.add(1)
      .then(function () {
        return queue.retrieve();
      })
      .then(function (result) {
        var error = new Error('Job error');
        error.stack = 'Error stacktrace';
        return queue.acknowledge(result.id, error);
      })
      .then(function (id) {
        return queue.getN([id]);
      })
      .then(function (jobs) {
        assert.instanceOf(jobs[0].error, Error);
        assert.propertyVal(jobs[0].error, 'message', 'Job error');
        assert.propertyVal(jobs[0].error, 'stack', 'Error stacktrace');
      });
  });

});

