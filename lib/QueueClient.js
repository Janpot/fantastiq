'use strict';

var Promise = require('bluebird');
var http = require('http');
var extend = require('extend');
var urlUtil = require('url');
var message = require('./message');

// request-promise is way too heavy for the browser
function request(options) {
  return new Promise(function (resolve, reject) {
    var url = urlUtil.parse(options.url);
    var reqOpts = extend(url, options);
    var req = http.request(reqOpts, function (res) {
      var body = '';
      res.on('data', function (chunk) {
        body += chunk;
      });
      res.on('end', function () {
        resolve(body);
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.write(options.body || '');
    req.end();
  });
}

function QueueClient(url) {
  this._url = /\/^/.test(url) ? url : (url + '/');
}

QueueClient.prototype._rpc = function (method, params) {
  return request({
    method: 'post',
    url: urlUtil.resolve(this._url, './rpc'),
    body: message.stringify({
      method: method,
      params: params
    }),
    headers: { 'content-type': 'application/json' }
  })
    .then(message.parse)
    .then(function (rpcResult) {
      if (rpcResult[0]) {
        throw rpcResult[0];
      }
      return rpcResult[1];
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
createMethod(QueueClient.prototype, 'metrics');


module.exports = QueueClient;
