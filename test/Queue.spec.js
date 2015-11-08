'use strict';

var redis = require('redis');
var Queue = require('../lib/Queue');

describe('Queue', function () {

  var client = redis.createClient({
    host: process.env.REDIS_HOST
  });
  var queue = new Queue('test', client);

  beforeEach(function (done) {
    return client.flushall(done);
  });

  after(function (done) {
    return client.quit(done);
  });

  describe('.acknowledge', require('./Queue.acknowledge.spec')(queue));
  describe('.add', require('./Queue.add.spec')(queue));
  describe('.addN', require('./Queue.addN.spec')(queue));
  describe('.config', require('./Queue.config.spec')(queue));
  describe('.get', require('./Queue.get.spec')(queue));
  describe('.getN', require('./Queue.getN.spec')(queue));
  describe('.range', require('./Queue.range.spec')(queue));
  describe('.remove', require('./Queue.remove.spec')(queue));
  describe('.removeN', require('./Queue.removeN.spec')(queue));
  describe('.retrieve', require('./Queue.retrieve.spec')(queue));

  describe('._runCleanupCycle', require('./Queue._runCleanupCycle.spec')(queue));
  describe('._runDelayedCycle', require('./Queue._runDelayedCycle.spec')(queue));
  describe('._runTimeoutCycle', require('./Queue._runTimeoutCycle.spec')(queue));
  describe('.api', require('./Queue.api.spec')(queue));

});
