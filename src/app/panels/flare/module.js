/** @scratch /panels/5
 *
 * include::panels/flare.asciidoc[]
 */

/** @scratch /panels/flare/0
 *
 * == flare
 * Status: *Stable*
 *
 * A table, bar chart or pie chart based on the results of an Elasticsearch terms facet.
 *
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

  var module = angular.module('kibana.panels.flare', []);
  app.useModule(module);

  module.controller('flare', function($scope, querySrv, dashboard, filterSrv, fields) {
    $scope.panelMeta = {
      modals : [
        {
          description: "Inspect",
          icon: "icon-info-sign",
          partial: "app/partials/inspector.html",
          show: $scope.panel.spyable
        }
      ],
      editorTabs : [
        {title:'Queries', src:'app/partials/querySelect.html'}
      ],
      status  : "Experimental",
      description : "Displays the results of an elasticsearch facet as a Bubble flare chart"
    };

    // Set and populate defaults
    var _d = {
      /** @scratch /panels/flare/5
       * === Parameters
       *
       * field:: The field on which to computer the facet
       */
      field   : '_type',
      /** @scratch /panels/flare/5
       * exclude:: terms to exclude from the results
       */
      exclude : [],
      /** @scratch /panels/flare/5
       * missing:: Set to false to disable the display of a counter showing how much results are
       * missing the field
       */
      missing : true,
      /** @scratch /panels/flare/5
       * other:: Set to false to disable the display of a counter representing the aggregate of all
       * values outside of the scope of your +size+ property
       */
      other   : true,
      /** @scratch /panels/flare/5
       * size:: Show this many terms
       */
      size    : 10,
      /** @scratch /panels/flare/5
       * order:: In terms mode: count, term, reverse_count or reverse_term,
       * in terms_stats mode: term, reverse_term, count, reverse_count,
       * total, reverse_total, min, reverse_min, max, reverse_max, mean or reverse_mean
       */
      order   : 'count',
      style   : { "font-size": '10pt'},
      /** @scratch /panels/flare/5
       * donut:: In pie chart mode, draw a hole in the middle of the pie to make a tasty donut.
       */
      donut   : false,
      /** @scratch /panels/flare/5
       * tilt:: In pie chart mode, tilt the chart back to appear as more of an oval shape
       */
      tilt    : false,
      /** @scratch /panels/flare/5
       * lables:: In pie chart mode, draw labels in the pie slices
       */
      labels  : true,
      /** @scratch /panels/flare/5
       * arrangement:: In bar or pie mode, arrangement of the legend. horizontal or vertical
       */
      arrangement : 'horizontal',
      /** @scratch /panels/flare/5
       * chart:: table, bar or pie
       */
      chart       : 'flare',
      /** @scratch /panels/flare/5
       * counter_pos:: The location of the legend in respect to the chart, above, below, or none.
       */
      counter_pos : 'above',
      /** @scratch /panels/flare/5
       * spyable:: Set spyable to false to disable the inspect button
       */
      spyable     : true,
      /** @scratch /panels/flare/5
       *
       * ==== Queries
       * queries object:: This object describes the queries to use on this panel.
       * queries.mode::: Of the queries available, which to use. Options: +all, pinned, unpinned, selected+
       * queries.ids::: In +selected+ mode, which query ids are selected.
       */
      queries     : {
        mode        : 'all',
        ids         : []
      },
      /** @scratch /panels/flare/5
       * tmode:: Facet mode: terms or terms_stats
       */
      tmode       : 'terms_stats',
      /** @scratch /panels/flare/5
       * tsums:: Facet mode: sum values or keep separate
       */
      tsums       : false,
      /** @scratch /panels/flare/5
       * dtype:: Handle data as known type
       */
      dtype       : '',
      /** @scratch /panels/flare/5
       * tstat:: Terms_stats facet stats field
       */
      tstat       : 'total',
      /** @scratch /panels/flare/5
       * valuefield:: Terms_stats facet value field
       */
      // valuefield  : ''
      valuefield  : []
    };

    _.defaults($scope.panel,_d);

    $scope.init = function () {
      $scope.hits = 0;

    $scope.$on('refresh',function(){
        $scope.get_data();
      });

    $scope.getSize = function(size) {
      var i = Math.floor( Math.log(size) / Math.log(1024) );
      return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
    };

    $scope.get_data();

    };

    $scope.get_data = function() {
      // Make sure we have everything for the request to complete
      if(dashboard.indices.length === 0) {
        return;
      }

      $scope.panelMeta.loading = true;
      var request,
        results,
        boolQuery,
        queries;

      $scope.field = _.contains(fields.list,$scope.panel.field+'.raw') ?
        $scope.panel.field+'.raw' : $scope.panel.field;

      request = $scope.ejs.Request().indices(dashboard.indices);

      $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
      queries = querySrv.getQueryObjs($scope.panel.queries.ids);

      // This could probably be changed to a BoolFilter
      boolQuery = $scope.ejs.BoolQuery();
      _.each(queries,function(q) {
        boolQuery = boolQuery.should(querySrv.toEjsObj(q));
      });

      // Terms mode
      if($scope.panel.tmode === 'terms') {
        request = request
          .facet($scope.ejs.TermsFacet('terms')
          .field($scope.field)
          .size($scope.panel.size)
          .order($scope.panel.order)
          .exclude($scope.panel.exclude)
          .facetFilter($scope.ejs.QueryFilter(
            $scope.ejs.FilteredQuery(
              boolQuery,
              filterSrv.getBoolFilter(filterSrv.ids())
            )))).size(0);
      }
      if($scope.panel.tmode === 'terms_stats') {

	
	// Keep it simple for single values, convert to string
	if ($scope.panel.valuefield instanceof Array && $scope.panel.valuefield.length === 1) { 
		$scope.panel.valuefield.join();
	}	

	// Determine is query uses single or multi valuefield
	if($scope.panel.valuefield instanceof Array) {
		// console.log('Terms Value is array: ',$scope.panel.valuefield);
		// Adjust size to number of parameters
		if ($scope.panel.tsums) {
		var gsize = (parseInt($scope.panel.size/$scope.panel.valuefield.length)/2 > 2) ? parseInt($scope.panel.size/$scope.panel.valuefield.length)/2 : $scope.panel.size/2;
		} else {
		var gsize = (parseInt($scope.panel.size/$scope.panel.valuefield.length) > 2) ? parseInt($scope.panel.size/$scope.panel.valuefield.length) : $scope.panel.size;
		}
		// QXIP: Dynamic Properties
		_.each($scope.panel.valuefield,function(q) {
			request = request
	         	 .facet($scope.ejs.TermStatsFacet(q)
	         	 .valueField(q)
			 // QXIP: Test using scripts
			 // .valueScript("doc[\""+q+"\"].value")
		         //	.facet($scope.ejs.facetScript('script').valueScript("doc[\""+q+"\"].value"))
	         	 .keyField($scope.field)
	         	 .size(gsize)
	         	 .order($scope.panel.order)
			.facetFilter($scope.ejs.QueryFilter(
	            	$scope.ejs.FilteredQuery(
	            	  boolQuery,
	            	  filterSrv.getBoolFilter(filterSrv.ids())
	            	))))
		});
		request = request.size(0);

	} else {
		// console.log('Terms Value is single: ',$scope.panel.valuefield);
		// KIBANA: Original Properties
	        request = request
	          .facet($scope.ejs.TermStatsFacet('terms')
	          .valueField($scope.panel.valuefield)
	          .keyField($scope.field)
	          .size($scope.panel.size)
	          .order($scope.panel.order)
	          .facetFilter($scope.ejs.QueryFilter(
	            $scope.ejs.FilteredQuery(
	              boolQuery,
	              filterSrv.getBoolFilter(filterSrv.ids())
	            )))).size(0);
	}

      }

      // Populate the inspector panel
      $scope.inspector = angular.toJson(JSON.parse(request.toString()),true);

      results = request.doSearch();

      // Populate scope when we have results
      results.then(function(results) {
        $scope.panelMeta.loading = false;
        if($scope.panel.tmode === 'terms') {
          $scope.hits = results.hits.total;
        }

        $scope.results = results;
        $scope.$emit('render');

      });
    };

    $scope.build_search = function(term,negate) {
      if(_.isUndefined(term.meta)) {
        filterSrv.set({type:'terms',field:$scope.field,value:term.label,
          mandate:(negate ? 'mustNot':'must')});
      } else if(term.meta === 'missing') {
        filterSrv.set({type:'exists',field:$scope.field,
          mandate:(negate ? 'must':'mustNot')});
      } else {
        return;
      }
    };

    $scope.set_refresh = function (state) {
      $scope.refresh = state;
    };

    $scope.close_edit = function() {
      if($scope.refresh) {
        $scope.get_data();
      }
      $scope.refresh =  false;
      $scope.$emit('render');
    };

    $scope.showMeta = function(term) {
      if(_.isUndefined(term.meta)) {
        return true;
      }
      if(term.meta === 'other' && !$scope.panel.other) {
        return false;
      }
      if(term.meta === 'missing' && !$scope.panel.missing) {
        return false;
      }
      return true;
    };

  });

  module.directive('flare', function(querySrv) {
    return {
      restrict: 'A',
      link: function(scope, elem) {
        var plot;

	elem.html('<center><img src="img/load_big.gif"></center>');

        // Receive render events
        scope.$on('render',function(){
          render_flare();
        });

	// Or if the window is resized
        angular.element(window).bind('resize', function(){
          render_flare();
        });


        function build_results() {
          var k = 0;
	  var g = 0;
          scope.data = [];
	  scope.panelMeta.loading = true;

	  _.each(scope.results.facets, function(f) {
		var parent; 
		scope.data.push({ name: scope.panel.valuefield[g], parent: "null"});
		_.each(f.terms, function(v) {
	            var slice, elem;

	            if(scope.panel.tmode === 'terms') {
                 	slice = { parent: scope.panel.valuefield[g], name: v.term, size: v.count };
	            }
	            if(scope.panel.tmode === 'terms_stats') {
		         slice = { parent: scope.panel.valuefield[g], name: v.term, size: v[scope.panel.tstat] };
	            }

	      	    scope.data.push(slice);
	            k = k + 1;

	          });

	     // next facet group
	     g = g + 1;

	      if (scope.panel.missing && f.missing > 0) {
     	  	   scope.data.push({label:'Missing field',
     	  	     data:[[k,f.missing]],meta:"missing",color:'#aaa',opacity:0});
	      }
          });


          if(scope.panel.tmode === 'terms') {
            scope.data.push({label:'Other values',
              data:[[k+1,scope.results.facets.terms.other]],meta:"other",color:'#444'});
          }


        }

        // Function for rendering panel
	// start chart
        function render_flare() {

	  // console.log('start render...');
          var chartData;

          build_results();

	  elem.text('');
          scope.panelMeta.loading = false;

	  var style = scope.dashboard.current.style;

          // IE doesn't work without this
          elem.css({height:scope.panel.height||scope.row.height});

	  var margin = {top: 10, right: 1, bottom: 6, left: 1};
          var width = $(elem[0]).width() - margin.left - margin.right;
          var height = $(elem[0]).height() - margin.top - margin.bottom;

          var diameter = height ;

	  var color = d3.scale.linear()
	    .domain([-1, 5])
	    .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
	    .interpolate(d3.interpolateHcl);

	// START CREATE TREE
          // Make a clone we can operate on.
          chartData = _.clone(scope.data);
          chartData = scope.panel.missing ? chartData :
            _.without(chartData,_.findWhere(chartData,{meta:'missing'}));
          chartData = scope.panel.other ? chartData :
          _.without(chartData,_.findWhere(chartData,{meta:'other'}));


	// create a name: node map
	var dataMap = chartData.reduce(function(map, node) {
	    map[node.name] = node;
	    return map;
	}, {});
	
	// create the tree array
	var tree = [];
	chartData.forEach(function(node) {
	    // add to parent
	    var parent = dataMap[node.parent];
	    if (parent) {
	        // create child array if it doesn't exist
	        (parent.children || (parent.children = []))
	            // add node to child array
	            .push(node);
	    } else {
	        // parent is null or missing
	        tree.push(node);
	    }
	});

	var root = { name: "flare", children: tree };
	// console.log('SYNROOT:',root);
	// END CREATE TREE


	// START FLARE
	var margin = 50,
	    diameter = height;
	
	var color = d3.scale.linear()
	    .domain([-1, 5])
	    .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
	    .interpolate(d3.interpolateHcl);
	
	var pack = d3.layout.pack()
	    .padding(2)
	    .size([diameter - margin, diameter - margin])
	    .value(function(d) { return d.size; })
	
	var svg = d3.select(elem[0]).append("svg")
	    .attr("width", height)
	    .attr("height", height)
	  .append("g")
	    .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

	d3.select(elem[0])
	    .attr("style", 'margin-left:'+(width-height)/2+'px');	
	
	  var focus = root,
	      nodes = pack.nodes(root),
	      view;
	
	  var circle = svg.selectAll("circle")
	      .data(nodes)
	    .enter().append("circle")
	      .attr("class", function(d) { return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root"; })
	      .style("fill", function(d) { return d.children ? color(d.depth) : null; })
	      .on("click", function(d) { if (focus !== d) zoom(d), d3.event.stopPropagation(); });
	
	  var text = svg.selectAll("text")
	      .data(nodes)
	    .enter().append("text")
	      .attr("class", "label")
	      .style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })
	      .style("display", function(d) { return d.parent === root ? null : "none"; })
	      .text(function(d) { return d.name; });
	
	  var node = svg.selectAll("circle,text");
	
	  d3.select(elem[0])
	  //    .style("background", color(-1))
	      .on("click", function() { zoom(root); });
	
	  zoomTo([root.x, root.y, root.r * 2 + margin]);
	
	  function zoom(d) {
	    var focus0 = focus; focus = d;
	
	    var transition = d3.transition()
	        .duration(d3.event.altKey ? 7500 : 750)
	        .tween("zoom", function(d) {
	          var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 + margin]);
	          return function(t) { zoomTo(i(t)); };
	        });
	
	    transition.selectAll("text")
	      .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
	        .style("fill-opacity", function(d) { return d.parent === focus ? 1 : 0; })
	        .each("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
	        .each("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
	  }
	
	  function zoomTo(v) {
	    var k = diameter / v[2]; view = v;
	    node.attr("transform", function(d) { return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")"; });
	    circle.attr("r", function(d) { return d.r * k; });
	  }
	
	d3.select(self.frameElement).style("height", diameter + "px");

	// END FLARE



        }

      }

    };

  });

});
