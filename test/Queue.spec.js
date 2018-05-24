/* eslint-env mocha */

'use strict';

var redis = require('redis');
var Queue = require('../lib/Queue');

describe('Queue', function () {
  var client = null;
  var queues = [];

  function createQueue () {
    const queue = new Queue('test', client);
    queues.push(queue);
    return queue;
  }

  before(() => {
    client = redis.createClient({
      host: process.env.REDIS_HOST
    });
  });

  beforeEach(function (done) {
    return client.flushall(done);
  });

  after(function (done) {
    Promise.all(queues.map(queue => queue.quit()))
      .then(function () {
        return client.quit(done);
      });
  });

  describe('.acknowledge', require('./Queue.acknowledge.spec')(createQueue));
  describe('.add', require('./Queue.add.spec')(createQueue));
  describe('.addN', require('./Queue.addN.spec')(createQueue, client));
  describe('.config', require('./Queue.config.spec')(createQueue));
  describe('.get', require('./Queue.get.spec')(createQueue));
  describe('.getN', require('./Queue.getN.spec')(createQueue));
  describe('.range', require('./Queue.range.spec')(createQueue));
  describe('.remove', require('./Queue.remove.spec')(createQueue));
  describe('.removeN', require('./Queue.removeN.spec')(createQueue));
  describe('.retrieve', require('./Queue.retrieve.spec')(createQueue));
  describe('events', require('./Queue.events.spec')(createQueue));

  describe('._runCleanupCycle', require('./Queue._runCleanupCycle.spec')(createQueue));
  describe('._runDelayedCycle', require('./Queue._runDelayedCycle.spec')(createQueue));
  describe('._runTimeoutCycle', require('./Queue._runTimeoutCycle.spec')(createQueue));
  describe('.api', require('./Queue.api.spec')(createQueue));
});
