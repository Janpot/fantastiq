'use strict';

var redis = require('then-redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;
var Promise = require('bluebird');
var sinon = require('sinon');

describe('Queue.retrieve', function () {

  var client = redis.createClient({ host: process.env.REDIS_HOST });
  var queue = new Queue('test', client);
  var clock = null;
  var randomStub = null;

  beforeEach(function () {
    return client.flushall();
  });

  afterEach(function () {
    if (clock) {
      clock.restore();
      clock = null;
    }
    if (randomStub) {
      randomStub.restore();
      randomStub = null;
    }
  });

  it('should retrieve jobs', function () {
    var ids;
    return queue.addN([1, 2, 3])
      .then(function (_ids) {
        ids = _ids;
        return queue.stat();
      })
      .then(function (stats) {
        assert.propertyVal(stats, 'inactiveCount', 3);
        assert.propertyVal(stats, 'activeCount', 0);
        return queue.retrieve();
      })
      .then(function (result) {
        assert.propertyVal(result, 'id', ids[0]);
        assert.propertyVal(result, 'data', 1);
        assert.propertyVal(result, 'wait', 0);
        return queue.get(result.id);
      })
      .then(function (job) {
        assert.strictEqual(job.state, 'active');
        assert.typeOf(job.started, 'number');
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
        assert.isNull(result.data);
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
      .then(function () {
        return queue.add(3, { priority: 0 });
      })
      .then(function () {
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
      .then(function () {
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
        assert.propertyVal(result, 'wait', 0);
      });
  });

  it('should throttle when configured', function () {
    clock = sinon.useFakeTimers(Date.now());
    var ids = null;
    return queue.addN([0, 1, 2, 3, 4, 5])
      .then(function (_ids) {
        ids = _ids;
        return queue.config({ throttle: 10000 });
      })
      .then(function () {
        return queue.retrieve();
      })
      .then(function (result) {
        assert.propertyVal(result, 'id', ids[0]);
        assert.propertyVal(result, 'wait', 10000);
        clock.tick(1);
        return queue.retrieve();
      })
      .then(function (result) {
        assert.isNull(result.id);
        assert.propertyVal(result, 'wait', 9999);
        clock.tick(9998);
        return queue.retrieve();
      })
      .then(function (result) {
        assert.isNull(result.id);
        assert.propertyVal(result, 'wait', 1);
        clock.tick(2);
        return queue.retrieve();
      })
      .then(function (result) {
        assert.propertyVal(result, 'id', ids[1]);
        assert.propertyVal(result, 'wait', 10000);
      });
  });

  it('should unthrottle when asked', function () {
    clock = sinon.useFakeTimers(Date.now());
    var ids = null;
    return queue.addN([0, 1, 2, 3, 4, 5])
      .then(function (_ids) {
        ids = _ids;
        return queue.config({ throttle: 10000 });
      })
      .then(function () {
        return queue.retrieve();
      })
      .then(function (result) {
        assert.propertyVal(result, 'id', ids[0]);
        assert.propertyVal(result, 'wait', 10000);
        clock.tick(5000);
        return queue.retrieve({ unthrottle: true });
      })
      .then(function (result) {
        assert.propertyVal(result, 'id', ids[1]);
        assert.propertyVal(result, 'wait', 10000);
        clock.tick(5000);
        return queue.retrieve({ unthrottle: 'true-like' });
      })
      .then(function (result) {
        assert.propertyVal(result, 'id', ids[2]);
        assert.propertyVal(result, 'wait', 10000);
        clock.tick(5500);
        return queue.retrieve({ unthrottle: false });
      })
      .then(function (result) {
        assert.isNull(result.id);
        assert.propertyVal(result, 'wait', 4500);
      });
  });

  it('shouldn\'t throttle when no items retrieved', function () {
    return queue.config({ throttle: 10000 })
      .then(function () {
        return queue.retrieve();
      })
      .then(function (result) {
        assert.isNull(result.id);
        assert.propertyVal(result, 'wait', 0);
      });
  });

  it('should throttle even when no item retrieved', function () {
    clock = sinon.useFakeTimers(Date.now());
    return queue.add(0)
      .then(function () {
        return queue.config({ throttle: 10000 });
      })
      .then(function () {
        return queue.retrieve();
      })
      .then(function () {
        clock.tick(5500);
        return queue.retrieve();
      })
      .then(function (result) {
        assert.isNull(result.id);
        assert.propertyVal(result, 'wait', 4500);
      });
  });

  it('should retrieve random jobs', async function () {
    randomStub = sinon.stub(Math, 'random');

    var ids = await queue.addN([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    randomStub.returns(7 / 10);
    var retrieval = await queue.retrieve({ random: true });
    assert.strictEqual(retrieval.id, ids[7]);

    randomStub.returns(2 / 9);
    retrieval = await queue.retrieve({ random: true });
    assert.strictEqual(retrieval.id, ids[2]);

    randomStub.returns(0);
    retrieval = await queue.retrieve({ random: true });
    assert.strictEqual(retrieval.id, ids[0]);

    randomStub.returns(0.99999999999999);
    retrieval = await queue.retrieve({ random: true });
    assert.strictEqual(retrieval.id, ids[9]);
  });

  it('should respect priority on random jobs', async function () {
    randomStub = sinon.stub(Math, 'random');

    await queue.addN([1, 2, 3, 4, 5], { priority: 10 });
    var ids = await queue.addN([6, 7, 8, 9, 10], { priority: 5 });

    randomStub.returns(3 / 5);
    var retrieval = await queue.retrieve({ random: true });
    assert.strictEqual(retrieval.id, ids[3]);
  });

  it('shouldn\'t fail when random call on empty queue', async function () {
    randomStub = sinon.stub(Math, 'random');
    randomStub.returns(0.5);
    var retrieval = await queue.retrieve({ random: true });
    assert.isNull(retrieval.id);
  });

});
