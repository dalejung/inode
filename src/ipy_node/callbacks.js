

handle_stuff = function(tag) {
  return function(content) {
    console.log(tag, content);
  }
}

handle_output = function (msg_type, content) {
  global.content = content
  console.log(msg_type)
}

module.exports.default_callbacks = {
    'execute_reply': handle_stuff('exec'),
    'output': handle_output,
    'clear_output': handle_stuff('clear'),
    'set_next_input': handle_stuff('setnext')
};
