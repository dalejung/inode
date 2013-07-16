/*
 * Line up jquery with q
 */
if (typeof(Q) == 'undefined') {
  var defer = function() {
    var deferred = $.Deferred();
    deferred.promise = deferred.promise();
    return deferred;
  }
  Q = {
    defer: defer, 
  }
}

