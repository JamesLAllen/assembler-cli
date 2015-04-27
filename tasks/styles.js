var gulp               	= require('gulp');
var del 				= require('del');
var plugins            	= require('gulp-load-plugins')();
var gutil 				= plugins.util;
var runSequence 		= require('run-sequence').use(gulp);
var sass				= require('gulp-sass');
var cssBeautify			= require('gulp-cssbeautify');
var autoprefix 			= require('gulp-autoprefixer');

var AssemblerStyles = function(assembler){

	var _config = assembler.config;
	var _paths = assembler.config.paths;
	var _taskPrefix = _taskPrefix || assembler.prefix;
	var _name = 'styles';
	var _src;
	var _fileGlob = '*.scss';
	var _error = false;

	function _construct(assembler){
		_src = [_paths.app + '/' + _name + '/**/' + _fileGlob, '!' + _paths.app + '/' + _name + '/**/_*.*'];
		_defineTasks();
	}

	function _resetErrors(){
		_error = false;
	};

	function _errorHandler(error, callback) {
		var task = error.task || '';
	  	gutil.log(gutil.colors.red.bold('ERROR [ ' + task + ' ]'), '\n\n', gutil.colors.yellow(error), error, '\n\n');
		_error = true;
		if (callback){
			callback();
		}
	};

	function _defineTasks(){

		gulp.task(_self.fullName + '-clean:dist', function(callback){
			del([
				_paths.dist + '/' + _paths.assets + '/**/*.{less,css,scss,sass}',
				_paths.dist + '/' + _paths.assets + '/**/*.{less,css,scss,sass}.map'
			], callback);
		});

		gulp.task(_self.fullName, [], function(callback){
			return gulp.src(_src)
				.pipe(sass({
					errLogToConsole: true, 
					includePaths:['./' + _paths.vendor, './' + _paths.bower],
					// outputStyle: 'compressed',
				}))
				.pipe(autoprefix({
					browsers:'last 10 versions'
				}))
				// .pipe(cssBeautify())
				.pipe(plugins.if(_config.beautify, cssBeautify()))
				.pipe(gulp.dest(_paths.dist + '/' + _paths.assets));
		});


		gulp.task(_self.fullName + ':init', [_self.fullName + '-clean:dist'], function(callback){
			runSequence(
				_self.fullName,
				callback
			);
		});

		gulp.task(_self.fullName + ':watch', [_self.fullName + ':init'], function(){
			var self = this;
			var stylesWatch = gulp.watch(_src, function(callback){
				console.log(_self.fullName);
				runSequence.apply(self, [_self.fullName, function(cb){
					_resetErrors();
					if (cb){
						cb();
					}
				}]);
			});

			stylesWatch.on('error', function(event){
				gutil.log(event);
			});
			stylesWatch.on('change', function(event){
				gutil.log(event);
				if (event.type === 'deleted') {
					var path = event.path;
					path = path.replace(_paths.app + '/' + _name, _paths.dist + '/' + _paths.assets);
					path = path.replace('scss', 'css');
					del([
						path
					], function(err){
						if (err){
							console.log("error", err);
							return;
						}

						// console.log('Files deleted:', path);
					});
					if (plugins.cached.caches[_name]){
			     		delete plugins.cached.caches[_name][event.path];
			     	}
			     	plugins.remember.forget(_self.fullName, event.path);
			    }
			});
		});
	}


	var _self = {
		get name(){
			return _name;
		},
		set name(value){
			_name = value;
		},
		prefix: _taskPrefix,
		get fullName(){
			return _taskPrefix + _name;
		}
	}

	_construct(assembler);

	return _self;
}

module.exports = AssemblerStyles;