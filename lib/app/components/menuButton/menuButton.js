angular.module('fantastiq.components')
  .directive('menuButton', function () {
    return {
      controller: 'MenuButtonController',
      controllerAs: 'menu',
      template: '<md-button hide-gt-md ng-click="menu.toggle()" class="md-icon-button"><md-icon>menu</md-icon></md-button>'
    };
  })
  .controller('MenuButtonController', function ($mdSidenav) {
    this.toggle = function () {
      $mdSidenav('left').toggle();
    };
  });
