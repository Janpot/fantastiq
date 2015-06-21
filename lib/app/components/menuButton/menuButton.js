angular.module('fantastiq.components')
  .directive('menuButton', function () {
    return {
      scope: {},
      replace: true,
      controller: 'MenuButtonController',
      controllerAs: 'menu',
      template: '<span><md-button hide-gt-md ng-click="menu.toggle()" class="md-icon-button"><md-icon>menu</md-icon></md-button></span>'
    };
  })
  .controller('MenuButtonController', function ($mdSidenav) {
    this.toggle = function () {
      $mdSidenav('left').toggle();
    };
  });
