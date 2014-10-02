/** @scratch /panels/5
 * include::panels/flows.asciidoc[]
 */

/** @scratch /panels/flows/0
 * == Flows diagram
 * Status: *Experimental*
 *
 * This panel creates a sanjay chart between the src_ip and dst_ip fields.
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

  // console.log('flows module loaded');

  module.controller('flows', function($scope, $rootScope, querySrv, dashboard, filterSrv) {

    // console.log('flows controller loaded');

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

    $scope.dashboard = dashboard;

    // Set and populate defaults
    var _d = {
      /** @scratch /panels/flows/3
       * spyable:: Setting spyable to false disables the inspect icon.
       */
      spyable : true,
      /** @scratch /panels/map/3
       * size:: Max number of nodes to draw
       */
      size    : 50,
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
    _.defaults($scope.panel,_d);

    $scope.init = function() {
      $scope.$on('refresh',function(){$scope.get_data();});
      $scope.get_data();
    };

    $scope.get_data = function() {

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

	// QXIP: Pre-Generate sankey nodes
        $scope.data.nodes = [];
	var findIt = function(node){
		 var found = $scope.data.nodes.some(function (el) {
                    return el.name === node;
                  });
		 // LEGEND: node: {position}, name: {name}
		 if (!found)  $scope.data.nodes.push({ node: $scope.data.nodes.length, name: node });
	}

        $scope.data.src_terms = [];
        _.each(results.facets.src_terms.terms, function(v) {
          $scope.data.src_terms.push(v.term);
		findIt(v.term);
        });
        $scope.data.dst_terms = [];
        _.each(results.facets.dst_terms.terms, function(v) {
          $scope.data.dst_terms.push(v.term);
		findIt(v.term);
        });

        // console.log("Src terms", $scope.data.src_terms);
        // console.log("Dst terms", $scope.data.dst_terms);
        // console.log("San Nodes", $scope.data.nodes);

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
              ).size(0);

          });
        });


	// QXIP: build links for sankey 
        $scope.data.links = [];
	var linkIt = function(conn,count){
	      // Find src, dst
	      var src = conn.substring(0, conn.indexOf('->')),
              dst = conn.substring(conn.indexOf('->') + 2, conn.length);
	      // Find position
	      var srcindex = $scope.data.nodes.map(function(e) { return e.name; }).indexOf(src),
	      dstindex = $scope.data.nodes.map(function(e) { return e.name; }).indexOf(dst);

	      // if ($scope.data.links) {
	      // 	var srctest = $scope.data.links.map(function(e) { return e.source; }).indexOf(dstindex);
	      // }

	      // Push to array w/ direction correction (by sankey design)
	      if (srcindex === dstindex ) {
		return;
	      } else if (srcindex > dstindex) {
	      	$scope.data.links.push({ source: dstindex, target: srcindex, value: count });
	      } else {
	      	$scope.data.links.push({ source: srcindex, target: dstindex, value: count });
	      }
	}

        request.doSearch().then(function (results) {
          $scope.data.connections = {};
          _.each(results.facets, function(v, name) {
            $scope.data.connections[name] = v.count;
		if (v.count > 0) linkIt(name,v.count);
          });

          // console.log('Connections: ', $scope.data.connections);
          // console.log('SanLinks: ', $scope.data.links);

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

  module.directive('flows', function() {
    return {
      restrict: 'A',
      link: function(scope, elem) {

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
          elem.css({height:scope.panel.height||scope.row.height});
          elem.text('');
          scope.panelMeta.loading = false;

          // console.log("Links", scope.data.links);
          // console.log("Nodes", scope.data.nodes);

          var style = scope.dashboard.current.style;

          var margin = {top: 1, right: 1, bottom: 6, left: 1};
          var width = $(elem[0]).width() - margin.left - margin.right;
          var height = $(elem[0]).height() - margin.top - margin.bottom;
          
          var formatNumber = d3.format(",.0f"),
              format = function(d) { return formatNumber(d) + " packets"; },
              color = d3.scale.category20();
          
	  d3.select(elem[0]).select("svg").remove();
          var svg = d3.select(elem[0]).append("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
            .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


	var data = { "nodes" : [
	{"node":0,"name":"client A"},
	{"node":1,"name":"client B"},
	{"node":2,"name":"proxy"},
	{"node":3,"name":"server X"},
	{"node":4,"name":"server Y"}
	],
	"links" : [
	{"source":0,"target":2,"value":2},
	{"source":1,"target":2,"value":3},
	{"source":1,"target":2,"value":1},
	{"source":2,"target":3,"value":4},
	{"source":2,"target":4,"value":1}
	] };
	  
	var data = {
	 "nodes" : scope.data.nodes,
	 "links" : scope.data.links
	}

	// console.log('COMPARE DATA/INDATA:',data,indata);

          var flows = d3.sankey()
            .size([width, height])
            .nodeWidth(15)
            .nodePadding(20)
	    .nodes(data.nodes)
	    .links(data.links)
	    .layout(32);

          var path = flows.link();
  
          var link = svg.append("g").selectAll(".link")
            .data(data.links)
            .enter().append("path")
              .attr("class", "link")
              .attr("d", path)
              .style("stroke-width", function(d) { return Math.max(1, d.dy); })
              .sort(function(a, b) { return b.dy - a.dy; });
        
          link.append("title")
              .text(function(d) { return d.source.name + " → " + d.target.name + "\n" + format(d.value); });

          var node = svg.append("g").selectAll(".node")
              .data(data.nodes)
            .enter().append("g")
              .attr("class", "node")
              .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
            .call(d3.behavior.drag()
              .origin(function(d) { return d; })
              .on("dragstart", function() { this.parentNode.appendChild(this); })
              .on("drag", dragmove));
        
          node.append("rect")
              .attr("height", function(d) { return d.dy; })
              .attr("width", flows.nodeWidth())
              .style("fill", function(d) { return d.color = color(d.name.replace(/ .*/, "")); })
              .style("stroke", function(d) { return d3.rgb(d.color).darker(2); })
            .append("title")
              .text(function(d) { return d.name + "\n" + format(d.value); });
        
          node.append("text")
              .attr("x", -6)
              .attr("y", function(d) { return d.dy / 2; })
              .attr("dy", ".35em")
              .attr("text-anchor", "end")
              .attr("transform", null)
              .text(function(d) { return d.name; })
            .filter(function(d) { return d.x < width / 2; })
              .attr("x", 6 + flows.nodeWidth())
              .attr("text-anchor", "start");
        
          function dragmove(d) {
            d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
            flows.relayout();
            link.attr("d", path);
          }  

        }
      }
    };
  });

});
