var fs = require('fs');
var path = require('path');
var html = require('../html.js');
var magic_tools = require('./magic_tools.js');

var Script = process.binding('evals').NodeScript;
var runInNewContext = Script.runInNewContext;

module.exports.eval = function(code, context) {
  // %run magic
  var res = magic_tools.code_match(code); 
  if (!res) {
    return;
  }
  var magic_cmd = res[0];
  var args = res[1];
  if (magic_cmd == '%run') {
    module.exports.run(args[0], context);
    return "Ran "+args[0];
  }
}

module.exports.run = function(file, global_ns, callback) {
  /*
   * Runs a file and then add variables to global scope. 
   *
   * Akin to %run for ipython
   */
  var filename = global_ns.require.resolve(file);
  var content = fs.readFileSync(filename, 'utf8');
  var ext = path.extname(filename);

  if (!global_ns) {
    global_ns = eval('global');
  }

  if (ext == '.js') {
    js_run(content, filename, global_ns, callback);
  }
  else if (ext == '.html') {
    html_run(content, filename, global_ns, callback);
  }
}

module.exports.js_run = function(content, filename, global_ns) {
  var dirname = path.dirname(filename);

  var lines = content.split('\n');
  // special case of having a run call in the first line.
  // this is for running an html file first.
  if (lines[0].substr(0, 4) == '%run') {
    var file = lines[0].split(' ')[1];
    var content = lines.slice(1).join('\n');

    return module.exports.run(file, global_ns, function() {
      return js_run(content, filename, global_ns);
    });
  }

  var sandbox = {};
  for (var k in global_ns) {
    sandbox[k] = global_ns[k];
  }

  sandbox.__filename = filename;
  sandbox.__dirname = dirname;
  sandbox.global_ns = sandbox;

  runInNewContext(content, sandbox, filename, 0, true);
  // TODO: Should this be more restrictive?
  for (var k in sandbox) {
    global_ns[k] = sandbox[k];
  }
}

function html_run(content, filename, global_ns, callback) {

  var window = html.create_dom();
  var document = window.document
  // get attrs of empty window
  var default_keys = {}
  for (var name in window) {
    default_keys[name] = window[name]
  }

  document.write(content);

  html.window_vars(window, default_keys, function (changed) {
    for (var name in changed) {
      global_ns[name] = changed[name];
    }
    if (callback) {
      callback();
    }
  });

  global_ns['window'] = window;
  global_ns['document'] = document;

  global_ns['_http_callback'] = function() {
    return html.stripScripts(document.innerHTML);
  }
}

