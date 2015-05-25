angular.module('fantastiq.components')
  .directive('hljs', function () {
    function link(scope, element, attrs) {
      scope.$watch('code', function (newValue) {
        var hljsResult = null;
        var className = null;

        if (attrs.format) {
          hljsResult = hljs.highlight(attrs.format, newValue, true);
        } else {
          hljsResult = hljs.highlightAuto(newValue);
        }

        var markup = [
          '<pre><code class="' + hljsResult.language + '">',
          hljsResult.value,
          '</code></pre>'
        ].join('');

        element.html(markup);
      });
    }

    return {
      restrict: 'E',
      scope: {
        code: '='
      },
      template: '<div ng-non-bindable></div>',
      link: link
    };
  });