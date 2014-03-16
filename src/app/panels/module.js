/** @scratch /panels/5
 * include::panels/hive.asciidoc[]
 */

/** @scratch /panels/hive/0
 * == Hive
 * Status: *Experimental*
 *
 * This panel creates a hive chart between the src_ip and dst_ip fields.
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
  var module = angular.module('kibana.panels.hive', []);
  app.useModule(module);

  console.log('hive module loaded');

  module.controller('hive', function($scope, $rootScope, querySrv, dashboard, filterSrv) {

    console.log('hive controller loaded');

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
      description : "Displays a hive plot based on a source and a destination field."
    };

    // Set and populate defaults
    var _d = {
      /** @scratch /panels/hive/3
       * spyable:: Setting spyable to false disables the inspect icon.
       */
      spyable : true,
      /** @scratch /panels/map/3
       * size:: Max number of nodes to draw
       */
      size    : 50,
      /** @scratch /panels/hive/5
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
    _.defaults($scope.panel,_d);

    $scope.init = function() {
      console.log('hive scope init');
      $scope.get_data();
    };

    $scope.get_data = function() {
      console.log('hive scope get_data');

      $scope.panelMeta.loading = true;

      var request,
        boolQuery,
        queries;
      var ejs = $scope.ejs;

      $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);

      queries = querySrv.getQueryObjs($scope.panel.queries.ids);
      boolQuery = $scope.ejs.BoolQuery();
      _.each(queries,function(q) {
        boolQuery = boolQuery.should(querySrv.toEjsObj(q));
      });


      request = $scope.ejs.Request().indices(dashboard.indices);
      request = request
        .facet($scope.ejs.TermsFacet('src_terms')
          .field($scope.panel.src_field)
          .size($scope.panel.size)
          .facetFilter($scope.ejs.QueryFilter(
            $scope.ejs.FilteredQuery(
              boolQuery,
              filterSrv.getBoolFilter(filterSrv.ids)
            )
          ))
        )
        .facet($scope.ejs.TermsFacet('dst_terms')
          .field($scope.panel.dst_field)
          .size($scope.panel.size)
          .facetFilter($scope.ejs.QueryFilter(
            $scope.ejs.FilteredQuery(
              boolQuery,
              filterSrv.getBoolFilter(filterSrv.ids)
            )
          ))
        )
        .size(0);

      $scope.populate_modal(request);

      $scope.data = {};

      request.doSearch().then(function(results) {

        $scope.data.src_terms = []
        _.each(results.facets.src_terms.terms, function(v) {
          $scope.data.src_terms.push(v.term);
        });
        $scope.data.dst_terms = []
_.each(results.facets.dst_terms.terms, function(v) {
          $scope.data.dst_terms.push(v.term);
        });

        console.log("Src terms", $scope.data.src_terms);
        console.log("Dst terms", $scope.data.dst_terms);

        // build a new request to compute the connections between the nodes
        request = $scope.ejs.Request().indices(dashboard.indices);
        _.each($scope.data.src_terms, function(src) {
          _.each($scope.data.dst_terms, function(dst) {

            request = request
              .facet(ejs.FilterFacet(src + '->' + dst)
                .filter(ejs.AndFilter([
                  ejs.TermFilter($scope.panel.src_field, src),
                  ejs.TermFilter($scope.panel.dst_field, dst)
                ]))
              ).size(0)

          });
        });

        request.doSearch().then(function (results) {
          $scope.data.connections = {}
          _.each(results.facets, function(v, name) {
            $scope.data.connections[name] = v.count;
          });

          console.log('Connections: ', $scope.data.connections);

          $scope.panelMeta.loading = false;
          $scope.$emit('render');
        });

      });

      return;
    };

    $scope.populate_modal = function(request) {
      $scope.inspector = angular.toJson(JSON.parse(request.toString()),true);
    };


  });

  module.directive('hive', function() {
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
          console.log('hive render event received');
          elem.css({height:scope.panel.height||scope.row.height});
          elem.text('');
          scope.panelMeta.loading = false;

          // compute the nodes and the links
          var links = [], nodes = {};
          _.each(scope.data.connections, function(v, conn) {
            var src = conn.substring(0, conn.indexOf('->')),
              dst = conn.substring(conn.indexOf('->') + 2, conn.length),
              link = {};

            link.source = nodes[src] || (nodes[src] = {name: src});
            link.target = nodes[dst] || (nodes[dst] = {name: dst});

            link.value = +1.2;

            links.push(link);
          });

          console.log("Links", links);
          console.log("Nodes", d3.values(nodes));

          var width = $(elem[0]).width(),
            height = $(elem[0]).height();

          var force = d3.layout.force()
            .nodes(d3.values(nodes))
            .links(links)
            .size([width, height])
            .linkDistance(80)
            .charge(-300)
            .on("tick", tick)
            .start();

          var svg = d3.select(elem[0]).append("svg")
            .attr("width", width)
            .attr("height", height);

          // build the arrow.
          svg.append("svg:defs").selectAll("marker")
              .data(["end"])      // Different link/path types can be defined here
            .enter().append("svg:marker")    // This section adds in the arrows
              .attr("id", String)
              .attr("viewBox", "0 -5 10 10")
              .attr("refX", 15)
              .attr("refY", -1.5)
              .attr("markerWidth", 6)
              .attr("markerHeight", 6)
              .attr("orient", "auto")
            .append("svg:path")
              .attr("d", "M0,-5L10,0L0,5");

          // add the links and the arrows
          var path = svg.append("svg:g").selectAll("path")
              .data(force.links())
            .enter().append("svg:path")
          //    .attr("class", function(d) { return "link " + d.type; })
              .attr("class", "link-path")
              .attr("marker-end", "url(#end)")
              .style('fill', 'none')
              .style('stroke', '#8c8c8c')
              .style('stroke-width', '1.5px');

          // define the nodes
          var node = svg.selectAll(".node")
              .data(force.nodes())
            .enter().append("g")
              .attr("class", "node")
              .call(force.drag);

          // add the nodes
          node.append("circle")
              .attr("r", 5)
              .fill('fill', '#8c8c8c');

          // add the text
          node.append("text")
              .attr("x", 12)
              .attr("dy", ".35em")
              .fill('fill', '#8c8c8c')
              .text(function(d) { return d.name; });

          // add the curvy lines
          function tick() {
            path.attr("d", function(d) {
              var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = Math.sqrt(dx * dx + dy * dy);
              return "M" +
                d.source.x + "," +
                d.source.y + "A" +
                dr + "," + dr + " 0 0,1 " +
                d.target.x + "," +
                d.target.y;
            });

            node
              .attr("transform", function(d) {
              return "translate(" + d.x + "," + d.y + ")"; });
          }
        }
      }
    }
  });

 });
