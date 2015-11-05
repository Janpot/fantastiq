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
    .then(function (response) {
      if (response.error) {
        throw response.error;
      }
      return response.result;
    });
};

function createMethod(name, parse) {
  QueueClient.prototype[name] = function () {
    var args = Array.prototype.slice.call(arguments);
    var result = this._rpc(name, args);
    if (parse) {
      return result.then(parse);
    } else {
      return result;
    }
  };
}

createMethod('config');
createMethod('add');
createMethod('addN');
createMethod('get');
createMethod('getN');
createMethod('stat');
createMethod('retrieve');
createMethod('acknowledge');
createMethod('remove');
createMethod('removeN');
createMethod('range');


module.exports = QueueClient;
