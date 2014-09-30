/** @scratch /panels/5
 * include::panels/flows.asciidoc[]
 */

/** @scratch /panels/flows/0
 * == Flows diagram
 * Status: *Experimental*
 *
 * This panel creates a D3 sanjay diagram for visualizing network flows
 * 
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
  var module = angular.module('kibana.panels.flows', []);
  app.useModule(module);

  module.controller('flows', function($scope, $rootScope, querySrv, dashboard, filterSrv) {

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
      description : "Displays a sanjay plot based on a source and a destination field."
    };

    // Set and populate defaults
    var _d = {

      /** @scratch /panels/flows/3
       * spyable:: Setting spyable to false disables the inspect icon.
       */
      spyable : true,

      /** @scratch /panels/flows/5
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
    };

  });


  module.directive('flows', function() {
    return {
      restrict: 'A',
      link: function(scope, elem) {
        console.log('link function called');

        elem.html('<center><img src="img/load_big.gif"></center>');
      }
    }
  });

});
