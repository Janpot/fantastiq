'use strict';

angular.module('fantastiq')
  .controller('JobsController', function ($routeParams, $mdDialog, queue) {
    var jobs = this;

    jobs.state = $routeParams.state;

    var rangeOptions = {
      fill: true
    };

    if ($routeParams.before) {
      rangeOptions.end = $routeParams.before;
    } else if ($routeParams.after) {
      rangeOptions.start = $routeParams.after;
    }

    queue.list(jobs.state, rangeOptions)
      .then(function (res) {
        jobs.list = res.data.jobs;
        jobs.first = jobs.list[0];
        jobs.last = jobs.list[jobs.list.length - 1];
      });

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

    job.jsonProperty = function(property) {
      var data = job.props[property];
      return JSON.stringify(data, null, 2);
    };

    job.remove = function () {
      queue.remove(job.props.id)
        .then(function () {
          $mdDialog.hide();
          $route.reload();
        });
    };
  });
