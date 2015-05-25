var redis = require('then-redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;
var util = require('./util');

describe('Queue.range', function () {

  var client = redis.createClient({
    host: process.env.REDIS_HOST
  });
  var queue = new Queue('test', client);

  beforeEach(function () {
    return client.flushall();
  });


  it('should return range 10 asc by default', function () {
    return queue.addN([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
      .then(function () {
        return queue.range('inactive');
      })
      .map(util.idToDataFrom(queue))
      .then(function (data) {
        assert.deepEqual(data, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      });
  });

  it('should return [count] jobs', function () {
    return queue.addN([0, 1, 2, 3, 4, 5])
      .then(function () {
        return queue.range('inactive', { count: 3 });
      })
      .map(util.idToDataFrom(queue))
      .then(function (data) {
        assert.deepEqual(data, [0, 1, 2]);
      });
  });

  it('should return [order] jobs', function () {
    return queue.addN([0, 1, 2])
      .then(function () {
        return queue.range('inactive', { order: 'desc' });
      })
      .map(util.idToDataFrom(queue))
      .then(function (data) {
        assert.deepEqual(data, [2, 1, 0]);
      });
  });

  it('should return jobs starting from [start]', function () {
    return queue.addN([0, 1, 2, 3, 4, 5])
      .then(function (ids) {
        return queue.range('inactive', { start: ids[3] });
      })
      .map(util.idToDataFrom(queue))
      .then(function (data) {
        assert.deepEqual(data, [3, 4, 5]);
      });
  });

  it('should return jobs descending from [start]', function () {
    return queue.addN([0, 1, 2, 3, 4, 5])
      .then(function (ids) {
        return queue.range('inactive', { start: ids[2], order: 'desc' });
      })
      .map(util.idToDataFrom(queue))
      .then(function (data) {
        assert.deepEqual(data, [2, 1, 0]);
      });
  });

  it('should return [count] jobs from [start]', function () {
    return queue.addN([0, 1, 2, 3, 4, 5])
      .then(function (ids) {
        return queue.range('inactive', { start: ids[2], count: 3 });
      })
      .map(util.idToDataFrom(queue))
      .then(function (data) {
        assert.deepEqual(data, [2, 3, 4]);
      });
  });

  it('should return [count] jobs from [start] in [order]', function () {
    return queue.addN([0, 1, 2, 3, 4, 5])
      .then(function (ids) {
        return queue.range('inactive', {
          start: ids[4],
          count: 3,
          order: 'desc'
        });
      })
      .map(util.idToDataFrom(queue))
      .then(function (data) {
        assert.deepEqual(data, [4, 3, 2]);
      });
  });

  it('should return jobs from non-existing [start]', function () {
    var id = null;
    return queue.addN([0, 1, 2, 3, 4, 5])
      .then(function (ids) {
        id = ids[2];
        return queue.remove(id);
      })
      .then(function () {
        return queue.range('inactive', {
          start: id
        });
      })
      .map(util.idToDataFrom(queue))
      .then(function (data) {
        assert.deepEqual(data, [3, 4, 5]);
      });
  });

  it('should return jobs from non-existing [start] at end', function () {
    var id = null;
    return queue.addN([0, 1, 2, 3, 4, 5])
      .then(function (ids) {
        id = ids[5];
        return queue.removeN(ids.slice(3));
      })
      .then(function () {
        return queue.range('inactive', { start: id });
      })
      .map(util.idToDataFrom(queue))
      .then(function (data) {
        assert.deepEqual(data, []);
      });
  });

  it('should return jobs from non-existing [start] at start', function () {
    var id = null;
    return queue.addN([0, 1, 2, 3, 4, 5])
      .then(function (ids) {
        id = ids[0];
        return queue.removeN(ids.slice(0, 3));
      })
      .then(function () {
        return queue.range('inactive', { start: id, order: 'desc' });
      })
      .map(util.idToDataFrom(queue))
      .then(function (data) {
        assert.deepEqual(data, []);
      });
  });

});

