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
  'kbn',
  'http://d3js.org/d3.v3.js'
],
 function (angular, app, _, $, kbn, d3) {
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

    /**
     * The time range effecting the panel
     * @return {[type]} [description]
     */
    $scope.get_time_range = function () {
      var range = $scope.range = filterSrv.timeRange('last');
      return range;
    };

    $scope.get_interval = function () {
      var interval = $scope.panel.interval,
                      range;
      range = $scope.get_time_range();
      if (range) {
        interval = kbn.secondsToHms(
          kbn.calculate_interval(range.from, range.to, $scope.panel.nintervals, 0) / 1000
        );
      }
      $scope.panel.interval = interval || '10m';
      return $scope.panel.interval;
    };

    $scope.populate_modal = function(request) {
      $scope.inspector = angular.toJson(JSON.parse(request.toString()),true);
    };

    $scope.get_data = function() {
      console.log('heatmap scope get_data');

      $scope.panelMeta.loading = true;

      var
        _range,
        _interval,
        request,
        facet,
        boolQuery,
        queries;
      var ejs = $scope.ejs;

      _range = $scope.get_time_range();
      _interval = $scope.get_interval(_range);

      $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);

      queries = querySrv.getQueryObjs($scope.panel.queries.ids);
      boolQuery = $scope.ejs.BoolQuery();
      _.each(queries,function(q) {
        boolQuery = boolQuery.should(querySrv.toEjsObj(q));
      });

      request = $scope.ejs.Request().indices(dashboard.indices);
      request = request
        .facet($scope.ejs.StatisticalFacet('responsetime_stats')
          .field($scope.panel.responsetime_field)
          .facetFilter($scope.ejs.QueryFilter(
            $scope.ejs.FilteredQuery(
              boolQuery,
              filterSrv.getBoolFilter(filterSrv.ids)
            )
          ))
        )
        .size(0);

      $scope.data = {};

      request.doSearch().then(function(results) {
        $scope.data.count = results.facets.responsetime_stats.count;
        $scope.data.max = results.facets.responsetime_stats.max;


        if ($scope.data.count !== 0) {
          // Use a scale for computing the buckets
          var scale = d3.scale
            .linear()
            .domain([0, $scope.data.max])
            .nice($scope.panel.nbuckets);

          $scope.data.buckets = [];
          var bucket_arr = scale.ticks($scope.panel.nbuckets);
          for (var i = 1; i < bucket_arr.length; i++) {
            $scope.data.buckets.push([bucket_arr[i-1], bucket_arr[i]]);
          }
          console.log("Buckets: ", $scope.data.buckets);

          // Build request
          request = $scope.ejs.Request().indices(dashboard.indices);

          _.each($scope.data.buckets, function(bucket) {

              facet = ejs.DateHistogramFacet(bucket[0] + '->' + bucket[1])
                .field($scope.panel.timestamp_field)
                .global(true)
                .facetFilter(ejs.AndFilter([
                  ejs.RangeFilter($scope.panel.responsetime_field)
                    .from(bucket[0])
                    .to(bucket[1]),
                    filterSrv.getBoolFilter(filterSrv.ids())
                  ])
                )
                .interval(_interval);


              request = request
                .facet(facet)
                .size(0);
          });

          console.log('Request: ', request);

          // Populate the inspector panel
          $scope.populate_modal(request);

          // Then run it
          results = request.doSearch();

          // Populate scope when we have results
          results.then(function(results) {

            $scope.panelMeta.loading = false;

            console.log("Results: ", results);

          });

        }
      });

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
