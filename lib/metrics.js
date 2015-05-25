'use strict';

var DEFAULT_RETAIN_FOR = 60 * 60 * 1000;


function Metrics(client, options) {
  options = options || {};
  this._client = client;
  this._retainFor = options.retainFor || DEFAULT_RETAIN_FOR;
}

Metrics.prototype.track = function (key, value) {
  var timestamp = Date.now();
  var expirationTime = timestamp - this._retainFor;
  var serialized = timestamp + ':' + value;

  this._client.multi();
  this._client.zremrangebyscore(key, -Infinity, expirationTime);
  this._client.zadd(key, timestamp, serialized);
  return this._client.exec()
    .then(function () {
      return [ timestamp, value ];
    });
};

Metrics.prototype.range = function (key, start, end) {
  var expirationTime = Date.now() - this._retainFor;

  this._client.multi();
  this._client.zremrangebyscore(key, -Infinity, expirationTime);
  this._client.zrangebyscore(key, start || -Infinity, end || +Infinity);
  return this._client.exec()
    .call('pop')
    .map(function (serialized) {
      return serialized.split(':').map(Number);
    });
};


module.exports = function (client, options) {
  return new Metrics(client, options);
};
