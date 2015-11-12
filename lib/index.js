'use strict';

var Queue = require('./Queue');
var QueueClient = require('./QueueClient');
var Promise = require('bluebird');

var MAINTENANCE_TICK = 1000;

function startCycle(method, time) {
  (function tick() {
    return method(time)
      .finally(function () {
        return Promise.delay(time);
      })
      .then(tick);
  }());
}

function createQueue(client, config) {
  config = config || {};
  var prefix = config.prefix || '{fantastiq}';
  return new Queue(prefix, client);
}

function setup(client, config) {
  var queue = createQueue(client, config);
  startCycle(queue._runTimeoutCycle.bind(queue), MAINTENANCE_TICK);
  startCycle(queue._runCleanupCycle.bind(queue), MAINTENANCE_TICK);
  startCycle(queue._runDelayedCycle.bind(queue), MAINTENANCE_TICK);
  startCycle(queue._runMetricsCycle.bind(queue), MAINTENANCE_TICK);
  return queue;
}

setup.client = createQueue;

setup.httpClient = function (url) {
  return new QueueClient(url);
};

module.exports = setup;
