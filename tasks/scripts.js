var gulp               	= require('gulp');
// var fs                 	= require('fs');
var jshint				= require('gulp-jshint');
var stylish				= require('jshint-stylish-ex');
var lazypipe 			= require('lazypipe');
var del 				= require('del');
var plugins            	= require('gulp-load-plugins')();
var gutil 				= plugins.util;
// var es                 	= require('event-stream');
// var historyApiFallback 	= require('connect-history-api-fallback');
var runSequence 		= require('run-sequence').use(gulp);
var glob 				= require('glob-utils');
var rjs 	 			= require('requirejs');

var AssemblerScripts = function(assembler){

	var _config = assembler.config;
	var _paths = assembler.config.paths;
	var _taskPrefix = _taskPrefix || assembler.prefix;
	var _name = 'scripts';
	var _src;
	var _fileGlob = '*.js';
	var _error = false;
	var _lintingFailed = false;


	function _construct(assembler){

		_paths.pass1 = 'pass1';
		_paths.pass2 = 'pass2';

		_src = [_paths.app + '/**/' + _fileGlob, '!' + _paths.app + '/**/_*.*'];

		_tempPass1 = _paths.temp + '/' + _paths.pass1;
		_tempPass2 = _paths.temp + '/' + _paths.pass2;

		_defineTasks();
	}
	function _resetErrors(){
		_error = false;
	};

	function _resetJSHint(){
		_lintingFailed = false;
	}

	function _errorHandler(error, callback) {
		var task = error.task || '';
	  	gutil.log(gutil.colors.red.bold('ERROR [ ' + task + ' ]'), '\n\n', gutil.colors.yellow(error), error, '\n\n');
		_error = true;
		if (callback){
			callback();
		}
	};

	function _defineTasks(){
		gulp.task(_self.fullName + ':lint', function(callback){
			if(_lintingFailed){
				callback();
				return;
			}
			return gulp.src(_src)
				.pipe(jshint({
							esnext: true,
							asi: true,
							boss: true,
							debug: true,
							lastsemic: true,
							browser: true,

						}))
						.pipe(jshint.reporter(stylish, {
							verbose: false,
							reasonCol: 'red,normal'
						}))
						.pipe(jshint.reporter('fail'))
				.on('error', function(err){
						_lintingFailed = true;
						this.emit('end');
					})
		});

		gulp.task(_self.fullName + '-clean:pass1', function(callback){
			if(_lintingFailed){
				callback();
				return;
			}

			del([
				_tempPass1 + '/' + _name + '/**'
			], callback);
		});

		gulp.task(_self.fullName + '-clean:pass2', function(callback){
			if(_lintingFailed){
				callback();
				return;
			}
			del([
				_tempPass2 + '/' + _name + '/**'
			], callback);
		});

		gulp.task(_self.fullName + '-clean:dist', function(callback){
			if(_lintingFailed){
				callback();
				return;
			}
			del([
				_paths.dist + '/' + _paths.assets + '/**/*.{js,ts,js.coffee,coffee}',
				_paths.dist + '/' + _paths.assets + '/**/*.{js,ts,js.coffee,coffee}.map'
			], callback);
		});

		gulp.task(_self.fullName + ':checkError', [], function () {
		  if (_error) {
		    // console.log('Error occured, exitting build process... ');
		    process.exit(1);
		  }
		});

		gulp.task(_self.fullName + ':copyto-temp', [], function(callback){
			if(_lintingFailed){
				callback();
				return;
			}
			return gulp.src(_src, {read:false})
				.pipe(gulp.dest(_tempPass1 + '/' + _name));
		});

		var transpilePipe = lazypipe()
			.pipe(plugins.plumber, {
				_errorHandler: _errorHandler
			})
			.pipe(plugins.es6ModuleTranspiler, { type:'amd', moduleName: '' });

		gulp.task(_self.fullName + ':es6', [], function(callback){
			if(_lintingFailed){
				callback();
				return;
			}
			_resetErrors();
			return gulp.src(_src)
				.pipe(plugins.plumber({
					inherit: true,
					_errorHandler: function(error){
						error = error || {};
						error.task = _self.fullName + ':es6';
						_errorHandler(error, callback);
					}
				}))
				.pipe(plugins.cached('scripts'))
				.pipe(transpilePipe())
				.pipe(plugins.remember(_self.fullName))
				.pipe(gulp.dest(_tempPass1 + '/' + _name));
		});

		gulp.task(_self.fullName + ':process', [], function(callback){
			if(_lintingFailed){
				callback();
				return;
			}
			_resetErrors();
			return gulp.src(_paths.dist + '/' + _paths.assets + '/' + _fileGlob)
			.pipe(plugins.if((_config.environment === 'production' && _config.minify), plugins.stripDebug()))
			.pipe(plugins.if(_config.minify, plugins.uglify({
				// preserveComments: (_config.environment === 'production') ? 'some' : 'all',
				preserveComments: 'some'
			}),
			plugins.beautify({
				preserveNewlines: true,
				keepArrayIndentation: true
			})))
			.pipe(gulp.dest(_paths.dist + '/' + _paths.assets));
		});

		

		gulp.task(_self.fullName + ':rjs', [_self.fullName + '-clean:pass2', _self.fullName + '-clean:dist'], function(callback){
			if(_lintingFailed){
				callback();
				return;
			}
			_resetErrors();

			// var rjsOptions = merge({}, _config.scripts);
			
			_config.scripts.modules = _defineModules();
			_config.scripts.baseUrl = _tempPass1 + '/' + _name;
			_config.scripts.dir = _tempPass2 + '/' + _name;

			rjs.optimize(_config.scripts, function(response){
				runSequence(
					_self.fullName + ':copyto-dist',
					callback
				);
			}, callback);
		});

		gulp.task(_self.fullName + ':copyto-dist', function(callback){
			if(_lintingFailed){
				callback();
				return;
			}

			return gulp.src([_tempPass2 + '/' + _name + '/' + _fileGlob, '!' + _tempPass2 + '/' + _name + '/_*.*'])
				.pipe(gulp.dest(_paths.dist + '/' + _paths.assets));
		});

		gulp.task(_self.fullName, [], function(callback){
			runSequence(
				_self.fullName + ':lint',
				_self.fullName + ':copyto-temp',
				_self.fullName + ':es6',
				_self.fullName + ':rjs',
				_self.fullName + ':process',
				callback
			);
		});


		gulp.task(_self.fullName + ':init', [], function(callback){

			runSequence(
				_self.fullName + ':lint',
				_self.fullName + '-clean:pass1',
				_self.fullName,
				_self.fullName + ':checkError',
				callback
			);
		});

		gulp.task(_self.fullName + ':watch', [_self.fullName + ':init'], function(){
			var self = this;
			var scriptsWatch = gulp.watch(_src, function(callback){
				runSequence.apply(self, [_self.fullName, function(cb){
					_resetJSHint();
					_resetErrors();
					if (cb){
						cb();
					}
				}]);
			});

			scriptsWatch.on('error', function(event){
				gutil.log(event);
			});
			scriptsWatch.on('change', function(event){
				gutil.log(event);
				if (event.type === 'deleted') {
					var path = event.path;
					path = path.replace(_paths.app, _paths.temp + '/' + _paths.pass1 + '/' + _name);
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

	function _defineModules(){
		var modules = glob.basename([_paths.app + '/' + _fileGlob, '!' + _paths.app + '/**/_*.*']);
		
		var moduleNames = [];
		var rtnModules = [];
		var i = 0;

		function getModuleName(module){
			return module.replace(/.js$/, "");
		}

		function addModuleName(index){
			moduleNames.push(getModuleName(modules[index]));
		}

		function addModule(index){
			var module = modules[index];
			var moduleObj = {};
			moduleObj.name = getModuleName(module);
			if (moduleObj.name !== _config[_name].primaryModule)
			{
				moduleObj.exclude = [];
				for (var w = 0; w < moduleNames.length; w ++){
					if (moduleNames[w] !== moduleObj.name) {
						moduleObj.exclude.push(moduleNames[w]);
					}
				}
			}
			rtnModules.push(moduleObj);
		}

		for (i = 0; i < modules.length; i ++){
			addModuleName(i);
		}

		for (i = 0; i < moduleNames.length; i ++){
			addModule(i);
		}
		return rtnModules;

	};

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

module.exports = AssemblerScripts;