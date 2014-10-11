/**
 * == Dashboard Dropdown
 * Status: *Experimental*
 *
 * This is a navigation bar panel that simplifies switching between
 * the dashboards saved in Elasticsearch.
*/
define([
  'angular',
  'app',
  'lodash',
],
function (angular, app, _) {
  'use strict';

  var module = angular.module('kibana.panels.dashboard_dropdown', []);
  app.useModule(module);

  module.controller('dashboard_dropdown', function($scope, $modal, $q, $window, dashboard) {
    $scope.panelMeta = {
      status  : "Experimental",
      description : "A panel that simplifies switching between dashboards"
    };

    // Set and populate defaults
    var _d = {
      /**
       * label:: The label to use in front of the dropdown.
       */
      label: "Dashboards:"
    };
    _.defaults($scope.panel,_d);

    $scope.init = function() {
      // get list of dashboards once
      dashboard.elasticsearch_list(null, 50).then(
        function(result) {
          if (!_.isUndefined(result.hits)) {
            $scope.panel.dashboards = [dashboard.current.title];
            _.forEach(result.hits.hits, function(dash) {
              if (dash._id !== dashboard.current.title) {
                $scope.panel.dashboards.push(dash._id);
              }
            });
	    $scope.panel.dashboards.sort();
            $scope.selectedDashboard = dashboard.current.title;
          }
        });
    };

    $scope.selectAction = function() {
      if ($scope.selectedDashboard !== dashboard.current.title) {
	  var alink = document.getElementById('dash_label_id');alink.href = "#/dashboard/elasticsearch/" + $scope.selectedDashboard;
	  setTimeout(function(){ alink.click() }, 100);
          // $window.location.href = "#/dashboard/elasticsearch/" + $scope.selectedDashboard;
      }
    };

  });
});
