'use strict';

var request = require('request-promise');
var urlUtil = require('url');
var message = require('./message');

function QueueClient(url) {
  this._url = /\/^/.test(url) ? url : (url + '/');
}

QueueClient.prototype._rpc = function (method, params) {
  return request.post({
    url: urlUtil.resolve(this._url, './rpc'),
    body: message.stringify({
      method: method,
      params: params
    }),
    headers: { 'content-type': 'application/json' }
  })
    .then(message.parse)
    .spread(function (error, result) {
      if (error) {
        throw error;
      }
      return result;
    });
};

function createMethod(obj, name) {
  obj[name] = function () {
    var args = Array.prototype.slice.call(arguments);
    return this._rpc(name, args);
  };
}

createMethod(QueueClient.prototype, 'config');
createMethod(QueueClient.prototype, 'add');
createMethod(QueueClient.prototype, 'addN');
createMethod(QueueClient.prototype, 'get');
createMethod(QueueClient.prototype, 'getN');
createMethod(QueueClient.prototype, 'stat');
createMethod(QueueClient.prototype, 'retrieve');
createMethod(QueueClient.prototype, 'acknowledge');
createMethod(QueueClient.prototype, 'remove');
createMethod(QueueClient.prototype, 'removeN');
createMethod(QueueClient.prototype, 'range');


module.exports = QueueClient;
