/*
 * Creates an the baseline IPython namespace. 
 *
 * Files included:
 *    namespace.js
 *    utils.js
 *    kernel.js
 *
 * Exports
 *  IPython
 */ 
var fs = require('fs');
var Contextify = require('contextify');

/*
 * IPython requires the following externalities:
 *  jquery
 *  `document.cookies`
 *  WebSocket
 */
var $ = require('jquery').create();
// kernel needs document var for document.cookies
window = $('html').parent().get(0).parentWindow
document = window.document
var WebSocket = require('ws');
var sandbox = { 
  console : console, 
  $ : $, 
  WebSocket : WebSocket, 
  setTimeout : setTimeout,
  document : document,
};

Contextify(sandbox);
// run the combined src scripts
var filename = require.resolve('./ipy_node.js');
var content = fs.readFileSync(filename, 'utf8');
sandbox.run(content);

module.exports.IPython = sandbox.IPython
module.exports.IPythonBridge = sandbox.IPythonBridge
