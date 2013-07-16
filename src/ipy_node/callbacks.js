handle_stuff = function(tag) {
  return function(content) {
    console.log(tag, content);
  }
}

handle_output = function (msg_type, content, metadata, context) {
  console.log(msg_type)
  console.log(Object.keys(content['data']))
  var json = content['data']['application/json'];
  if (json) {
    context.content = JSON.parse(json);
  }
}


module.exports.callback_router = function (ctx) {
  callbacks = ['execute_reply', 'output', 'clear_output', 'set_next_input'];
  var self = ctx;
  var handlers = {}
  for (var i=0; i < callbacks.length; i++) {
    var callback = callbacks[i];
    handlers[callback] = wrap_context(self, callback);
  }
  return handlers;
}

function wrap_context(ctx, name) {
  var self = ctx;
  var wrapped = function() {
    var func = self.callbacks[name];
    var context = self.context;
    [].push.call(arguments, context);
    return func.apply(self, arguments);
  }
  return wrapped;
}

module.exports.default_callbacks = function(self) {
  return {
  'execute_reply': handle_stuff('exec'),
  'output': handle_output,
  'clear_output': handle_stuff('clear'),
  'set_next_input': handle_stuff('setnext')
  }
};
