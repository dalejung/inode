var Contextify = require('Contextify');
var fs = require('fs');
var path = require('path');

function create_ipython() {
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
  var content = fs.readFileSync(path.join(__dirname, 'ipython-browser.js'), 'utf8');
  sandbox.run(content);
  return sandbox.IPython
}

var IPython = create_ipython();
module.exports = IPython
