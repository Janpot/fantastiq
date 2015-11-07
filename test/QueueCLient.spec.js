'use strict';

var assert = require('chai').assert;
var redis = require('redis');
var Queue = require('../lib/Queue');
var QueueClient = require('../lib/QueueClient');
var express = require('express');

describe('QueueClient', function () {

  var client = redis.createClient({
    host: process.env.REDIS_HOST
  });
  var queue = new Queue('test', client);
  var _queueClient = new QueueClient('http://localhost:3001/api');
  _queueClient._runDelayedCycle = queue._runDelayedCycle.bind(queue);

  var app = express();
  app.use('/api', queue.api());

  before(function (done) {
    return app.listen(3001, done);
  });

  beforeEach(function (done) {
    return client.flushall(done);
  });

  after(function (done) {
    return client.quit(done);
  });

  describe('.acknowledge', require('./Queue.acknowledge.spec')(_queueClient));
  describe('.add', require('./Queue.add.spec')(_queueClient));
  describe('.addN', require('./Queue.addN.spec')(_queueClient));
  describe('.config', require('./Queue.config.spec')(_queueClient));
  describe('.get', require('./Queue.get.spec')(_queueClient));
  describe('.getN', require('./Queue.getN.spec')(_queueClient));
  describe('.range', require('./Queue.range.spec')(_queueClient));
  describe('.remove', require('./Queue.remove.spec')(_queueClient));
  describe('.removeN', require('./Queue.removeN.spec')(_queueClient));
  describe('.retrieve', require('./Queue.retrieve.spec')(_queueClient));

  it('should reject on non existing endpoint', function () {
    var queueClient = new QueueClient('http://nothing-here');
    return queueClient.add(1)
      .then(assert.fail, function (err) {
        assert.strictEqual(err.code, 'ENOTFOUND');
      });
  });

});
