'use strict';

angular.module('fantastiq.components')
  .directive('addJobButton', function ($mdDialog) {
    return function link (scope, element) {
      angular.element(element).on('click', function ($event) {
        $mdDialog.show({
          templateUrl: 'components/addJobButton/addJob.html',
          controller: 'AddJobController',
          controllerAs: 'addJob',
          targetEvent: $event,
          locals: {},
          clickOutsideToClose: true
        });
      });
    };
  })
  .controller('AddJobToastController', function (jobDetailsDialog, $mdToast) {
    var toast = this;
    toast.showJob = function (id, $event) {
      jobDetailsDialog.showJobById(id, $event);
      $mdToast.hide();
    };
  })
  .controller('AddJobController', function ($mdDialog, $mdToast, queue) {
    var addJob = this;

    function showToast (id) {
      $mdToast.show({
        hideDelay: 10000,
        template: '<md-toast>Job created <md-button class="md-highlight" ng-click="toast.showJob(toast.id, $event)">{{toast.id}}</md-button></md-toast>',
        locals: { id: id },
        bindToController: true,
        controllerAs: 'toast',
        controller: 'AddJobToastController'
      });
    }

    addJob.data = '';
    addJob.options = {
      priority: 0
    };

    addJob.close = function () {
      $mdDialog.hide();
    };

    addJob.apply = function () {
      queue.add(addJob.data, addJob.options)
        .then(showToast)
        .then($mdDialog.hide);
    };
  });
