var gulp               	= require('gulp');
var del 				= require('del');
var plugins            	= require('gulp-load-plugins')();
var merge 				= require('merge');
var gutil 				= plugins.util;
var runSequence 		= require('run-sequence').use(gulp);
var server 				= require('gulp-server-livereload');

var AssemblerServer = function(assembler){

	var _config = assembler.config;
	var _paths = assembler.config.paths;
	var _taskPrefix = _taskPrefix || assembler.prefix;
	var _name = 'server';
	var _src;
	var _fileGlob = '*.*';
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
			callback();
		});

		gulp.task(_self.fullName, [], function(callback){
			_config.server.livereload = _config.server.liveReload;
			return gulp.src(_paths.dist)
			.pipe(server(_config.server));
		});


		gulp.task(_self.fullName + ':init', [_self.fullName + '-clean:dist'], function(callback){
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

module.exports = AssemblerServer;