/* eslint-env mocha */

'use strict';

var assert = require('chai').assert;
var redis = require('redis');
var Queue = require('../lib/Queue');
var QueueClient = require('../lib/QueueClient');
var express = require('express');

describe('QueueClient', function () {
  var client = null;
  var queue = null;
  var _queueClient = new QueueClient('http://localhost:3001/api');
  var server = null;

  function createQueue () {
    var _queueClient = new QueueClient('http://localhost:3001/api');
    _queueClient._runDelayedCycle = queue._runDelayedCycle.bind(queue);
    return _queueClient;
  }

  before(function (done) {
    client = redis.createClient({
      host: process.env.REDIS_HOST
    });
    queue = new Queue('test', client);
    _queueClient._runDelayedCycle = queue._runDelayedCycle.bind(queue);
    var app = express();
    app.use('/api', queue.api());
    server = app.listen(3001, done);
  });

  beforeEach(function (done) {
    return client.flushall(done);
  });

  after(function (done) {
    server.close();
    return client.quit(done);
  });

  after(function () {
    return queue.quit();
  });

  describe('.acknowledge', require('./Queue.acknowledge.spec')(createQueue));
  describe('.add', require('./Queue.add.spec')(createQueue));
  describe('.addN', require('./Queue.addN.spec')(createQueue));
  describe('.config', require('./Queue.config.spec')(createQueue));
  describe('.get', require('./Queue.get.spec')(createQueue));
  describe('.getN', require('./Queue.getN.spec')(createQueue));
  describe('.range', require('./Queue.range.spec')(createQueue));
  describe('.remove', require('./Queue.remove.spec')(createQueue));
  describe('.removeN', require('./Queue.removeN.spec')(createQueue));
  describe('.retrieve', require('./Queue.retrieve.spec')(createQueue));
  // describe.skip('events', require('./Queue.events.spec')(createQueue));

  it('should reject on non existing endpoint', function () {
    var queueClient = new QueueClient('http://nothing-here');
    return queueClient.add(1)
      .then(assert.fail, function (err) {
        assert.strictEqual(err.code, 'ENOTFOUND');
      });
  });
});
