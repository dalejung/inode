var fs = require('fs');
var path = require('path');
var Fiber = require('fibers');

var html = require('../html.js');
var magic_tools = require('./magic_tools.js');
var colorize = require('../util.js').colorize;

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

var js_run = function(content, filename, global_ns, callback) {
  var dirname = path.dirname(filename);

  var lines = content.split('\n');
  // special case of having a run call in the first line.
  // this is for running an html file first.
  if (lines[0].substr(0, 4) == '%run') {
    var file = lines[0].split(' ')[1];
    var content = lines.slice(1).join('\n');

    // run html file and then run js_run via the callback
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
  if (callback) {
    callback();
  }
}

module.exports.js_run = js_run;

function html_run(content, filename, global_ns, callback) {
  var window = html.create_dom(filename);
  var document = window.document
  // get attrs of empty window
  var default_keys = {}
  for (var name in window) {
    default_keys[name] = window[name]
  }

  document.write(content);

  var fiber = Fiber.current;
  // this is async with setTimeout, sync with Fiber
  html.window_vars(window, default_keys, function (changed) {
    for (var name in changed) {
      global_ns[name] = changed[name];
    }
    // output errors if they exist
    if (typeof(document.errors) != 'undefined') {
      for(var i=0; i < document.errors.length; i++) {
        var err = document.errors[i];
        var msg = err.data.error + '\n' + err['message'];
        console.log(colorize(msg, 'red'));
      }
    }
    fiber.run();
  });

  Fiber.yield();

  global_ns['window'] = window;
  global_ns['document'] = document;

  global_ns['_http_callback'] = function() {
    return html.stripScripts(document.innerHTML);
  }
  if (callback) {
    callback();
  }
}

