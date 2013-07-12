var jsdom = require('jsdom')
var dual_xhr  = require("./xhr/dual_xhr.js");   

function create_dom() {
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

function run_html(html, window) {
  // get attrs of empty window
  default_keys = {}
  for (var name in window) {
    default_keys[name] = window[name]
  }
  var document = window.document
  document.write(html);

  function window_vars() {
    // if varialbes are new or had changed, put into global scope
    for (var name in window) {
      if (window[name] !== default_keys[name]) {
        global[name] = window[name];
      }
    }
  }

  // weird jsdom bug where it takes a moment for the global vars to 
  // be attached to window object...
  setTimeout(window_vars, 700);
}

function stripScripts(html) {
  // Remove scripts from html output
  // When outputting a rendered html page, the jsdom
  // has already run the scripts and including them will only
  // make the script run again.
  // TODO: ability to specify which scripts to run? 
  var div = window.document.createElement('div');
  div.innerHTML = html;
  var scripts = div.getElementsByTagName('script');
  var i = scripts.length;
  while (i--) {
    scripts[i].parentNode.removeChild(scripts[i]);
  }
  return div.innerHTML;
}
