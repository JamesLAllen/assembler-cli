var Assembler = require('assembler-cli');
var gulp = require('gulp');

var assembler = Assembler(gulp, {
	port: '8080', // any server settings can be put into the main options, or within a server object
	production: {
		minify: false,  // any env specific settings can override global settings
	},
	development: {
		// server settings can be put into a server object
		// server:{
			// liveReload: false // stops liveReload from starting
		// }
	},
	test: {
		LOG_TRANSITIONS : true
	},
	paths:{
		// scripts: 'js'
	},
	// beautify: true,  // global
	minify: false
})
.async('html')
.async('scripts')
.async('styles');