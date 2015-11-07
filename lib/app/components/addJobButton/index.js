'use strict';

angular.module('fantastiq.components')
  .directive('addJobButton', function () {
    return {
      controller: 'AddJobButtonController',
      controllerAs: 'addJob',
      template: '<md-button ng-click="addJob.show($event)" class="md-icon-button"><md-icon>add</md-icon></md-button>'
    };
  })
  .controller('AddJobButtonController', function ($mdDialog) {
    this.show = function ($event) {
      $mdDialog.show({
        templateUrl: 'components/addJobButton/addJob.html',
        controller: 'AddJobController',
        controllerAs: 'addJob',
        targetEvent: $event,
        locals: {},
        clickOutsideToClose: true
      });
    };
  })
  .controller('AddJobController', function ($mdDialog, $mdToast, queue, jobDetailsDialog) {
    var addJob = this;

    function showToast(id) {
      $mdToast.show({
        hideDelay: 10000,
        template: '<md-toast>Job created <md-button class="md-highlight" ng-click="toast.showJob(toast.id, $event)">{{toast.id}}</md-button></md-toast>',
        locals: { id: id },
        bindToController: true,
        controllerAs: 'toast',
        controller: function (jobDetailsDialog, $mdToast) {
          var toast = this;
          toast.showJob = function (id, $event) {
            jobDetailsDialog.showJobById(id, $event);
            $mdToast.hide();
          };
        }
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