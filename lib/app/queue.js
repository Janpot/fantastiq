'use strict';

angular.module('fantastiq')
  .service('queue', function ($http, $q, config) {

    function resolve(path) {
      return config.baseUrl + path;
    }

    function Queue() {

    }

    Queue.prototype.stat = function () {
      return $http.get(resolve('/'));
    };

    Queue.prototype.list = function (state, options) {
      return $http.get(resolve('/' + state), {
        params: options
      });
    };

    Queue.prototype.remove = function (id) {
      return $http.delete(resolve('/jobs/' + id))
        .catch(function (err) {
          if (err.status === 404) {
            return null;
          }
          return $q.reject(err);
        });
    };

    return new Queue();

  });
