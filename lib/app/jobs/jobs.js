'use strict';

angular.module('fantastiq')
  .controller('JobsCtrl', function ($scope, $http, $routeParams, $mdDialog, config) {

    $scope.state = $routeParams.state;

    var query = {
      fill: true
    };

    if ($routeParams.before) {
      query.end = $routeParams.before;
    } else if ($routeParams.after) {
      query.start = $routeParams.after;
    }

    $http.get(config.baseUrl + '/' + $scope.state,{
      params: query
    })
      .then(function (res) {
        $scope.jobs = res.data.jobs;
        $scope.first = $scope.jobs[0];
        $scope.last = $scope.jobs[$scope.jobs.length - 1];
      });

    $scope.showDetails = function ($event, job) {
      $mdDialog.show({
        templateUrl: 'jobs/job.html',
        targetEvent: $event,
        locals: { job: job },
        controller: 'JobCtrl',
        clickOutsideToClose: true
      });
    };

  })
  .controller('JobCtrl', function ($scope, $mdDialog, job) {
    $scope.job = job;

    $scope.close = function () {
      $mdDialog.hide();
    };

    $scope.formatJson = function(json) {
      return JSON.stringify(json, null, 2);
    };
  });
