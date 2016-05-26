/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */
'use strict';

var portfinder = require('portfinder');
var Agent = require('./agent/Agent');
var BananaSlugBackendManager = require('./plugins/BananaSlug/BananaSlugBackendManager');
var Bridge = require('./agent/Bridge');
var inject = require('./agent/inject');
var setupHighlighter = require('./frontend/Highlighter/setup');
var setupRNStyle = require('./plugins/ReactNativeStyle/setupBackend');
var setupRelay = require('./plugins/Relay/backend');

// TODO: check to see if we're in RN before doing this?
setInterval(function() {
  // this is needed to force refresh on react native
}, 100);


portfinder.getPort((err, port) => {
  // `port` is guaranteed to be a free port
  // in this scope.

  var ws = require('ws');
  var server = new ws.Server({ port });
  var connected = false;
  server.on('connection', (socket) => {
    if (connected) {
      console.warn('only one connection allowed at a time');
      socket.close();
      return;
    }
    connected = true;
    socket.onerror = (err) => {
      connected = false;
      console.log('Error with websocket connection', err);
    };

    socket.onclose = () => {
      connected = false;
      console.log('Connection to RN closed');
    };

    socket.onmessage = (evt) => {
      setup(socket);
    };
  });

  server.on('error', function (e) {
    console.error('Failed to start the DevTools server', e);
  });

  window.__REACT_DEVTOOLS_GLOBAL_HOOK__.prot = port;
});

function setup(socket) {
  var hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  var listeners = [];
  var wall = {
    listen: function listen(fn) {
      var listener = function listener(evt) {
	      var data = JSON.parse(evt.data);
        // console.debug('background.receive', data);
        if (data.source !== 'react-devtools-content-script' || !data.payload) {
          return;
        }
        fn(data.payload);
      };
      listeners.push(listener);
      socket.onmessage = listener;
    },
    send: function send(data) {
	    // console.debug('background.sender', data);
      socket.send(JSON.stringify({
        source: 'react-devtools-bridge',
        payload: data
      }));
    },
    disconnect: function disconnect() {
      socket.close();
    }
  };

  var isReactNative = !!hook.resolveRNStyle;

  var bridge = new Bridge(wall);
  var agent = new Agent(window, {
    rnStyle: isReactNative,
  });
  agent.addBridge(bridge);

  agent.once('connected', () => {
    inject(hook, agent);
  });

  if (isReactNative) {
    setupRNStyle(bridge, agent, hook.resolveRNStyle);
  }

  setupRelay(bridge, agent, hook);

  agent.on('shutdown', () => {
    hook.emit('shutdown');
    listeners.forEach(fn => {
      window.removeEventListener('message', fn);
    });
    listeners = [];
  });

  if (!isReactNative) {
    setupHighlighter(agent);
  }

  BananaSlugBackendManager.init(agent);
}
