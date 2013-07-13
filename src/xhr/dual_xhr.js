var xmlhttp  = require("xmlhttprequest");   
var xhr_local = require('./xhr_local.js')

var XMLHttpRequest = xhr_local.XMLHttpRequest

module.exports.XMLHttpRequest = XMLHttpRequest
