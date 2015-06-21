'use strict';

angular.module('fantastiq')
  .controller('StatsController', function ($http, $routeParams, $mdDialog, config) {

    $http.get(config.baseUrl + '/metrics')
      .then(function (res) {
        this.metrics = res.data;
      }.bind(this));

  });
