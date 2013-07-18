/*
 * This would have easier except I didn't want to touch the source files.
 * The ipython stuff sets the IPython namespace with var which means that 
 * it won't affect globals in browserify. So instead I grab the script
 * contents with the help of brfs and add a return.
 *
 * Note: This file is called when using browserify via the 'browser' section
 * in package.json
 */
var fs = require('fs');
var path = require('path');

var content = fs.readFileSync(__dirname + '/ipython-browser.js', 'utf8');
// not sure why but eval-ing content didn't work right.
module.exports = new Function(content + ";return IPython;")();
