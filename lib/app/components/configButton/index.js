'use strict';

angular.module('fantastiq.components')
  .directive('configButton', function () {
    return {
      controller: 'ConfigButtonController',
      controllerAs: 'config',
      template: '<md-button ng-click="config.show($event)" class="md-icon-button"><md-icon>settings</md-icon></md-button>'
    };
  })
  .controller('ConfigButtonController', function ($mdDialog) {
    this.show = function ($event) {
      $mdDialog.show({
        templateUrl: 'components/configButton/config.html',
        controller: 'ConfigController',
        controllerAs: 'config',
        targetEvent: $event,
        locals: {},
        clickOutsideToClose: true
      });
    };
  })
  .controller('ConfigController', function ($mdDialog, queue) {
    var config = this;

    config.close = function () {
      $mdDialog.hide();
    };

    config.isOriginal = function() {
      return angular.equals(config.editable, config.original);
    };

    config.reset = function () {
      config.editable = angular.copy(config.original);
    };

    config.apply = function () {
      queue.config(config.editable).then($mdDialog.hide);
    };

    queue.config()
      .then(function (res) {
        config.original = res;
        config.editable = angular.copy(config.original);
        console.log(config.editable);
      });
  });
