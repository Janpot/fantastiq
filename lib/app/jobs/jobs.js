'use strict';

angular.module('fantastiq')
  .controller('JobsController', function ($routeParams, $mdDialog, jobList) {
    var jobs = this;

    jobs.state = $routeParams.state;
    jobs.list = jobList;
    jobs.first = jobs.list[0];
    jobs.last = jobs.list[jobs.list.length - 1];

    jobs.showDetails = function ($event, job) {
      $mdDialog.show({
        templateUrl: 'jobs/job.html',
        targetEvent: $event,
        locals: { jobProperties: job },
        controller: 'JobController',
        controllerAs: 'job',
        clickOutsideToClose: true
      });
    };
  })
  .controller('JobController', function ($mdDialog, $route, jobProperties, queue) {
    var job = this;

    job.props = jobProperties;

    job.close = function () {
      $mdDialog.hide();
    };

    job.remove = function () {
      queue.remove(job.props.id)
        .then(function () {
          $mdDialog.hide();
          $route.reload();
        });
    };
  });
