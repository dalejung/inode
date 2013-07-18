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
var fs = require('fs'),
  Contextify = require('contextify'),
  path = require("path");

/*
 * IPython requires the following externalities:
 *  jquery
 *  `document.cookies`
 *  WebSocket
 */
function create_ipython() {
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

  IPYTHON_SCRIPTS = ['namespace.js', 'utils.js', 'kernel.js'];
  for (var i=0; i < IPYTHON_SCRIPTS.length; i++) {
    var script = IPYTHON_SCRIPTS[i];
    var content = fs.readFileSync(path.join(__dirname, 'src/ipycli', script), 'utf8');
    sandbox.run(content);
  }
  return sandbox.IPython
}

module.exports = create_ipython();
