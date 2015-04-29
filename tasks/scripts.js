
// var fs                 	= require('fs');
// var es                 	= require('event-stream');
// var historyApiFallback 	= require('connect-history-api-fallback');

var AssemblerScripts = function(assembler){

	var gulp = assembler.gulp;

	var jshint				= require('gulp-jshint');
	var stylish				= require('jshint-stylish-ex');
	var lazypipe 			= require('lazypipe');
	var del 				= require('del');
	var plugins            	= require('gulp-load-plugins')();
	var gutil 				= plugins.util;
	var merge 				= require('merge');
	var runSequence 		= require('run-sequence').use(gulp);
	var replace				= require('gulp-replace');
	var glob 				= require('glob-utils');
	var rjs 	 			= require('requirejs');
	var concat 				= require('gulp-concat');
	var insert 				= require('gulp-insert');
	// var loaderJS			= require.resolve('loader.js');
	var fs 					= require('fs');

	var _config 			= assembler.config;
	var _paths 				= assembler.config.paths;
	var _taskPrefix 		= _taskPrefix || assembler.prefix;
	var _name 				= 'scripts';
	var _src;
	var _fileGlob 			= '*.js';
	var _error 				= false;
	var _lintingFailed 		= false;
	var _loaderFile 		= require.resolve('loader.js');


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

	function _generateVendorJS(){

	}

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
			console.log('copyto-temp');
			var copySrc = _src
			copySrc.push(_loaderFile);

			console.log(copySrc);
			return gulp.src(copySrc, {read:false})
				.pipe(gulp.dest(_tempPass1 + '/' + _name));
		});

		gulp.task(_self.fullName + ':vendor', [], function(callback){
			// require('fs').writeFile(_tempPass1 + '/' + _name + '/vendor.js', '', callback);
			// console.log(_config.imports);
			return gulp.src(_config.imports)
				.pipe(concat('vendor.js'))
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
			// .pipe(insert.prepend(require('./node_modules/loader.js/loader.js')))
			
			.pipe(insert.prepend(fs.readFileSync(_loaderFile)))

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

			var rjsOptions = merge.recursive(true, {
				modules : _defineModules(),
				baseUrl : _tempPass1 + '/' + _name,
				dir : _tempPass2 + '/' + _name
			}, _config.scripts);
			
			rjsOptions.paths = _definePaths(_config.scripts.paths);



			// rjsOptions.wrapShim = true;
			rjsOptions.removeCombined = true;
			rjsOptions.skipDirOptimize = true;
			rjsOptions.skipModuleInsertion = true;
			rjsOptions.optimize = 'none';
			rjsOptions.normalizeDirDefines = 'all';


			rjs.optimize(rjsOptions, function(response){
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
				_self.fullName + ':vendor',
				_self.fullName + ':rjs',
				_self.fullName + ':process',
				callback
			);
		});


		gulp.task(_self.fullName + ':init', [], function(callback){

			runSequence(
				// _self.fullName + ':format',
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

		// console.log(process.cwd());
		// var modulesConfig = require(process.cwd() + '/' + _paths.app + '/_modules');
		// console.log('defineModules');
		// console.log(modulesConfig);

		
		
		var moduleNames = [];
		var rtnModules = [];
		var i = 0;

		function getModuleName(module){
			return module.replace(/.js$/, "");
		}

		function addModuleName(index){
			moduleNames.push(getModuleName(modules[index]));
		}

		function addModule(module){
			var moduleObj = (typeof module !== 'string')? module : {};
			moduleObj.name = module.name || getModuleName(module);
			moduleObj.exclude = [];
			if (moduleObj.name !== 'vendor'){
				moduleObj.exclude.push('vendor');
			}
			if (moduleObj.name !== _config[_name].primaryModule)
			{
				
				for (var w = 0; w < moduleNames.length; w ++){
					if (moduleNames[w] !== moduleObj.name) {
						moduleObj.exclude.push(moduleNames[w]);
					}
				}
			}
			else
			{
				moduleObj.insertRequire = [_config[_name].primaryModule];
				// moduleObj.include = ['loader.js'];

			}
			// console.log(moduleObj);
			rtnModules.push(moduleObj);
		}

		// addModule({
		// 	name: 'vendor',

		// });

		for (i = 0; i < modules.length; i ++){
			addModuleName(i);
		}

		for (i = 0; i < moduleNames.length; i ++){
			addModule(modules[i]);
		}


		// console.log(rtnModules);

		return rtnModules;

	};

	function _getImports(){

	}

	function _definePaths(existingPaths){
		var existingPaths = existingPaths || {};




		var rtnPaths = merge.recursive(true, {}, existingPaths);




		// console.log(_config.imports);

		return rtnPaths;
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

module.exports = AssemblerScripts;