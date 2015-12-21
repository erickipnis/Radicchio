require('babel-core/register');

module.exports = function(grunt) {
  'use strict';

  var unitTestFiles = ['test/unit/*.js'];
  var sourceFiles = ['src/**/*.js'];
  var jsFiles = sourceFiles.concat(unitTestFiles);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    eslint: {
      target: jsFiles,
    },

    mochaTest: {
      test: {
        src: unitTestFiles,
      },
    },

    watch: {
      js: {
        options: { spawn: false },
        files: jsFiles,
        tasks: ['default'],
      },
    },
  });

  // Load the grunt plugins
  require('load-grunt-tasks')(grunt);

  grunt.registerTask('default', 'test');
  grunt.registerTask('lint', 'eslint');
  grunt.registerTask('unit-test', 'mochaTest');
  grunt.registerTask('test', ['lint', 'unit-test']);
}
