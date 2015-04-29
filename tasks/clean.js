
var AssemblerClean = function(assembler){

	var gulp = assembler.gulp;

	var del 				= require('del');
	var plugins            	= require('gulp-load-plugins')();
	var gutil 				= plugins.util;
	var runSequence 		= require('run-sequence').use(gulp);
	var sass				= require('gulp-sass');
	var cssBeautify			= require('gulp-cssbeautify');
	var autoprefix 			= require('gulp-autoprefixer');

	var _config = assembler.config;
	var _paths = assembler.config.paths;
	var _taskPrefix = _taskPrefix || assembler.prefix;
	var _name = 'clean';
	var _src;
	var _fileGlob = '*.*';
	var _error = false;

	function _construct(assembler){
		_src = [_paths.app + '/' + _fileGlob, '!' + _paths.app + '/_*.*'];
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

		gulp.task(_self.fullName, [], function(callback){
			del([
				_paths.dist + '/**/*'
			], callback);
		});


		gulp.task(_self.fullName + ':init', [], function(callback){
			runSequence(
				_self.fullName,
				callback
			);
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

module.exports = AssemblerClean;