/* jshint node: true */


// process.argv.push('--silent');
var gulp 					= require('gulp');
var merge 					= require('merge');
var runSequence 			= require('run-sequence');
var gutil					= require('gulp-util');
var requireDir 				= require('directory');


function exists(item){
	if (typeof item !== 'undefined'){
		return true;
	}
	return false;
}


function Assembler(options){
	var _taskPrefix			= 'ab-';
	var DEFAULT_TASK		= _taskPrefix + 'default-task';
	var QUEUE_TASK			= _taskPrefix + 'queue-task';

	var _args 				= null;
	var _config 			= null;
	var _error 				= null;
	var _tasks				= {};
	var _taskQueue			= [];

	

	function _construct(options){

		_error 				= false;
		_args 				= _getCliArgs();
		_config 			= _generateConfig(options);
		
		_generateDefaultTasks();
	}

	function _queue(taskName, options){
		// closes current async group, inserts as queued group
		_register(taskName);
		_taskQueue.push(taskName);
		return _self;
	}

	function _async(taskName, options){
		// create async group - all tasks start at once
		_register(taskName);
		if (!_taskQueue[_taskQueue.length - 1] || typeof _taskQueue[_taskQueue.length - 1] === 'string'){
			_taskQueue.push([]);
		}
		_taskQueue[_taskQueue.length - 1].push(taskName);
		return _self;
	}

	function _register(taskName){
		_tasks[taskName] = require(__dirname + '/tasks/' + taskName)(_self);
		// _tasks[taskName].name = taskName;
	}

	function _use(library){
		if (typeof library === 'string'){
			library = require('./libraries/' + library);
		}

		switch (library.type){
			case 'scripts':
				_addScriptsLibrary(library.content);
				break;
			case 'styles':
				_addStylesLibrary(library.content);
				break;
			case 'images':

				break;
			case 'html':

				break;
			case 'php':

				break;
		}
		return _self;
	}

	function _addScriptsLibrary(content){
		var scripts = _config.scripts || {
			paths: {},
			shim: {}
		};

		if (content.paths){
			merge.recursive(true, scripts.paths, content.paths);
		}

		if (content.shim){
			merge.recursive(true, scripts.shim, content.shim);
		}

		_config.scripts = scripts;
	}

	function _addStylesLibrary(content){

	}

	function _getTask(module, isWatching){
		var fullTaskName = module.fullName + ':watch';
		if (gulp.tasks.hasOwnProperty(fullTaskName) && isWatching){
			return fullTaskName;
		}
		fullTaskName = module.fullName + ':init';
		if (gulp.tasks.hasOwnProperty(fullTaskName)){
			return fullTaskName;
		}
		if (!gulp.tasks.hasOwnProperty(module.fullName)){
			throw new Error('ERROR - task "' + module.fullName + '" does not exist');
		}
		return module.fullName;
	}

	function _buildSequence(isWatching){
		var queue = [];
		_taskQueue.forEach(function(item, index){
			var task;
			if (typeof item !== 'string'){
				var subQueue = [];
				item.forEach(function(subItem, subIndex){
					if (typeof subItem === 'string'){
						var asyncTask = _getTask(_tasks[subItem], isWatching);
						if (asyncTask){
							subQueue.push(asyncTask);
						}
					}
				});
				if (subQueue.length > 0){
					task = subQueue;
				}
			}
			else
			{
				task = _getTask(_tasks[item], isWatching);
			}
			queue.push(task);
		});
		if (queue.length <= 1){
			return queue[0];
		}
		return queue;
	}

	function _generateDefaultTasks(){
		_register('server');
		gulp.task('default', function(callback){
			console.log('HELP FUNCTIONS GO HERE');
		});

		gulp.task('build', function(callback){
			// call each queued task in order
			var queue = _buildSequence(false);
			queue.push(callback);
			runSequence.apply(this, queue);
		});

		gulp.task('serve', function(callback){
			// import server task
			// start server
			// call each queued task in order, with watch flag default true
			var queue = _buildSequence(true);
			
			queue.push(_taskPrefix + 'server');
			queue.push(callback);

			runSequence.apply(this, queue);
		});

		gulp.task('server', ['serve']);
	}

	function _generateConfig(options){
		var options = options || {};
		var args = _args || {};
		var defaults = require('./defaults');

		options.environment = args.environment || options.environment || options.env || defaults.environment;
		delete options.env;
		delete args.env;
		delete args.environment;

		options = merge.recursive(true, options, args);

		// define defaults
		var envDefaults = defaults[options.environment];
		
		var envOptions = options[options.environment];
		var testOptions = options.test;

		delete options.production;
		delete options.development;
		delete options.test;
		
		// define cli options
		for (var argsVar in args){
			if (exists(args[argsVar])){
				options[argsVar] = args[argsVar];
			}
			else if (exists(options[argsVar])){
				options[argsVar] = options[argsVar];
			}
			else if (exists(envDefaults[argsVar])){
				options[argsVar] = envDefaults[argsVar];
			}
		}

		// define env-specific options
		for (var envVar in envOptions){
			if (exists(envOptions[envVar])){
				options[envVar] = envOptions[envVar];
			}
			else if (exists(options[envVar])){
				options[envVar] = options[envVar];
			}
			else if (exists(envDefaults[envVar])){
				options[envVar] = envDefaults[envVar];
			}
		}

		// merge server options
		var serverOptions = {};
		for (var serverVar in envDefaults.server){
			options.server = options.server || {};

			if (exists(args[serverVar])){
				serverOptions[serverVar] = args[serverVar];
			}
			else if (exists(envOptions[serverVar])){
				serverOptions[serverVar] = envOptions[serverVar];
			}
			else if (exists(options[serverVar])){
				serverOptions[serverVar] = options[serverVar];
			}
			else if (exists(options.server[serverVar])){
				serverOptions[serverVar] = options.server[serverVar];
			}
			else if (exists(envDefaults[serverVar])){
				serverOptions[serverVar] = envDefaults[serverVar];
			}

			delete options[serverVar];
		}
		options.server = serverOptions;
		if (options.outputPath){
			options.paths = options.paths || envDefaults.paths;
			options.paths.dist = options.outputPath;
			delete options.outputPath;
		}
		
		// define the rest
		config = merge.recursive(true, envDefaults, options);
		console.log(config);
		return config;
	}

	function _getCliArgs(){
		var cliArgs = require('minimist')(process.argv.slice(2), {});
		cliArgs.environment = cliArgs.env || cliArgs.environment;
		if (!cliArgs.environment) delete cliArgs.environment;
		delete cliArgs.env;
		delete cliArgs._;

		switch(cliArgs.environment){
			case 'dev':
				cliArgs.environment = 'development';
			break;
			case 'prod':
				cliArgs.environment = 'production';
			break;
		}

		// convert all string booleans to booleans
		for (var arg in cliArgs){
			if (typeof cliArgs[arg] === 'string' && (cliArgs[arg].toLowerCase() === 'true' || cliArgs[arg].toLowerCase() === 'false')){
				cliArgs[arg] = (cliArgs[arg].toLowerCase() === 'true');
			}
		}

		// ensure port is number
		if (typeof cliArgs.port !== 'undefined') {
			if (typeof cliArgs.port !== 'number') {
				throw new Error("port must be number \n" + cliArgs.port);
			}
		}
		
		return cliArgs;
	}

	var _self = {
		get config(){
			return _config;
		},
		get env(){
			return _config.env;
		},
		get prefix(){
			return _taskPrefix;
		},
		queue: _queue,
		async: _async,
		register: _register,
		use: _use,
	}

	_construct(options);



	return _self;
}

module.exports = Assembler;
