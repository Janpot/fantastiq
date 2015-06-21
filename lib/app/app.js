'use strict';

angular.module('fantastiq.components', []);

angular.module('fantastiq', ['ngRoute', 'ngMaterial', 'fantastiq.components'])
  .config(function ($httpProvider, $routeProvider, $mdThemingProvider) {
    $httpProvider.defaults.headers.common["X-Requested-With"] = 'XMLHttpRequest';
    $routeProvider.when('/', {
      templateUrl: 'stats/stats.html',
      controller: 'StatsController',
      controllerAs: 'stats'
    });
    $routeProvider.when('/:state', {
      templateUrl: 'jobs/jobs.html',
      controller: 'JobsController',
      controllerAs: 'jobs'
    });
    $mdThemingProvider.theme('default')
      .primaryPalette('teal')
      .accentPalette('blue-grey');
  })
  .controller('AppController', function ($http, $timeout, $mdSidenav, config, $location) {
    var app = this;

    app.stats = {};

    app.showJobs = function (state) {
      $location.path('/' + state).search('before', null).search('after', null);
      $mdSidenav('left').toggle();
    };

    (function tick() {
      $http.get(config.baseUrl)
        .then(function (res) {
          angular.copy(res.data, app.stats);
          $timeout(tick, 1000);
        });
    }());

  });
