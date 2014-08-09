/** @scratch /panels/5
 * include::panels/heatmap.asciidoc[]
 */

/** @scratch /panels/heatmap/0
 * == Heatmap diagram
 * Status: *Experimental*
 *
 * This panel creates a diagram for visualizing the response times data in
 * colored grid.
 */


define([
  'angular',
  'app',
  'lodash',
  'jquery',
  'http://d3js.org/d3.v3.js'
],
 function (angular, app, _, $, d3) {
  'use strict';
  var module = angular.module('kibana.panels.heatmap', []);
  app.useModule(module);

  module.controller('heatmap', function($scope, $rootScope, querySrv, dashboard, filterSrv) {

    $scope.panelMeta = {
      editorTabs : [
        {title:'Queries', src:'app/partials/querySelect.html'}
      ],
      modals : [
        {
          description: "Inspect",
          icon: "icon-info-sign",
          partial: "app/partials/inspector.html",
          show: $scope.panel.spyable
        }
      ],
      status  : "Experimental",
      description : "This panel creates a diagram for visualizing the response " +
        "times data in colored grid. The X axis is the time, the Y axis is the " +
        "response time and the Z axis (color codified) is the count from each bucket."
    };

    // Set and populate defaults
    var _d = {

      /** @scratch /panels/heatmap/3
       * responsetime_field:: Field containing the response time information.
       */
      responsetime_field : "responsetime",

      /** @scratch /panels/heatmap/3
       * timestamp_field:: Field containing the timestamp information.
       */
      timestamp_field : "@timestamp",

      /** @scratch /panels/heatmap/3
       * nbuckets:: In how many buckets to split the Y axis.
       */
      nbuckets : 10,

      /** @scratch /panels/heatmap/3
       * nintervals:: In how many intervals to split the X axis.
       */
      nintervals : 100,

      /** @scratch /panels/heatmap/5
       * ==== Queries
       * queries object:: This object describes the queries to use on this panel.
       * queries.mode::: Of the queries available, which to use. Options: +all, pinned, unpinned, selected+
       * queries.ids::: In +selected+ mode, which query ids are selected.
       */
      queries     : {
        mode        : 'all',
        ids         : []
      }
    };
    _.defaults($scope.panel, _d);

    $scope.init = function() {
      console.log("heapmap scope init");
      $scope.get_data();
    };

    $scope.get_data = function() {
      console.log('heatmap scope get_data');

      $scope.panelMeta.loading = true;

    };

  });


  module.directive('heatmap', function() {
    return {
      restrict: 'A',
      link: function(scope, elem) {
        console.log('link function called');

        elem.html('<center><img src="img/load_big.gif"></center>');

        // Receive render events
        scope.$on('render',function(){
          render_panel();
        });

        // Or if the window is resized
        angular.element(window).bind('resize', function(){
          render_panel();
        });

        function render_panel() {
          console.log('heatmap render event received');
        }
      }
    };
  });

});
