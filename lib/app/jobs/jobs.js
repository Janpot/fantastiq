'use strict';

angular.module('fantastiq')
  .controller('JobsController', function ($http, $routeParams, $mdDialog, config) {
    var jobs = this;

    jobs.state = $routeParams.state;

    var query = {
      fill: true
    };

    if ($routeParams.before) {
      query.end = $routeParams.before;
    } else if ($routeParams.after) {
      query.start = $routeParams.after;
    }

    $http.get(config.baseUrl + '/' + jobs.state, {
      params: query
    })
      .then(function (res) {
        jobs.list = res.data.jobs;
        jobs.first = jobs.list[0];
        jobs.last = jobs.list[jobs.list.length - 1];
      }.bind(jobs));

    jobs.showDetails = function ($event, job) {
      $mdDialog.show({
        templateUrl: 'jobs/job.html',
        targetEvent: $event,
        locals: { job: job },
        controller: 'JobController',
        controllerAs: 'job',
        clickOutsideToClose: true
      });
    };

  })
  .controller('JobController', function ($mdDialog, jobProperties) {
    var job = this;

    job.props = jobProperties;

    job.close = function () {
      $mdDialog.hide();
    };

    job.jsonProperty = function(property) {
      var data = job.props[property];
      return JSON.stringify(data, null, 2);
    };
  });
