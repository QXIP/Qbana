/*

  ## Bullet Stats Module

  ### Parameters
  * format :: The format of the value returned. (Default: number)
  * style :: The font size of the main number to be displayed.
  * mode :: The aggregate value to use for display
  * spyable ::  Dislay the 'eye' icon that show the last elasticsearch query

*/
define([
  'angular',
  'app',
  'lodash',
  'jquery',
  'kbn',
  'numeral',
  'http://d3js.org/d3.v3.js'
], function (
  angular,
  app,
  _,
  $,
  kbn,
  numeral,
  d3
) {

  'use strict';

  var module = angular.module('kibana.panels.bullet', []);
  app.useModule(module);

  module.controller('bullet', function ($scope, querySrv, dashboard, filterSrv) {

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
      status: 'Beta',
      description: 'A statistical panel for displaying Bullet Chart aggregations using the Elastic Search statistical facet query. Designed by Stephen Few, a bullet chart provides a rich display of data in a small space. A variation on a bar chart, bullet charts compare a given quantitative measure (such as profit or revenue) against qualitative ranges (e.g., poor, satisfactory, good) and related markers (e.g., the same measure a year ago)'
    };

    $scope.modes = ['count','min','max','mean','total','variance','std_deviation','sum_of_squares'];

    var defaults = {
      queries     : {
        mode        : 'all',
        ids         : []
      },
      style   : { "font-size": '20pt'},
      format: 'number',
      mode: 'count',
      display_breakdown: 'yes',
      field: [],
      sort_field: '',
      sort_reverse: false,
      label_name: 'Query',
      value_name: 'Value',
      spyable     : true,
      show: {
        count: true,
        min: true,
        max: true,
        mean: true,
        std_deviation: false,
        sum_of_squares: false,
        total: true,
        variance: false
      }
    };

    _.defaults($scope.panel, defaults);

    $scope.init = function () {
      $scope.ready = false;
      $scope.$on('refresh', function () {
        $scope.get_data();
      });
      $scope.get_data();
    };

    $scope.set_sort = function(field) {
      // console.log(field);
      if($scope.panel.sort_field === field && $scope.panel.sort_reverse === false) {
        $scope.panel.sort_reverse = true;
      } else if($scope.panel.sort_field === field && $scope.panel.sort_reverse === true) {
        $scope.panel.sort_field = '';
        $scope.panel.sort_reverse = false;
      } else {
        $scope.panel.sort_field = field;
        $scope.panel.sort_reverse = false;
      }
    };

    $scope.get_data = function () {
      if(dashboard.indices.length === 0) {
        return;
      }

      $scope.panelMeta.loading = true;

      var request,
        results,
        boolQuery,
        queries;

      request = $scope.ejs.Request().indices(dashboard.indices);

      $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
      queries = querySrv.getQueryObjs($scope.panel.queries.ids);


      // This could probably be changed to a BoolFilter
      boolQuery = $scope.ejs.BoolQuery();
      _.each(queries,function(q) {
        boolQuery = boolQuery.should(querySrv.toEjsObj(q));
      });

      // Field or Fields query?
      if ($scope.panel.field instanceof Array && $scope.panel.field.length === 1) { 

	      $scope.panel.field.join();

	      request = request
	        .facet($scope.ejs.StatisticalFacet('stats')
	          .field($scope.panel.field)
	          .facetFilter($scope.ejs.QueryFilter(
	            $scope.ejs.FilteredQuery(
	              boolQuery,
	              filterSrv.getBoolFilter(filterSrv.ids())
	              )))).size(0);
	
	      _.each(queries, function (q) {
	        var alias = q.alias || q.query;
	        var query = $scope.ejs.BoolQuery();
	        query.should(querySrv.toEjsObj(q));
	        request.facet($scope.ejs.StatisticalFacet('stats_'+alias)
	          .field($scope.panel.field)
	          .facetFilter($scope.ejs.QueryFilter(
	            $scope.ejs.FilteredQuery(
	              query,
	              filterSrv.getBoolFilter(filterSrv.ids())
	            )
	          ))
	        );
	      });


      }	else {

	// console.log('Multi-Search');

	      request = request
	        .facet($scope.ejs.StatisticalFacet('stats')
	          .fields($scope.panel.field)
	          .facetFilter($scope.ejs.QueryFilter(
	            $scope.ejs.FilteredQuery(
	              boolQuery,
	              filterSrv.getBoolFilter(filterSrv.ids())
	              )))).size(0);

	      _.each(queries, function (q) {
	        var alias = q.alias || q.query;
	        var query = $scope.ejs.BoolQuery();
	        query.should(querySrv.toEjsObj(q));
	        request.facet($scope.ejs.StatisticalFacet('stats_'+alias)
	          .fields($scope.panel.field)
	          .facetFilter($scope.ejs.QueryFilter(
	            $scope.ejs.FilteredQuery(
	              query,
	              filterSrv.getBoolFilter(filterSrv.ids())
	            )
	          ))
	        );
	      });


      }


	var convert = function (value,format) {
	      switch (format) {
	      case 'money':
	        value = numeral(value).format('$0,0.00');
	        break;
	      case 'bytes':
	        value = numeral(value).format('0.00b');
	        break;
	      case 'float':
	        value = numeral(value).format('0.000');
	        break;
	      default:
	        value = numeral(value).format('0,0');
	      }
	      return value;
	    };



      // Populate the inspector panel
      $scope.inspector = angular.toJson(JSON.parse(request.toString()),true);

      results = request.doSearch();

	      results.then(function(results) {
	        $scope.panelMeta.loading = false;
	        var value = results.facets.stats[$scope.panel.mode];
			
		/*
		[
		  {"title":"Revenue","subtitle":"US$, in thousands","ranges":[150,225,300],"measures":[220,270],"markers":[250]},
		  {"title":"Profit","subtitle":"%","ranges":[20,25,30],"measures":[21,23],"markers":[26]},
		  {"title":"Satisfaction","subtitle":"out of 5","ranges":[3.5,4.25,5],"measures":[3.2,4.7],"markers":[4.4]}
		]
		*/

		var bullets = queries.map(function (q){
	          var alias = q.alias || q.query;
		  var obj = {};
		  obj.title = alias;
		  obj.subtitle = $scope.panel.format;
		  obj.ranges = [ results.facets['stats_'+alias]['min'],results.facets['stats_'+alias]['mean'], results.facets['stats_'+alias]['max'] ];
		  obj.measures = [ results.facets['stats_'+alias]['mean']-results.facets['stats_'+alias]['min'], results.facets['stats_'+alias]['max']-results.facets['stats_'+alias]['mean'] ];
		  obj.markers = [ results.facets['stats_'+alias]['max'] ];
		  return obj;
		});

	        $scope.data = {
	          value: value,
		  bullets: bullets
	        };
	
	        // console.log($scope.data);
	
	        $scope.$emit('render');
	      });

           // console.log($scope.data);
           $scope.$emit('render');

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

  });

  module.filter('formatstats', function(){
    return function (value,format) {
      switch (format) {
      case 'money':
        value = numeral(value).format('$0,0.00');
        break;
      case 'bytes':
        value = numeral(value).format('0.00b');
        break;
      case 'float':
        value = numeral(value).format('0.000');
        break;
      default:
        value = numeral(value).format('0,0');
      }
      return value;
    };
  });


 module.directive('bullet', function(querySrv) {
    return {
      restrict: 'A',
      link: function(scope, elem) {
        var plot;

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
          // console.log('bullet render event received');
          elem.css({height:scope.panel.height||scope.row.height});
          elem.text('');

          scope.panelMeta.loading = false;

	  var style = scope.dashboard.current.style;

	  var margin = {top: 10, right: 20, bottom: 40, left: 60},
	    width = $(elem[0]).width() - margin.left - margin.right,
	    height = $(elem[0]).height() - margin.top - margin.bottom;

	  var lcount = 0;
		for (var k in scope.data.bullets) {
		    if (scope.data.bullets.hasOwnProperty(k)) {
		       ++lcount;
		    }
		}
	  var inheight = height / lcount * 1.2;

          elem.css({height:'auto'});

	  var chart = d3.bullet()
	    .width(width)
	    .height(inheight);

	  console.log('DATA BULLETS:',scope.data.bullets);

	var svg = d3.select(elem[0]).selectAll("svg")
	      .data(scope.data.bullets)
	    .enter().append("svg")
	      .attr("class", "bullet")
	      .attr("width", width + margin.left + margin.right)
	      .attr("height", inheight + margin.top + margin.bottom)
	    .append("g")
	      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
	      .call(chart);
	
	  var title = svg.append("g")
	      .style("text-anchor", "end")
	      .attr("transform", "translate(-6," + inheight / 2 + ")");
	
	  title.append("text")
	      .attr("class", "title")
	      .text(function(d) { return d.title; });
	
	  title.append("text")
	      .attr("class", "subtitle")
	      .attr("dy", "1em")
	      .text(function(d) { return d.subtitle; });
	


	}
      }

    };
  });












});
