var Contextify = require('contextify');
var fs = require('fs');

function combine_scripts(base_dir, scripts) {
  var contents = []
  for (var i = 0; i < scripts.length; i++) {
    var script = base_dir + '/' +scripts[i];
    var filename = require.resolve(script);
    var content = fs.readFileSync(filename, 'utf8');
    contents.push(content);
  }
  var combined = contents.join('\n');
  return combined;
}

function ipython_js(ipython_dir) {
 
  ipython_dir = ipython_dir ? ipython_dir : process.env.IPYTHON_DIR
  ipython_dir = ipython_dir ? ipython_dir : '.'

  ipython_scripts = ['namespace.js', 'utils.js', 'kernel.js'];
  combined = combine_scripts(ipython_dir, ipython_scripts);
  return combined
}

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
// run the minimal ipython
combined = ipython_js();
sandbox.run(combined);

IPython = sandbox.IPython;

module.exports.IPython = IPython
