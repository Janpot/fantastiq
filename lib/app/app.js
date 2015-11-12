'use strict';

angular.module('fantastiq.components', []);

angular.module('fantastiq', ['ngRoute', 'ngSanitize', 'ngMaterial', 'fantastiq.components'])
  .run(function ($rootScope) {
    var bluebird = require('bluebird');
    bluebird.setScheduler(function (cb) {
      $rootScope.$evalAsync(cb);
    });
  })
  .config(function ($httpProvider, $routeProvider, $mdThemingProvider) {
    $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
    $routeProvider.when('/', {
      templateUrl: 'stats/stats.html',
      controller: 'StatsController',
      controllerAs: 'stats',
      resolve: {
        metrics: function (queue) {
          return queue.metrics();
        }
      }
    });
    $routeProvider.when('/:state', {
      templateUrl: 'jobs/jobs.html',
      controller: 'JobsController',
      controllerAs: 'jobs',
      resolve: {
        jobList: function ($route, queue) {
          var routeParams = $route.current.params;
          var rangeOptions = {
            fill: true
          };

          if (routeParams.before) {
            rangeOptions.end = routeParams.before;
          } else if (routeParams.after) {
            rangeOptions.start = routeParams.after;
          }

          return queue.list(routeParams.state, rangeOptions)
            .then(function (res) {
              return res.data.jobs;
            });
        }
      }
    });
    $mdThemingProvider.theme('default')
      .primaryPalette('teal')
      .accentPalette('blue-grey');
  })
  .controller('AppController', function ($timeout, $mdSidenav, $location, queue) {
    var app = this;

    app.stats = {};

    app.showJobs = function (state) {
      $location.path('/' + state).search('before', null).search('after', null);
      $mdSidenav('left').toggle();
    };

    (function tick () {
      queue.stat()
        .then(function (res) {
          angular.copy(res, app.stats);
        }, function (err) {
          console.error(err);
        })
        .finally(function () {
          $timeout(tick, 1000);
        });
    }());
  });
