import angular from 'angular';
import addJobDialog from '../addJobDialog/addJobDialog';

export default angular.module('fantastiq.addJobButton', [
  addJobDialog.name
])
  .directive('addJobButton', function ($mdDialog, addJobDialog) {
    return function link (scope, element) {
      angular.element(element).on('click', function ($event) {
        $mdDialog.show(addJobDialog({
          targetEvent: $event
        }));
      });
    };
  });
