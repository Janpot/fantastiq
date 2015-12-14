import angular from 'angular';
import jobDetailsDialog from '../jobDetailsDialog/jobDetailsDialog';

export default angular.module('fantastiq.addJobToast', [
  jobDetailsDialog.name
])
  .value('addJobToast', function (options) {
    return {
      hideDelay: 10000,
      locals: {
        id: options.id
      },
      template: `
        <md-toast>
          Job created
          <md-button class="md-highlight" ng-click="addJobToast.showJob($event)">
            {{addJobToast.id}}
          </md-button>
        </md-toast>
      `,
      controller: function ($mdDialog, $mdToast, jobDetailsDialog, queue) {
        this.showJob = ($event) => {
          return queue.get(this.id)
            .then(job => {
              $mdToast.hide();
              return $mdDialog.show(jobDetailsDialog({
                targetEvent: $event,
                job: job
              }));
            });
        };
      },
      controllerAs: 'addJobToast',
      bindToController: true
    };
  });
