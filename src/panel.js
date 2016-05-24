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
  getURL(src, done) {
    var code = 'global.__REACT_DEVTOOLS_GLOBAL_HOOK__.path';
    chrome.devtools.inspectedWindow.eval(code, (res, err) => {
      if (err) {
        console.error('Failed to inspect source', err);
      }
      done(res + '/' + src);
    });
  },
  inject(done) {
    this.getURL('build/backend.js', (source) => {
	    inject(source, () => {
	      var disconnected = false;
        var wall = {
          listen(fn) {
            setInterval(function() {
              chrome.devtools.inspectedWindow.eval('global.__REACT_DEVTOOLS_GLOBAL_HOOK__.receiver()', function(res, err) {
                if (res && res.length) {
                  fn(res[0].data.payload);
                }
              });
            }, 100);
          },
          send(data) {
	          if (disconnected) {
	            return;
	          }

	          var packet = JSON.stringify({
  	          data: {
    	          source: 'react-devtools-content-script',
    	          payload: data
  	          }
  	        });

	          var code = ';\nglobal.__REACT_DEVTOOLS_GLOBAL_HOOK__.sender.emit("message", ' + packet + ');';
            chrome.devtools.inspectedWindow.eval(code, function (res, err) {
      	      if (err) {
      	        return console.error('Failed to call function', err);
      	      }

      	      if (res === false) {
        	      console.error(code);
      	      }
      	    });
          }
        };

    	  done(wall, () => {
          // TODO disconnect
          // port.disconnect();
        });
      });
    });
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
