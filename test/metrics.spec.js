/* eslint-env mocha */

'use strict';

var redis = require('redis');
var metrics = require('../lib/metrics');
var assert = require('chai').assert;
var sinon = require('sinon');

describe('metrics', function () {
  var client = null;
  var tracker = null;
  var clock = null;

  before(() => {
    client = redis.createClient({
      host: process.env.REDIS_HOST
    });
    tracker = metrics(client);
  });

  beforeEach(function (done) {
    return client.flushall(done);
  });

  afterEach(function () {
    if (clock) {
      clock.restore();
      clock = null;
    }
  });

  after(function (done) {
    return client.quit(done);
  });

  it('should track values', function () {
    clock = sinon.useFakeTimers(1000);
    return tracker.track('test', 1)
      .then(function () {
        clock.tick(1000);
      })
      .then(function () {
        return tracker.track('test', 2);
      })
      .then(function () {
        return tracker.range('test');
      })
      .then(function (data) {
        assert.deepEqual(data, [
          [ 1000, 1 ],
          [ 2000, 2 ]
        ]);
      });
  });

  it('should track the same value twice', function () {
    clock = sinon.useFakeTimers(1000);
    return tracker.track('test', 1)
      .then(function () {
        clock.tick(1000);
      })
      .then(function () {
        return tracker.track('test', 1);
      })
      .then(function () {
        return tracker.range('test');
      })
      .then(function (data) {
        assert.deepEqual(data, [
          [ 1000, 1 ],
          [ 2000, 1 ]
        ]);
      });
  });
});
