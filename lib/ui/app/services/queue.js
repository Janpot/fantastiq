import angular from 'angular';
import QueueClient from '../../../QueueClient';

export default angular.module('fantastiq.services.queue', [])
  .service('queue', function ($http, config) {
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
