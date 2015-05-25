var redis = require('then-redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;
var config = require('./config');
var Promise = require('bluebird');
var util = require('./util');

describe('Queue.retrieve', function () {

  var client = redis.createClient(config.redis);
  var queue = new Queue('test', client);

  beforeEach(function () {
    return client.flushall();
  });

  it('should retrieve jobs', function () {
    return queue.addN([1, 2, 3])
      .then(function () {
        return queue.stat();
      })
      .then(function (stats) {
        assert.propertyVal(stats, 'inactiveCount', 3);
        assert.propertyVal(stats, 'activeCount', 0);
        return queue.retrieve();
      })
      .get('id').bind(queue).then(queue.get)
      .then(function (job) {
        assert.strictEqual(job.state, 'active');
        assert.typeOf(job.started, 'number');
        assert.strictEqual(job.data, 1);
        return queue.stat();
      })
      .then(function (stats) {
        assert.propertyVal(stats, 'inactiveCount', 2);
        assert.propertyVal(stats, 'activeCount', 1);
        return queue.retrieve();
      })
      .get('id').bind(queue).then(queue.get)
      .then(function (job) {
        assert.typeOf(job.started, 'number');
        assert.strictEqual(job.data, 2);
        return queue.stat();
      })
      .then(function (stats) {
        assert.propertyVal(stats, 'inactiveCount', 1);
        assert.propertyVal(stats, 'activeCount', 2);
      });
  });

  it('should retrieve null from empty queue', function () {
    return queue.retrieve()
      .then(function (result) {
        assert.isNull(result.id);
      });
  });

  it('should retrieve in the right order', function () {
    var data = [];
    for (var i = 0; i < 100; i++) {
      data.push(i);
    }
    return queue.addN(data)
      .then(function () {
        return Promise.map(data, function () {
          return queue.retrieve().get('id').bind(queue).then(queue.get);
        });
      })
      .then(function (jobs) {
        var retrievedData = jobs.map(function (job) {
          return job.data;
        });
        assert.deepEqual(retrievedData, data);
      });
  });

  it('should respect priority', function () {
    return queue.add(1, { priority: 10 })
      .then(function (job) {
        return queue.add(3, { priority: 0 });
      })
      .then(function (job) {
        return queue.add(2, { priority: 0 });
      })
      .then(function () {
        return queue.retrieve();
      })
      .get('id').bind(queue).then(queue.get)
      .then(function (job) {
        assert.strictEqual(job.data, 3);
        return queue.retrieve();
      })
      .get('id').bind(queue).then(queue.get)
      .then(function (job) {
        assert.strictEqual(job.data, 2);
        return queue.retrieve();
      })
      .get('id').bind(queue).then(queue.get)
      .then(function (job) {
        assert.strictEqual(job.data, 1);

      });
  });

  it('should recognize negative priority', function () {
    return queue.add(1, { priority: 0 })
      .then(function (job) {
        return queue.add(2, { priority: -1 });
      })
      .then(function () {
        return queue.retrieve();
      })
      .get('id').bind(queue).then(queue.get)
      .then(function (job) {
        assert.strictEqual(job.data, 2);
        return queue.retrieve();
      })
      .get('id').bind(queue).then(queue.get)
      .then(function (job) {
        assert.strictEqual(job.data, 1);
        return queue.retrieve();
      });
  });

  it('shouldn\'t throttle when no configured', function () {
    return queue.addN([0, 1, 2])
      .then(function () {
        return queue.retrieve();
      })
      .then(function (result) {
        assert.isNotNull(result.id);
        assert.isNull(result.wait);
      });
  });

  it('should throttle when configured', function () {
    return queue.addN([0, 1, 2, 3, 4, 5])
      .then(function () {
        queue.config({
          throttle: 10000
        });
      })
      .then(function () {
        return queue.retrieve();
      })
      .then(function (result) {
        assert.isNotNull(result.id);
        assert.isNotNull(result.wait);
        return queue.retrieve();
      })
      .then(function (result) {
        assert.isNull(result.id);
        assert.isNotNull(result.wait);
        return queue.retrieve({ unthrottle: true });
      })
      .then(function (result) {
        assert.isNotNull(result.id);
        assert.isNotNull(result.wait);
        return queue.retrieve({ unthrottle: false });
      })
      .then(function (result) {
        assert.isNull(result.id);
        assert.isNotNull(result.wait);
      });
  });

});
