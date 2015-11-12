'use strict';

var Promise = require('bluebird');

var DEFAULT_RETAIN_FOR = 60 * 60 * 1000;

function Metrics (client, options) {
  options = options || {};
  this._client = client;
  this._retainFor = options.retainFor || DEFAULT_RETAIN_FOR;
}

Metrics.prototype.track = function (key, value) {
  var timestamp = Date.now();
  var expirationTime = timestamp - this._retainFor;
  var serialized = timestamp + ':' + value;

  var multi = this._client.multi();
  multi.zremrangebyscore(key, -Infinity, expirationTime);
  multi.zadd(key, timestamp, serialized);
  return Promise.fromCallback(multi.exec.bind(multi))
    .then(function () {
      return [ timestamp, value ];
    });
};

Metrics.prototype.range = function (key, start, end) {
  var expirationTime = Date.now() - this._retainFor;

  var multi = this._client.multi();
  multi.zremrangebyscore(key, -Infinity, expirationTime);
  multi.zrangebyscore(key, start || -Infinity, end || +Infinity);
  return Promise.fromCallback(multi.exec.bind(multi))
    .call('pop')
    .map(function (serialized) {
      return serialized.split(':').map(Number);
    });
};

module.exports = function (client, options) {
  return new Metrics(client, options);
};
