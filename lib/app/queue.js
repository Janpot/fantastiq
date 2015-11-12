'use strict';

angular.module('fantastiq')
  .service('queue', function ($http, config) {
    var QueueClient = require('../QueueClient');
    var queue = new QueueClient(config.baseUrl);

    function resolve (path) {
      return config.baseUrl + path;
    }

    queue.list = function (state, options) {
      return $http.get(resolve('/' + state), {
        params: options
      });
    };

    return queue;
  });
