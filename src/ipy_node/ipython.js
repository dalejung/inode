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
var Contextify = require('contextify');
var fs = require('fs');

IPYTHON_SCRIPTS = ['namespace.js', 'utils.js', 'kernel.js'];

function import_ipython(context, scripts, base_dir) {
  /*
   * Run ipython scripts in Contextify context. 
   * This is to support how IPython namespaces, 
   * which requires shared global scope across scripts
   */
  base_dir = base_dir ? base_dir : process.env.IPYTHON_DIR

  for (var i=0; i < scripts.length; i++) {
    var script = base_dir + '/' +scripts[i];
    var filename = require.resolve(script);
    var content = fs.readFileSync(filename, 'utf8');
    context.run(content);
  }
}

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
import_ipython(sandbox, IPYTHON_SCRIPTS);
IPython = sandbox.IPython;

module.exports.IPython = IPython
