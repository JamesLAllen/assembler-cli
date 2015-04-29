# assembler-cli
Framework-agnostic build environment.

### TODO
* Add support for passing objects with async & queue
* Pull in public and vendor directories
* Add Notify
* Add logging service
* Add Verbose vs Normal logging
* Create blueprints and generators
* Preserve Color output
* Tests
* Lots and lots of refactoring, optimization

## Installation

``` sh
npm install -g assembler-cli
npm install --save-dev assembler-cli
```

## Prerequisites

You will need the following things properly installed on your computer.

* gulpfile.js in project root
* bower.js in project root
* [Example Assembler Project](https://github.com/Mode7James/assembler-example)

## Usage

* `assembler build` Builds with basic defaults
* `assembler serve` Builds the project, and then starts a development server running LiveReload
* See example gulpfile