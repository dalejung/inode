var jsdom = require('jsdom')
var dual_xhr  = require("./xhr/dual_xhr.js");   

module.exports.create_dom = function () {
  /*
   * Setup a bare window ready for dom manipulations
   */
  var document = jsdom.jsdom("<html><head></head><body></body></html>");
  var window = document.createWindow()

  // Monkey-patch createRange support to JSDOM.
  document.createRange = function() {
    return {
      selectNode: function() {},
      createContextualFragment: jsdom.jsdom
    };
  };

  // taken from d3 npm module. index.js   
  var CSSStyleDeclaration_prototype = window.CSSStyleDeclaration.prototype,
      CSSStyleDeclaration_setProperty = CSSStyleDeclaration_prototype.setProperty;
  CSSStyleDeclaration_prototype.setProperty = function(name, value, priority) {
    return CSSStyleDeclaration_setProperty.call(this, name + "", value == null ? null : value + "", priority == null ? null : priority + "");
  };

  // attach special xhr object
  window.XMLHttpRequest = dual_xhr.XMLHttpRequest;

  return window
}

module.exports.window_vars = function (window, default_keys, callback) {
  // only out the new vars
  var found = false
  for (var name in window) {
    if (window[name] !== default_keys[name]) {
      found = true
      break;
    }
  }

  if (!found) {
    setTimeout(module.exports.window_vars, 100, window, default_keys, callback);
  } else {
    changed = {}
    for (var name in window) {
      if (window[name] !== default_keys[name]) {
        changed[name] = window[name];
      }
    }
    if (callback) {
      ts = setTimeout(callback, 500, changed);
    }
  }
}

module.exports.stripScripts = function(html) {
  // Remove scripts from html output
  // When outputting a rendered html page, the jsdom
  // has already run the scripts and including them will only
  // make the script run again.
  // TODO: ability to specify which scripts to run? 
  var window = module.exports.create_dom(); 
  var div = window.document.createElement('div');
  div.innerHTML = html;

  var scripts = div.getElementsByTagName('script');
  var i = scripts.length;
  while (i--) {
    var script = scripts[i];
    if (!(script.getAttribute('inode-keep') == 'true')) {
      scripts[i].parentNode.removeChild(scripts[i]);
    }
  }
  return div.innerHTML;
}
