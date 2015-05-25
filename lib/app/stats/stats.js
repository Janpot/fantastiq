'use strict';

angular.module('fantastiq')
  .controller('StatsCtrl', function ($scope, $http, $routeParams, $mdDialog, config) {

    $http.get(config.baseUrl + '/metrics')
      .then(function (res) {
        $scope.metrics = res.data;
      });

  });
