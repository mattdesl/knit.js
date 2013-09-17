/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
	pkg: grunt.file.readJSON('package.json'),
	
	
	concat: {
	  options: {
		// define a string to put between each file in the concatenated output
		separator: '\n\n'
	  },
	  dist: {
		// the files to concatenate
		src: ['src/knit/Knit.js', 
              'src/knit/KnitFabrics.js', 
              'src/knit/TypeUtil.js', 
              'src/knit/CanvasUtil.js',
              'src/knit/KnitWeb.js'],
		// the location of the resulting JS file
		dest: 'dist/<%= pkg.name %>.js'
	  },
	  examples: {
		// the files to concatenate
		src: ['src/knit/Knit.js', 
              'src/knit/KnitFabrics.js', 
              'src/knit/TypeUtil.js', 
              'src/knit/CanvasUtil.js',
              'src/knit/KnitWeb.js'],
		// the location of the resulting JS file
		dest: 'examples/js/<%= pkg.name %>.js'
	  }
	},
	
	uglify: {
	  options: {
		// the banner is inserted at the top of the output
		banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
	  },
	  dist: {
		files: {
		  'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
		}
	  }
	},
	
	jshint: {
		// define the files to lint
		files: ['gruntfile.js', 'src/knit/*.js'],
		// configure JSHint (documented at http://www.jshint.com/docs/)
		options: {
		    // more options here if you want to override JSHint defaults
			globals: {
			  jQuery: true,
			  console: true,
			  module: true
			}
		}
	},
	
	watch: {
	  files: ['<%= jshint.files %>'],
	  tasks: ['default']
	}
  });

  // These plugins provide necessary tasks.
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-concat');
	
	//build task
	grunt.registerTask('default', ['concat', 'uglify']);
};
