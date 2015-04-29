var Assembler = require('assembler-cli');
var gulp = require('gulp');

var assembler = Assembler(gulp, {
	// port: '8080', // any server settings can be put into the main options, or within a server object
	production: {
		minify: false,  // minify is default true on production, false for development and test
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
	minify: false,
	vendorFiles:{

	}
})
.queue('clean')
.queue('bower')
.async('public')
.async('html')
.async('scripts')
.async('styles');

// assembler.use('assembler-gsap'); // libraries not yet fully implemented

assembler.import('{bower}/gsap/src/minified/TweenMax.min.js');  // import vendor library