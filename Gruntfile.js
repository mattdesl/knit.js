module.exports = function(grunt) {
	
	require('load-grunt-tasks')(grunt);
	
	grunt.initConfig({

		pkg: grunt.file.readJSON('package.json'),

		dirs: {
			build: 'build',
			src: 'lib',
			demos: 'demos', 
			demo_src: 'demos/src',
			demo_build: 'demos/build',
			docs: 'docs'
		}
		
	});

	// grunt.registerTask('default', ['build']);

};