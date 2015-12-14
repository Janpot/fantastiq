import angular from 'angular';
export default angular.module('fantastiq.menuButton', [])
  .component('menuButton', {
    template: `
      <md-button hide-gt-md ng-click="menuButton.toggle()" class="md-icon-button">
        <md-icon>menu</md-icon>
      </md-button>
    `,
    controller: function ($mdSidenav) {
      this.toggle = function () {
        $mdSidenav('left').toggle();
      };
    }
  });
