var jsdom = require('jsdom')
var dual_xhr  = require("./xhr/dual_xhr.js");   
var Q = require('q');

module.exports.create_dom = function (url) {
  /*
   * Setup a bare window ready for dom manipulations
   */
  var document = jsdom.jsdom("<html><head></head><body></body></html>", null, {url:url});
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

  window.console = global.console;
  window.alert = global.console.log;
  window.WebSocket = require('ws');
  return window
}

module.exports.window_loaded = function(window, default_keys) {
  var deferred = Q.defer();
  module.exports.window_vars(window, default_keys, deferred);
  return deferred.promise;
}

module.exports.window_vars = function (window, default_keys, deferred) {
  // checks for the inode_sentinel value added to each html run
  if (!('_inode_sentinel' in window)) {
    setTimeout(module.exports.window_vars, 100, window, default_keys, deferred);
  } else {
    var inode_deferred = window._inode_load;
    if (inode_deferred) {
      if(inode_deferred.promise) {
        inode_deferred = inode_deferred.promise;
      }
      inode_deferred.timeout(5000, 'Page load timeout')
        .then(function() {
          deferred.resolve();})
        .fail(function() {
          console.log('html_run error. Still hoisting availabel variabels');
          deferred.resolve();});
    } else {
      deferred.resolve();
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
