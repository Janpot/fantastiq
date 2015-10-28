'use strict';

var Queue = require('./Queue');
var QueueClient = require('QueueClient');
var Promise = require('bluebird');

var MAINTENANCE_TICK = 1000;

function startCycle(method, time) {
  (function tick() {
    method(time)
      .finally(function () {
        return Promise.delay(time);
      })
      .then(tick);
  }());
}

function setup(client, config) {
  config = config || {};

  var prefix = config.prefix || '{fantastiq}';
  var queue = new Queue(prefix, client);

  startCycle(queue._runTimeoutCycle.bind(queue), MAINTENANCE_TICK);
  startCycle(queue._runCleanupCycle.bind(queue), MAINTENANCE_TICK);
  startCycle(queue._runDelayedCycle.bind(queue), MAINTENANCE_TICK);
  startCycle(queue._runMetricsCycle.bind(queue), MAINTENANCE_TICK);

  return queue;
}

setup.client = function (url) {
  return new QueueClient(url);
};

module.exports = setup;
