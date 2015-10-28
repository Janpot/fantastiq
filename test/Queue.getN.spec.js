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

});

