import angular from 'angular';
import configDialog from '../configDialog/configDialog';

export default angular.module('fantastiq.configButton', [
  configDialog.name
])
  .directive('configButton', function ($mdDialog, configDialog) {
    return function link (scope, element) {
      angular.element(element).on('click', function ($event) {
        $mdDialog.show(configDialog({
          targetEvent: $event
        }));
      });
    };
  });
