'use strict';

var projectKanbanApp = angular.module('projectKanbanApp', ['ngRoute', 'angularytics', 'ngMaterial'])
  .config(['$compileProvider', '$routeProvider', '$mdThemingProvider', 'AngularyticsProvider', function($compileProvider, $routeProvider, $mdThemingProvider, AngularyticsProvider) {
    AngularyticsProvider.setEventHandlers(['Console', 'GoogleUniversal']);

    // Initialize Parse
    Parse.initialize("9tjijJ4jwAQeyIhaF2o0ju8IMtzd7X5JeM5ujsRX", "JmoMBRlRmmtLqJMzJZdaa1ovSV9G8zpZvSL3GQVj");

    // Browsing my regular project types.
    $routeProvider.when('/browse/sprint', {
      title: 'Browse Sprints',
      templateUrl: 'views/browse.html',
      controller: 'browseSprintCtrl'
    });
    $routeProvider.when('/browse/:type?', {
      title: 'Browse Projects',
      templateUrl: 'views/browse.html',
      controller: 'browseCtrl'
    });
    // View a board.
    $routeProvider.when('/board/:project/:branch?', {
      templateUrl: 'views/kanban.html',
      controller: 'boardCtrl'
    });
    $routeProvider.when('/sprint/:sprint/:needs?', {
      templateUrl: 'views/kanban-sprint.html',
      controller: 'sprintCtrl'
    });
    $routeProvider.when('/changelog', {
      title: 'Changelog',
      templateUrl: 'views/changelog.html'
    });
    $routeProvider.otherwise({
      title: 'Home',
      redirectTo: '/browse'
    });

    $compileProvider.debugInfoEnabled(false);

    $mdThemingProvider.theme('default')
      .primaryPalette('light-blue')
      .accentPalette('blue-grey');
  }])
  .run(['$route', '$rootScope', '$location', 'Angularytics', function($route, $rootScope, $location, Angularytics) {
    Angularytics.init();

    $rootScope.page = {
      setTitle: function(title) {
        this.title = title + ' | Contrib Kanban';
      }
    };
    $rootScope.$on('$routeChangeSuccess', function(event, current, previous) {
      if (current.$$route.title !== undefined) {
        $rootScope.page.setTitle( current.$$route.title || '');
      }
    });

    var original = $location.path;
    $location.path = function (path, reload) {
      if (reload === false) {
        var lastRoute = $route.current;
        var un = $rootScope.$on('$locationChangeSuccess', function () {
          $route.current = lastRoute;
          un();
        });
      }
      return original.apply($location, [path]);
    };
  }]);
