[ 'src/ipy_node.js' ]
//----------------------------------------------------------------------------
//  Copyright (C) 2008-2011  The IPython Development Team
//
//  Distributed under the terms of the BSD License.  The full license is in
//  the file COPYING, distributed as part of this software.
//----------------------------------------------------------------------------

var IPython = IPython || {};

IPython.namespace = function (ns_string) {
    var parts = ns_string.split('.'),
        parent = IPython,
        i;

    // String redundant leading global
    if (parts[0] === "IPython") {
        parts = parts.slice(1);
    }

    for (i=0; i<parts.length; i+=1) {
        // Create property if it doesn't exist
        if (typeof parent[parts[i]] === "undefined") {
            parent[parts[i]] = {};
        }
    }
    return parent;
};



//----------------------------------------------------------------------------
//  Copyright (C) 2008-2011  The IPython Development Team
//
//  Distributed under the terms of the BSD License.  The full license is in
//  the file COPYING, distributed as part of this software.
//----------------------------------------------------------------------------

//============================================================================
// Utilities
//============================================================================

IPython.namespace('IPython.utils');

IPython.utils = (function (IPython) {

    var uuid = function () {
        // http://www.ietf.org/rfc/rfc4122.txt
        var s = [];
        var hexDigits = "0123456789ABCDEF";
        for (var i = 0; i < 32; i++) {
            s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
        }
        s[12] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
        s[16] = hexDigits.substr((s[16] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01

        var uuid = s.join("");
        return uuid;
    };


    //Fix raw text to parse correctly in crazy XML
    function xmlencode(string) {
        return string.replace(/\&/g,'&'+'amp;')
            .replace(/</g,'&'+'lt;')
            .replace(/>/g,'&'+'gt;')
            .replace(/\'/g,'&'+'apos;')
            .replace(/\"/g,'&'+'quot;')
            .replace(/`/g,'&'+'#96;');
    }


    //Map from terminal commands to CSS classes
    ansi_colormap = {
        "30":"ansiblack", "31":"ansired",
        "32":"ansigreen", "33":"ansiyellow",
        "34":"ansiblue", "35":"ansipurple","36":"ansicyan",
        "37":"ansigrey", "01":"ansibold"
    };

    // Transform ANSI color escape codes into HTML <span> tags with css
    // classes listed in the above ansi_colormap object. The actual color used
    // are set in the css file.
    function fixConsole(txt) {
        txt = xmlencode(txt);
        var re = /\033\[([\dA-Fa-f;]*?)m/;
        var opened = false;
        var cmds = [];
        var opener = "";
        var closer = "";
        while (re.test(txt)) {
            var cmds = txt.match(re)[1].split(";");
            closer = opened?"</span>":"";
            opened = cmds.length > 1 || cmds[0] != 0;
            var rep = [];
            for (var i in cmds)
                if (typeof(ansi_colormap[cmds[i]]) != "undefined")
                    rep.push(ansi_colormap[cmds[i]]);
            opener = rep.length > 0?"<span class=\""+rep.join(" ")+"\">":"";
            txt = txt.replace(re, closer + opener);
        }
        if (opened) txt += "</span>";
        return txt;
    }

    // Remove chunks that should be overridden by the effect of
    // carriage return characters
    function fixCarriageReturn(txt) {
        tmp = txt;
        do {
            txt = tmp;
            tmp = txt.replace(/^.*\r(?!\n)/gm, '');
        } while (tmp.length < txt.length);
        return txt;
    }

    grow = function(element) {
        // Grow the cell by hand. This is used upon reloading from JSON, when the
        // autogrow handler is not called.
        var dom = element.get(0);
        var lines_count = 0;
        // modified split rule from
        // http://stackoverflow.com/questions/2035910/how-to-get-the-number-of-lines-in-a-textarea/2036424#2036424
        var lines = dom.value.split(/\r|\r\n|\n/);
        lines_count = lines.length;
        if (lines_count >= 1) {
            dom.rows = lines_count;
        } else {
            dom.rows = 1;
        }
    };

    // some keycodes that seem to be platform/browser independant
    var keycodes ={
                BACKSPACE:  8,
                TAB      :  9,
                ENTER    : 13,
                SHIFT    : 16,
                CTRL     : 17,
                CONTROL  : 17,
                ALT      : 18,
                ESC      : 27,
                SPACE    : 32,
                PGUP     : 33,
                PGDOWN   : 34,
                LEFT_ARROW: 37,
                LEFTARROW: 37,
                LEFT     : 37,
                UP_ARROW : 38,
                UPARROW  : 38,
                UP       : 38,
                RIGHT_ARROW:39,
                RIGHTARROW:39,
                RIGHT    : 39,
                DOWN_ARROW: 40,
                DOWNARROW: 40,
                DOWN     : 40,
    };


    points_to_pixels = function (points) {
        // A reasonably good way of converting between points and pixels.
        var test = $('<div style="display: none; width: 10000pt; padding:0; border:0;"></div>');
        $(body).append(test);
        var pixel_per_point = test.width()/10000;
        test.remove();
        return Math.floor(points*pixel_per_point);
    }


    return {
        uuid : uuid,
        fixConsole : fixConsole,
        keycodes : keycodes,
        grow : grow,
        fixCarriageReturn : fixCarriageReturn,
        points_to_pixels : points_to_pixels
    };

}(IPython));
//----------------------------------------------------------------------------
//  Copyright (C) 2008-2011  The IPython Development Team
//
//  Distributed under the terms of the BSD License.  The full license is in
//  the file COPYING, distributed as part of this software.
//----------------------------------------------------------------------------

//============================================================================
// Kernel
//============================================================================

var IPython = (function (IPython) {

    var utils = IPython.utils;

    // Initialization and connection.

    var Kernel = function (base_url, kernel_path) {
        this.kernel_id = null;
        this.shell_channel = null;
        this.iopub_channel = null;
        this.base_url = base_url;
        this.kernel_path = kernel_path;
        this.running = false;
        this.username = "username";
        this.session_id = utils.uuid();
        this._msg_callbacks = {};

        if (typeof(WebSocket) !== 'undefined') {
            this.WebSocket = WebSocket;
        } else if (typeof(MozWebSocket) !== 'undefined') {
            this.WebSocket = MozWebSocket;
        } else {
            alert('Your browser does not have WebSocket support, please try Chrome, Safari or Firefox ≥ 6. Firefox 4 and 5 are also supported by you have to enable WebSockets in about:config.');
        };
    };


    Kernel.prototype._get_msg = function (msg_type, content) {
        var msg = {
            header : {
                msg_id : utils.uuid(),
                username : this.username,
                session : this.session_id,
                msg_type : msg_type
            },
            metadata : {},
            content : content,
            parent_header : {}
        };
        return msg;
    };

    Kernel.prototype.start = function (notebook_id) {
        var that = this;
        if (!this.running) {
            var qs = $.param({notebook:notebook_id});
            var url = this.base_url + '?' + qs;
            if (this.kernel_path) {
              var url = this.base_url + '/' +  this.kernel_path + '?' + qs;
            }
            $.post(url,
                $.proxy(that._kernel_started,that),
                'json'
            );
        };
    };


    Kernel.prototype.restart = function () {
        $([IPython.events]).trigger('status_restarting.Kernel');
        var that = this;
        if (this.running) {
            this.stop_channels();
            var url = this.kernel_url + "/restart";
            $.post(url,
                $.proxy(that._kernel_started, that),
                'json'
            );
        };
    };


    Kernel.prototype._kernel_started = function (json) {
        console.log("Kernel started: ", json.kernel_id);
        this.running = true;
        this.kernel_id = json.kernel_id;
        var ws_url = json.ws_url;
        if (ws_url.match(/wss?:\/\//) == null) {
            ws_url = "ws" + this.base_url.substr(4) + ws_url;
        };
        this.ws_url = ws_url;
        this.kernel_url = this.base_url + "/" + this.kernel_id;
        if (this.kernel_path) {
          this.kernel_url = this.base_url + "/" + this.kernel_path + '/' + this.kernel_id;
        }
        this.start_channels();
        this.shell_channel.onmessage = $.proxy(this._handle_shell_reply,this);
        this.iopub_channel.onmessage = $.proxy(this._handle_iopub_reply,this);
    };


    Kernel.prototype._websocket_closed = function(ws_url, early){
        var msg;
        var parent_item = $('body');
        if (early) {
            msg = "Websocket connection to " + ws_url + " could not be established." +
            " You will NOT be able to run code." +
            " Your browser may not be compatible with the websocket version in the server," +
            " or if the url does not look right, there could be an error in the" +
            " server's configuration.";
        } else {
            IPython.notification_widget.set_message('Reconnecting Websockets', 1000);
            this.start_channels();
            return;
        }
        var dialog = $('<div/>');
        dialog.html(msg);
        parent_item.append(dialog);
        dialog.dialog({
            resizable: false,
            modal: true,
            title: "Websocket closed",
            closeText: "",
            close: function(event, ui) {$(this).dialog('destroy').remove();},
            buttons : {
                "OK": function () {
                    $(this).dialog('close');
                }
            }
        });

    };

    Kernel.prototype.start_channels = function () {
        var that = this;
        this.stop_channels();
        var ws_url = this.ws_url + this.kernel_url;
        if (this.kernel_path) {
          ws_url = this.ws_url + '/' + this.kernel_path + '/' + this.kernel_id;
        }
        console.log("Starting WS:", ws_url, 'ws', this.ws_url, 'kn', this.kernel_url);
        this.shell_channel = new this.WebSocket(ws_url + "/shell");
        this.stdin_channel = new this.WebSocket(ws_url + "/stdin");
        this.iopub_channel = new this.WebSocket(ws_url + "/iopub");
        send_cookie = function(){
            // send the session id so the Session object Python-side
            // has the same identity
            this.send(that.session_id + ':' + document.cookie);
        };
        var already_called_onclose = false; // only alert once
        ws_closed_early = function(evt){
            if (already_called_onclose){
                return;
            }
            already_called_onclose = true;
            if ( ! evt.wasClean ){
                that._websocket_closed(ws_url, true);
            }
        };
        ws_closed_late = function(evt){
            if (already_called_onclose){
                return;
            }
            already_called_onclose = true;
            if ( ! evt.wasClean ){
                that._websocket_closed(ws_url, false);
            }
        };
        this.shell_channel.onopen = send_cookie;
        this.shell_channel.onclose = ws_closed_early;
        this.iopub_channel.onopen = send_cookie;
        this.iopub_channel.onclose = ws_closed_early;
        // switch from early-close to late-close message after 1s
        setTimeout(function(){
            that.shell_channel.onclose = ws_closed_late;
            that.iopub_channel.onclose = ws_closed_late;
        }, 1000);
    };


    Kernel.prototype.stop_channels = function () {
        if (this.shell_channel !== null) {
            this.shell_channel.onclose = function (evt) {};
            this.shell_channel.close();
            this.shell_channel = null;
        };
        if (this.iopub_channel !== null) {
            this.iopub_channel.onclose = function (evt) {};
            this.iopub_channel.close();
            this.iopub_channel = null;
        };
    };

    // Main public methods.

    Kernel.prototype.object_info_request = function (objname, callbacks) {
        // When calling this method pass a callbacks structure of the form:
        //
        // callbacks = {
        //  'object_info_reply': object_into_reply_callback
        // }
        //
        // The object_info_reply_callback will be passed the content object of the
        // object_into_reply message documented here:
        //
        // http://ipython.org/ipython-doc/dev/development/messaging.html#object-information
        if(typeof(objname)!=null && objname!=null)
        {
            var content = {
                oname : objname.toString(),
            };
            var msg = this._get_msg("object_info_request", content);
            this.shell_channel.send(JSON.stringify(msg));
            this.set_callbacks_for_msg(msg.header.msg_id, callbacks);
            return msg.header.msg_id;
        }
        return;
    }

    Kernel.prototype.execute = function (code, callbacks, options) {
        // The options object should contain the options for the execute call. Its default
        // values are:
        //
        // options = {
        //   silent : true,
        //   user_variables : [],
        //   user_expressions : {},
        //   allow_stdin : false
        // }
        //
        // When calling this method pass a callbacks structure of the form:
        //
        // callbacks = {
        //  'execute_reply': execute_reply_callback,
        //  'output': output_callback,
        //  'clear_output': clear_output_callback,
        //  'set_next_input': set_next_input_callback
        // }
        //
        // The execute_reply_callback will be passed the content object of the execute_reply
        // message documented here:
        //
        // http://ipython.org/ipython-doc/dev/development/messaging.html#execute
        //
        // The output_callback will be passed msg_type ('stream','display_data','pyout','pyerr')
        // of the output and the content object of the PUB/SUB channel that contains the
        // output:
        //
        // http://ipython.org/ipython-doc/dev/development/messaging.html#messages-on-the-pub-sub-socket
        //
        // The clear_output_callback will be passed a content object that contains
        // stdout, stderr and other fields that are booleans.
        //
        // The set_next_input_callback will bepassed the text that should become the next
        // input cell.

        var content = {
            code : code,
            silent : true,
            user_variables : [],
            user_expressions : {},
            allow_stdin : false
        };
		$.extend(true, content, options)
        var msg = this._get_msg("execute_request", content);
        this.shell_channel.send(JSON.stringify(msg));
        this.set_callbacks_for_msg(msg.header.msg_id, callbacks);
        return msg.header.msg_id;
    };


    Kernel.prototype.complete = function (line, cursor_pos, callbacks) {
        // When calling this method pass a callbacks structure of the form:
        //
        // callbacks = {
        //  'complete_reply': complete_reply_callback
        // }
        //
        // The complete_reply_callback will be passed the content object of the
        // complete_reply message documented here:
        //
        // http://ipython.org/ipython-doc/dev/development/messaging.html#complete
        callbacks = callbacks || {};
        var content = {
            text : '',
            line : line,
            cursor_pos : cursor_pos
        };
        var msg = this._get_msg("complete_request", content);
        this.shell_channel.send(JSON.stringify(msg));
        this.set_callbacks_for_msg(msg.header.msg_id, callbacks);
        return msg.header.msg_id;
    };


    Kernel.prototype.interrupt = function () {
        if (this.running) {
            $([IPython.events]).trigger('status_interrupting.Kernel');
            $.post(this.kernel_url + "/interrupt");
        };
    };


    Kernel.prototype.kill = function () {
        if (this.running) {
            this.running = false;
            var settings = {
                cache : false,
                type : "DELETE"
            };
            $.ajax(this.kernel_url, settings);
        };
    };


    // Reply handlers.

    Kernel.prototype.get_callbacks_for_msg = function (msg_id) {
        var callbacks = this._msg_callbacks[msg_id];
        return callbacks;
    };


    Kernel.prototype.set_callbacks_for_msg = function (msg_id, callbacks) {
        this._msg_callbacks[msg_id] = callbacks || {};
    }


    Kernel.prototype._handle_shell_reply = function (e) {
        reply = $.parseJSON(e.data);
        var header = reply.header;
        var content = reply.content;
        var metadata = reply.metadata;
        var msg_type = header.msg_type;
        var callbacks = this.get_callbacks_for_msg(reply.parent_header.msg_id);
        if (callbacks !== undefined) {
            var cb = callbacks[msg_type];
            if (cb !== undefined) {
                cb(content, metadata);
            }
        };

        if (content.payload !== undefined) {
            var payload = content.payload || [];
            this._handle_payload(callbacks, payload);
        }
    };


    Kernel.prototype._handle_payload = function (callbacks, payload) {
        var l = payload.length;
        // Payloads are handled by triggering events because we don't want the Kernel
        // to depend on the Notebook or Pager classes.
        for (var i=0; i<l; i++) {
            if (payload[i].source === 'IPython.zmq.page.page') {
                var data = {'text':payload[i].text}
                $([IPython.events]).trigger('open_with_text.Pager', data);
            } else if (payload[i].source === 'IPython.zmq.zmqshell.ZMQInteractiveShell.set_next_input') {
                if (callbacks.set_next_input !== undefined) {
                    callbacks.set_next_input(payload[i].text)
                }
            }
        };
    };


    Kernel.prototype._handle_iopub_reply = function (e) {
        reply = $.parseJSON(e.data);
        var content = reply.content;
        var msg_type = reply.header.msg_type;
        var metadata = reply.metadata;
        var callbacks = this.get_callbacks_for_msg(reply.parent_header.msg_id);
        if (msg_type !== 'status' && callbacks === undefined) {
            // Message not from one of this notebook's cells and there are no
            // callbacks to handle it.
            return;
        }
        var output_types = ['stream','display_data','pyout','pyerr'];
        if (output_types.indexOf(msg_type) >= 0) {
            var cb = callbacks['output'];
            if (cb !== undefined) {
                cb(msg_type, content, metadata);
            }
        } else if (msg_type === 'status') {
            if (content.execution_state === 'busy') {
                $([IPython.events]).trigger('status_busy.Kernel');
            } else if (content.execution_state === 'idle') {
                $([IPython.events]).trigger('status_idle.Kernel');
            } else if (content.execution_state === 'dead') {
                this.stop_channels();
                $([IPython.events]).trigger('status_dead.Kernel');
            };
        } else if (msg_type === 'clear_output') {
            var cb = callbacks['clear_output'];
            if (cb !== undefined) {
                cb(content, metadata);
            }
        };
    };


    IPython.Kernel = Kernel;

    return IPython;

}(IPython));


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

handle_stuff = function(tag) {
  return function(content) {
    console.log(tag, content);
  }
}

handle_output = function (msg_type, content, metadata, context) {
  //console.log(msg_type)
  //console.log(Object.keys(content['data']))
  var json = content['data']['application/json'];
  if (json) {
    context.content = JSON.parse(json);
  }
}

callback_router = function (ctx) {
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

default_callbacks = function(self) {
  return {
  'execute_reply': handle_stuff('exec'),
  'output': handle_output,
  'clear_output': handle_stuff('clear'),
  'set_next_input': handle_stuff('setnext')
  }
};

deferred_callback_router = function (ctx, deferred) {
  var self = ctx;
  var handlers = {}
  handlers['output'] = defer_wrap(defer_output, ctx, deferred);
  return handlers;
}

defer_output = function (msg_type, content, metadata, context, deferred) {
  var data = {}
  data['msg_type'] = msg_type
  data['content'] = content
  data['metadata'] = metadata
  data['context'] = context
  deferred.resolve(data);
}

defer_wrap = function (func, ctx, _deferred) {
  var self = ctx;
  var deferred = _deferred;
  return function() {
    var context = self.context;
    [].push.call(arguments, context);
    [].push.call(arguments, deferred);
    return func.apply(self, arguments);
  }
}
var IPythonBridge = function(base_url, notebook_id, config) {
  var self = this;
  if (config) {
    var context = config.context
  }

  self.context = context;

  self.base_url = base_url;
  self.notebook_id = notebook_id;
  self.kernel = new IPython.Kernel(base_url, 'kernels');
  self.kernel.start(notebook_id);
  self.kernel_ready = false;
  self.check_kernel();
  self.command_buffer = [];
}

IPythonBridge.prototype.check_kernel = function() {
  var self = this;
  if (!self.kernel.shell_channel) {
    setTimeout(function() { self.check_kernel(); }, 100);
  } 
  else {
    self.kernel_ready = true;
  }
}

IPythonBridge.prototype._execute = function(code, deferred) {
  var self = this;
  return this.kernel.execute(code, deferred_callback_router(self, deferred), {'silent':false});
}

IPythonBridge.prototype.execute = function(code, callbacks) {
  // always push to buffer and htne try to execute. 
  // took out immediate execution so everything goes through the same path
  var deferred = Q.defer(); 
  this.command_buffer.push([code, deferred]);      
  this.execute_buffer();
  return deferred.promise;
}

IPythonBridge.prototype.execute_buffer = function() {
  var self = this;
  if (!(self.kernel_ready)) {
    setTimeout(function() { self.execute_buffer(); }, 300);
    return;
  }
  if (self.command_buffer.length > 0) {
    var command = self.command_buffer.pop();
    var code = command[0];
    var deferred = command[1];
    self._execute(code, deferred);
  }
}

IPythonBridge.prototype.__repr__ = function() {
  return 'IPython Bridge \nbase_url='+this.base_url+"\nnotebook_id="+this.notebook_id;
}
