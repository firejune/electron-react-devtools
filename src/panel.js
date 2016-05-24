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

/* global chrome */

var checkForReact = require('./checkForReact');
var inject = require('./inject');

import type {Props} from './frontend/Panel';

var config: Props = {
  reload,
  checkForReact,
  alreadyFoundReact: false,
  reloadSubscribe(reloadFn) {
    chrome.devtools.network.onNavigated.addListener(reloadFn);
    return () => {
      chrome.devtools.network.onNavigated.removeListener(reloadFn);
    };
  },
  getNewSelection(bridge) {
    chrome.devtools.inspectedWindow.eval('window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$0 = $0');
    bridge.send('checkSelection');
  },
  selectElement(id, bridge) {
    bridge.send('putSelectedNode', id);
    setTimeout(() => {
      chrome.devtools.inspectedWindow.eval('inspect(window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$node)');
    }, 100);
  },
  showComponentSource(vbl) {
    // if it is an es6 class-based component, (isMounted throws), then inspect
    // the constructor. Otherwise, inspect the render function.
    var code = `Object.getOwnPropertyDescriptor(window.${vbl}.__proto__.__proto__, 'isMounted') &&
      Object.getOwnPropertyDescriptor(window.${vbl}.__proto__.__proto__, 'isMounted').value ?
        inspect(window.${vbl}.render) : inspect(window.${vbl}.constructor)`;
    chrome.devtools.inspectedWindow.eval(code, (res, err) => {
      if (err) {
        console.error('Failed to inspect component', err);
      }
    });
  },
  showAttrSource(path) {
    var attrs = '[' + path.map(m => JSON.stringify(m)).join('][') + ']';
    var code = 'inspect(window.$r' + attrs + ')';
    chrome.devtools.inspectedWindow.eval(code, (res, err) => {
      if (err) {
        console.error('Failed to inspect source', err);
      }
    });
  },
  executeFn(path) {
    var attrs = '[' + path.map(m => JSON.stringify(m)).join('][') + ']';
    var code = 'window.$r' + attrs + '()';
    chrome.devtools.inspectedWindow.eval(code, (res, err) => {
      if (err) {
        console.error('Failed to call function', err);
      }
    });
  },
  inject(done) {
    var disconnected = false;
    var ws = new WebSocket('ws://localhost:8097');
    ws.onopen = function() {
      var wall = {
        listen(fn) {
          ws.onmessage = function (evt) {
	          var data = JSON.parse(evt.data);
            fn(data.payload);
          };
        },
        send(data) {
          if (disconnected) {
            return;
          }

          var data = JSON.stringify({
	          source: 'react-devtools-content-script',
	          payload: data
          });

          ws.send(data);
        }
      };

  	  done(wall, () => {
        if (disconnected) {
          return;
        }
        ws.close();
      });
    };
    ws.onclose = function () {
      disconnected = true;
    };
  }
};

var Panel = require('./frontend/Panel');
var React = require('react');
var ReactDOM = require('react-dom');

var node = document.getElementById('container');

function reload() {
  setTimeout(() => {
    ReactDOM.unmountComponentAtNode(node);
    node.innerHTML = '';
    ReactDOM.render(<Panel {...config} />, node);
  }, 100);
}

ReactDOM.render(<Panel alreadyFoundReact={true} {...config} />, node);
