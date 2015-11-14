'use strict';

var Queue = require('./Queue');
var QueueClient = require('./QueueClient');

var MAINTENANCE_TICK = 1000;

function createQueue (redisOpts, config) {
  config = config || {};
  var prefix = config.prefix || '{fantastiq}';
  return new Queue(prefix, redisOpts);
}

function setup (redisOpts, config) {
  var queue = createQueue(redisOpts, config);
  queue._startMaintenanceCycles(MAINTENANCE_TICK);
  return queue;
}

setup.client = createQueue;

setup.httpClient = function (url) {
  return new QueueClient(url);
};

module.exports = setup;
