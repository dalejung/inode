#!/usr/bin/env node

var SOCKET_PORT = 1337;

var Client = require('inode').Client;

Client(SOCKET_PORT);
