require('babel-core/register');

module.exports = function(grunt) {
  'use strict';

  var unitTestFiles = ['test/unit/*.js'];
  var sourceFiles = ['src/*.js'];
  var jsFiles = sourceFiles.concat(unitTestFiles);

  process.env.NODE_ENV='test';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    babel: {
      options: {
        sourceMap: true,
        presets: ['es2015']
      },
      dist: {
        files: {
            'dist/app.js': 'src/radicchio.js'
        }
      }
    },

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

  grunt.registerTask('default', ['babel']);
  grunt.registerTask('lint', 'eslint');
  grunt.registerTask('unit-test', 'mochaTest');
  grunt.registerTask('test', ['lint', 'unit-test']);
};
