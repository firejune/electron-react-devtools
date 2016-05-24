/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	var Agent = __webpack_require__(21);
	var BananaSlugBackendManager = __webpack_require__(35);
	var Bridge = __webpack_require__(22);
	var inject = __webpack_require__(25);
	var setupHighlighter = __webpack_require__(34);
	var setupRNStyle = __webpack_require__(38);
	var setupRelay = __webpack_require__(39);

	// TODO: check to see if we're in RN before doing this?
	setInterval(function () {
	  // this is needed to force refresh on react native
	}, 100);

	var ws = __webpack_require__(66);
	var server = new ws.Server({ port: 8097 });
	var connected = false;
	server.on('connection', function (socket) {
	  if (connected) {
	    socket.close();
	    return;
	  }
	  connected = true;
	  socket.onerror = function (err) {
	    connected = false;
	  };

	  socket.onclose = function () {
	    connected = false;
	  };

	  socket.onmessage = function (evt) {
	    setup(socket);
	  };
	});

	server.on('error', function (e) {});

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
	    rnStyle: isReactNative
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

/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = require("util");

/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = require("events");

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	
	var zlib = __webpack_require__(78);

	var AVAILABLE_WINDOW_BITS = [8, 9, 10, 11, 12, 13, 14, 15];
	var DEFAULT_WINDOW_BITS = 15;
	var DEFAULT_MEM_LEVEL = 8;

	PerMessageDeflate.extensionName = 'permessage-deflate';

	/**
	 * Per-message Compression Extensions implementation
	 */

	function PerMessageDeflate(options, isServer,maxPayload) {
	  if (this instanceof PerMessageDeflate === false) {
	    throw new TypeError("Classes can't be function-called");
	  }

	  this._options = options || {};
	  this._isServer = !!isServer;
	  this._inflate = null;
	  this._deflate = null;
	  this.params = null;
	  this._maxPayload = maxPayload || 0;
	}

	/**
	 * Create extension parameters offer
	 *
	 * @api public
	 */

	PerMessageDeflate.prototype.offer = function() {
	  var params = {};
	  if (this._options.serverNoContextTakeover) {
	    params.server_no_context_takeover = true;
	  }
	  if (this._options.clientNoContextTakeover) {
	    params.client_no_context_takeover = true;
	  }
	  if (this._options.serverMaxWindowBits) {
	    params.server_max_window_bits = this._options.serverMaxWindowBits;
	  }
	  if (this._options.clientMaxWindowBits) {
	    params.client_max_window_bits = this._options.clientMaxWindowBits;
	  } else if (this._options.clientMaxWindowBits == null) {
	    params.client_max_window_bits = true;
	  }
	  return params;
	};

	/**
	 * Accept extension offer
	 *
	 * @api public
	 */

	PerMessageDeflate.prototype.accept = function(paramsList) {
	  paramsList = this.normalizeParams(paramsList);

	  var params;
	  if (this._isServer) {
	    params = this.acceptAsServer(paramsList);
	  } else {
	    params = this.acceptAsClient(paramsList);
	  }

	  this.params = params;
	  return params;
	};

	/**
	 * Releases all resources used by the extension
	 *
	 * @api public
	 */

	PerMessageDeflate.prototype.cleanup = function() {
	  if (this._inflate) {
	    if (this._inflate.writeInProgress) {
	      this._inflate.pendingClose = true;
	    } else {
	      if (this._inflate.close) this._inflate.close();
	      this._inflate = null;
	    }
	  }
	  if (this._deflate) {
	    if (this._deflate.writeInProgress) {
	      this._deflate.pendingClose = true;
	    } else {
	      if (this._deflate.close) this._deflate.close();
	      this._deflate = null;
	    }
	  }
	};

	/**
	 * Accept extension offer from client
	 *
	 * @api private
	 */

	PerMessageDeflate.prototype.acceptAsServer = function(paramsList) {
	  var accepted = {};
	  var result = paramsList.some(function(params) {
	    accepted = {};
	    if (this._options.serverNoContextTakeover === false && params.server_no_context_takeover) {
	      return;
	    }
	    if (this._options.serverMaxWindowBits === false && params.server_max_window_bits) {
	      return;
	    }
	    if (typeof this._options.serverMaxWindowBits === 'number' &&
	        typeof params.server_max_window_bits === 'number' &&
	        this._options.serverMaxWindowBits > params.server_max_window_bits) {
	      return;
	    }
	    if (typeof this._options.clientMaxWindowBits === 'number' && !params.client_max_window_bits) {
	      return;
	    }

	    if (this._options.serverNoContextTakeover || params.server_no_context_takeover) {
	      accepted.server_no_context_takeover = true;
	    }
	    if (this._options.clientNoContextTakeover) {
	      accepted.client_no_context_takeover = true;
	    }
	    if (this._options.clientNoContextTakeover !== false && params.client_no_context_takeover) {
	      accepted.client_no_context_takeover = true;
	    }
	    if (typeof this._options.serverMaxWindowBits === 'number') {
	      accepted.server_max_window_bits = this._options.serverMaxWindowBits;
	    } else if (typeof params.server_max_window_bits === 'number') {
	      accepted.server_max_window_bits = params.server_max_window_bits;
	    }
	    if (typeof this._options.clientMaxWindowBits === 'number') {
	      accepted.client_max_window_bits = this._options.clientMaxWindowBits;
	    } else if (this._options.clientMaxWindowBits !== false && typeof params.client_max_window_bits === 'number') {
	      accepted.client_max_window_bits = params.client_max_window_bits;
	    }
	    return true;
	  }, this);

	  if (!result) {
	    throw new Error('Doesn\'t support the offered configuration');
	  }

	  return accepted;
	};

	/**
	 * Accept extension response from server
	 *
	 * @api privaye
	 */

	PerMessageDeflate.prototype.acceptAsClient = function(paramsList) {
	  var params = paramsList[0];
	  if (this._options.clientNoContextTakeover != null) {
	    if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
	      throw new Error('Invalid value for "client_no_context_takeover"');
	    }
	  }
	  if (this._options.clientMaxWindowBits != null) {
	    if (this._options.clientMaxWindowBits === false && params.client_max_window_bits) {
	      throw new Error('Invalid value for "client_max_window_bits"');
	    }
	    if (typeof this._options.clientMaxWindowBits === 'number' &&
	        (!params.client_max_window_bits || params.client_max_window_bits > this._options.clientMaxWindowBits)) {
	      throw new Error('Invalid value for "client_max_window_bits"');
	    }
	  }
	  return params;
	};

	/**
	 * Normalize extensions parameters
	 *
	 * @api private
	 */

	PerMessageDeflate.prototype.normalizeParams = function(paramsList) {
	  return paramsList.map(function(params) {
	    Object.keys(params).forEach(function(key) {
	      var value = params[key];
	      if (value.length > 1) {
	        throw new Error('Multiple extension parameters for ' + key);
	      }

	      value = value[0];

	      switch (key) {
	      case 'server_no_context_takeover':
	      case 'client_no_context_takeover':
	        if (value !== true) {
	          throw new Error('invalid extension parameter value for ' + key + ' (' + value + ')');
	        }
	        params[key] = true;
	        break;
	      case 'server_max_window_bits':
	      case 'client_max_window_bits':
	        if (typeof value === 'string') {
	          value = parseInt(value, 10);
	          if (!~AVAILABLE_WINDOW_BITS.indexOf(value)) {
	            throw new Error('invalid extension parameter value for ' + key + ' (' + value + ')');
	          }
	        }
	        if (!this._isServer && value === true) {
	          throw new Error('Missing extension parameter value for ' + key);
	        }
	        params[key] = value;
	        break;
	      default:
	        throw new Error('Not defined extension parameter (' + key + ')');
	      }
	    }, this);
	    return params;
	  }, this);
	};

	/**
	 * Decompress message
	 *
	 * @api public
	 */

	PerMessageDeflate.prototype.decompress = function (data, fin, callback) {
	  var endpoint = this._isServer ? 'client' : 'server';

	  if (!this._inflate) {
	    var maxWindowBits = this.params[endpoint + '_max_window_bits'];
	    this._inflate = zlib.createInflateRaw({
	      windowBits: 'number' === typeof maxWindowBits ? maxWindowBits : DEFAULT_WINDOW_BITS
	    });
	  }
	  this._inflate.writeInProgress = true;

	  var self = this;
	  var buffers = [];
	  var cumulativeBufferLength=0;

	  this._inflate.on('error', onError).on('data', onData);
	  this._inflate.write(data);
	  if (fin) {
	    this._inflate.write(new Buffer([0x00, 0x00, 0xff, 0xff]));
	  }
	  this._inflate.flush(function() {
	    cleanup();
	    callback(null, Buffer.concat(buffers));
	  });

	  function onError(err) {
	    cleanup();
	    callback(err);
	  }

	  function onData(data) {
	      if(self._maxPayload!==undefined && self._maxPayload!==null && self._maxPayload>0){
	          cumulativeBufferLength+=data.length;
	          if(cumulativeBufferLength>self._maxPayload){
	            buffers=[];
	            cleanup();
	            var err={type:1009};
	            callback(err);
	            return;
	          }
	      }
	      buffers.push(data);
	  }

	  function cleanup() {
	    if (!self._inflate) return;
	    self._inflate.removeListener('error', onError);
	    self._inflate.removeListener('data', onData);
	    self._inflate.writeInProgress = false;
	    if ((fin && self.params[endpoint + '_no_context_takeover']) || self._inflate.pendingClose) {
	      if (self._inflate.close) self._inflate.close();
	      self._inflate = null;
	    }
	  }
	};

	/**
	 * Compress message
	 *
	 * @api public
	 */

	PerMessageDeflate.prototype.compress = function (data, fin, callback) {
	  var endpoint = this._isServer ? 'server' : 'client';

	  if (!this._deflate) {
	    var maxWindowBits = this.params[endpoint + '_max_window_bits'];
	    this._deflate = zlib.createDeflateRaw({
	      flush: zlib.Z_SYNC_FLUSH,
	      windowBits: 'number' === typeof maxWindowBits ? maxWindowBits : DEFAULT_WINDOW_BITS,
	      memLevel: this._options.memLevel || DEFAULT_MEM_LEVEL
	    });
	  }
	  this._deflate.writeInProgress = true;

	  var self = this;
	  var buffers = [];

	  this._deflate.on('error', onError).on('data', onData);
	  this._deflate.write(data);
	  this._deflate.flush(function() {
	    cleanup();
	    var data = Buffer.concat(buffers);
	    if (fin) {
	      data = data.slice(0, data.length - 4);
	    }
	    callback(null, data);
	  });

	  function onError(err) {
	    cleanup();
	    callback(err);
	  }

	  function onData(data) {
	    buffers.push(data);
	  }

	  function cleanup() {
	    if (!self._deflate) return;
	    self._deflate.removeListener('error', onError);
	    self._deflate.removeListener('data', onData);
	    self._deflate.writeInProgress = false;
	    if ((fin && self.params[endpoint + '_no_context_takeover']) || self._deflate.pendingClose) {
	      if (self._deflate.close) self._deflate.close();
	      self._deflate = null;
	    }
	  }
	};

	module.exports = PerMessageDeflate;


/***/ },
/* 4 */
/***/ function(module, exports) {

	'use strict';
	/* eslint-disable no-unused-vars */
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	var propIsEnumerable = Object.prototype.propertyIsEnumerable;

	function toObject(val) {
		if (val === null || val === undefined) {
			throw new TypeError('Object.assign cannot be called with null or undefined');
		}

		return Object(val);
	}

	function shouldUseNative() {
		try {
			if (!Object.assign) {
				return false;
			}

			// Detect buggy property enumeration order in older V8 versions.

			// https://bugs.chromium.org/p/v8/issues/detail?id=4118
			var test1 = new String('abc');  // eslint-disable-line
			test1[5] = 'de';
			if (Object.getOwnPropertyNames(test1)[0] === '5') {
				return false;
			}

			// https://bugs.chromium.org/p/v8/issues/detail?id=3056
			var test2 = {};
			for (var i = 0; i < 10; i++) {
				test2['_' + String.fromCharCode(i)] = i;
			}
			var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
				return test2[n];
			});
			if (order2.join('') !== '0123456789') {
				return false;
			}

			// https://bugs.chromium.org/p/v8/issues/detail?id=3056
			var test3 = {};
			'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
				test3[letter] = letter;
			});
			if (Object.keys(Object.assign({}, test3)).join('') !==
					'abcdefghijklmnopqrst') {
				return false;
			}

			return true;
		} catch (e) {
			// We don't expect any of the above to throw, but better to be safe.
			return false;
		}
	}

	module.exports = shouldUseNative() ? Object.assign : function (target, source) {
		var from;
		var to = toObject(target);
		var symbols;

		for (var s = 1; s < arguments.length; s++) {
			from = Object(arguments[s]);

			for (var key in from) {
				if (hasOwnProperty.call(from, key)) {
					to[key] = from[key];
				}
			}

			if (Object.getOwnPropertySymbols) {
				symbols = Object.getOwnPropertySymbols(from);
				for (var i = 0; i < symbols.length; i++) {
					if (propIsEnumerable.call(from, symbols[i])) {
						to[symbols[i]] = from[symbols[i]];
					}
				}
			}
		}

		return to;
	};


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	var Symbol = __webpack_require__(55);

	module.exports = {
	  name: Symbol('name'),
	  type: Symbol('type'),
	  inspected: Symbol('inspected'),
	  meta: Symbol('meta'),
	  proto: Symbol('proto')
	};

/***/ },
/* 6 */
/***/ function(module, exports) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function copyWithSetImpl(obj, path, idx, value) {
	  if (idx >= path.length) {
	    return value;
	  }
	  var key = path[idx];
	  var updated = Array.isArray(obj) ? obj.slice() : _extends({}, obj);
	  // $FlowFixMe number or string is fine here
	  updated[key] = copyWithSetImpl(obj[key], path, idx + 1, value);
	  return updated;
	}

	function copyWithSet(obj, path, value) {
	  return copyWithSetImpl(obj, path, 0, value);
	}

	module.exports = copyWithSet;

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	const requestAnimationFrame = __webpack_require__(9);
	const immutable = __webpack_require__(10);

	// How long the measurement can be cached in ms.
	const DURATION = 800;

	const { Record, Map, Set } = immutable;

	const MeasurementRecord = Record({
	  bottom: 0,
	  expiration: 0,
	  height: 0,
	  id: '',
	  left: 0,
	  right: 0,
	  scrollX: 0,
	  scrollY: 0,
	  top: 0,
	  width: 0
	});

	var _id = 100;

	class BananaSlugAbstractNodeMeasurer {

	  constructor() {
	    // pending nodes to measure.
	    this._nodes = new Map();

	    // ids of pending nodes.
	    this._ids = new Map();

	    // cached measurements.
	    this._measurements = new Map();

	    // callbacks for pending nodes.
	    this._callbacks = new Map();

	    this._isRequesting = false;

	    // non-auto-binds.
	    this._measureNodes = this._measureNodes.bind(this);
	  }

	  request(node, callback) {
	    var requestID = this._nodes.has(node) ? this._nodes.get(node) : String(_id++);

	    this._nodes = this._nodes.set(node, requestID);
	    this._ids = this._ids.set(requestID, node);

	    var callbacks = this._callbacks.has(node) ? this._callbacks.get(node) : new Set();

	    callbacks = callbacks.add(callback);
	    this._callbacks = this._callbacks.set(node, callbacks);

	    if (this._isRequesting) {
	      return requestID;
	    }

	    this._isRequesting = true;
	    requestAnimationFrame(this._measureNodes);
	    return requestID;
	  }

	  cancel(requestID) {
	    if (this._ids.has(requestID)) {
	      var node = this._ids.get(requestID);
	      this._ids = this._ids.delete(requestID);
	      this._nodes = this._nodes.delete(node);
	      this._callbacks = this._callbacks.delete(node);
	    }
	  }

	  measureImpl(node) {
	    // sub-class must overwrite this.
	    return new MeasurementRecord();
	  }

	  _measureNodes() {
	    var now = Date.now();

	    this._measurements = this._measurements.withMutations(_measurements => {
	      for (const node of this._nodes.keys()) {
	        const measurement = this._measureNode(now, node);
	        // cache measurement.
	        _measurements.set(node, measurement);
	      }
	    });

	    // execute callbacks.
	    for (const node of this._nodes.keys()) {
	      const measurement = this._measurements.get(node);
	      this._callbacks.get(node).forEach(callback => callback(measurement));
	    }

	    // clear stale measurement.
	    this._measurements = this._measurements.withMutations(_measurements => {
	      for (const [node, measurement] of _measurements.entries()) {
	        if (measurement.expiration < now) {
	          _measurements.delete(node);
	        }
	      }
	    });

	    this._ids = this._ids.clear();
	    this._nodes = this._nodes.clear();
	    this._callbacks = this._callbacks.clear();
	    this._isRequesting = false;
	  }

	  _measureNode(timestamp, node) {
	    var measurement;
	    var data;

	    if (this._measurements.has(node)) {
	      measurement = this._measurements.get(node);
	      if (measurement.expiration < timestamp) {
	        // measurement expires. measure again.
	        data = this.measureImpl(node);
	        measurement = measurement.merge(_extends({}, data, {
	          expiration: timestamp + DURATION
	        }));
	      }
	    } else {
	      data = this.measureImpl(node);
	      measurement = new MeasurementRecord(_extends({}, data, {
	        expiration: timestamp + DURATION,
	        id: 'm_' + String(_id++)
	      }));
	    }
	    return measurement;
	  }
	}

	module.exports = BananaSlugAbstractNodeMeasurer;

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	const immutable = __webpack_require__(10);
	const requestAnimationFrame = __webpack_require__(9);

	// How long the measurement should be presented for.
	const DURATION = 250;

	const { Record, Map } = immutable;

	const MetaData = Record({
	  expiration: 0,
	  hit: 0
	});

	class BananaSlugAbstractNodePresenter {

	  constructor() {
	    this._pool = new Map();
	    this._drawing = false;
	    this._clearTimer = 0;
	    this._enabled = false;

	    this._draw = this._draw.bind(this);
	    this._redraw = this._redraw.bind(this);
	  }

	  present(measurement) {
	    if (!this._enabled) {
	      return;
	    }
	    var data;
	    if (this._pool.has(measurement)) {
	      data = this._pool.get(measurement);
	    } else {
	      data = new MetaData();
	    }

	    data = data.merge({
	      expiration: Date.now() + DURATION,
	      hit: data.hit + 1
	    });

	    this._pool = this._pool.set(measurement, data);

	    if (this._drawing) {
	      return;
	    }

	    this._drawing = true;
	    requestAnimationFrame(this._draw);
	  }

	  setEnabled(enabled) {
	    // console.log('setEnabled', enabled);
	    if (this._enabled === enabled) {
	      return;
	    }

	    this._enabled = enabled;

	    if (enabled) {
	      return;
	    }

	    if (this._clearTimer) {
	      clearTimeout(this._clearTimer);
	      this._clearTimer = 0;
	    }

	    this._pool = this._pool.clear();
	    this._drawing = false;
	    this.clearImpl();
	  }

	  drawImpl(measurements) {
	    // sub-class should implement this.
	  }

	  clearImpl() {
	    // sub-class should implement this.
	  }

	  _redraw() {
	    this._clearTimer = 0;
	    if (!this._drawing && this._pool.size > 0) {
	      this._drawing = true;
	      this._draw();
	    }
	  }

	  _draw() {
	    if (!this._enabled) {
	      this._drawing = false;
	      return;
	    }

	    var now = Date.now();
	    var minExpiration = Number.MAX_VALUE;

	    this._pool = this._pool.withMutations(_pool => {
	      for (const [measurement, data] of _pool.entries()) {
	        if (data.expiration < now) {
	          // already passed the expiration time.
	          _pool.delete(measurement);
	        } else {
	          minExpiration = Math.min(data.expiration, minExpiration);
	        }
	      }
	    });

	    this.drawImpl(this._pool);

	    if (this._pool.size > 0) {
	      clearTimeout(this._clearTimer);
	      this._clearTimer = setTimeout(this._redraw, minExpiration - now);
	    }

	    this._drawing = false;
	  }
	}

	module.exports = BananaSlugAbstractNodePresenter;

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * Copyright 2014-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 */

	var emptyFunction = __webpack_require__(61);
	var nativeRequestAnimationFrame = __webpack_require__(62);

	var lastTime = 0;

	var requestAnimationFrame = nativeRequestAnimationFrame || function (callback) {
	  var currTime = Date.now();
	  var timeDelay = Math.max(0, 16 - (currTime - lastTime));
	  lastTime = currTime + timeDelay;
	  return global.setTimeout(function () {
	    callback(Date.now());
	  }, timeDelay);
	};

	// Works around a rare bug in Safari 6 where the first request is never invoked.
	requestAnimationFrame(emptyFunction);

	module.exports = requestAnimationFrame;

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 *  Copyright (c) 2014-2015, Facebook, Inc.
	 *  All rights reserved.
	 *
	 *  This source code is licensed under the BSD-style license found in the
	 *  LICENSE file in the root directory of this source tree. An additional grant
	 *  of patent rights can be found in the PATENTS file in the same directory.
	 */

	(function (global, factory) {
	   true ? module.exports = factory() :
	  typeof define === 'function' && define.amd ? define(factory) :
	  (global.Immutable = factory());
	}(this, function () { 'use strict';var SLICE$0 = Array.prototype.slice;

	  function createClass(ctor, superClass) {
	    if (superClass) {
	      ctor.prototype = Object.create(superClass.prototype);
	    }
	    ctor.prototype.constructor = ctor;
	  }

	  function Iterable(value) {
	      return isIterable(value) ? value : Seq(value);
	    }


	  createClass(KeyedIterable, Iterable);
	    function KeyedIterable(value) {
	      return isKeyed(value) ? value : KeyedSeq(value);
	    }


	  createClass(IndexedIterable, Iterable);
	    function IndexedIterable(value) {
	      return isIndexed(value) ? value : IndexedSeq(value);
	    }


	  createClass(SetIterable, Iterable);
	    function SetIterable(value) {
	      return isIterable(value) && !isAssociative(value) ? value : SetSeq(value);
	    }



	  function isIterable(maybeIterable) {
	    return !!(maybeIterable && maybeIterable[IS_ITERABLE_SENTINEL]);
	  }

	  function isKeyed(maybeKeyed) {
	    return !!(maybeKeyed && maybeKeyed[IS_KEYED_SENTINEL]);
	  }

	  function isIndexed(maybeIndexed) {
	    return !!(maybeIndexed && maybeIndexed[IS_INDEXED_SENTINEL]);
	  }

	  function isAssociative(maybeAssociative) {
	    return isKeyed(maybeAssociative) || isIndexed(maybeAssociative);
	  }

	  function isOrdered(maybeOrdered) {
	    return !!(maybeOrdered && maybeOrdered[IS_ORDERED_SENTINEL]);
	  }

	  Iterable.isIterable = isIterable;
	  Iterable.isKeyed = isKeyed;
	  Iterable.isIndexed = isIndexed;
	  Iterable.isAssociative = isAssociative;
	  Iterable.isOrdered = isOrdered;

	  Iterable.Keyed = KeyedIterable;
	  Iterable.Indexed = IndexedIterable;
	  Iterable.Set = SetIterable;


	  var IS_ITERABLE_SENTINEL = '@@__IMMUTABLE_ITERABLE__@@';
	  var IS_KEYED_SENTINEL = '@@__IMMUTABLE_KEYED__@@';
	  var IS_INDEXED_SENTINEL = '@@__IMMUTABLE_INDEXED__@@';
	  var IS_ORDERED_SENTINEL = '@@__IMMUTABLE_ORDERED__@@';

	  // Used for setting prototype methods that IE8 chokes on.
	  var DELETE = 'delete';

	  // Constants describing the size of trie nodes.
	  var SHIFT = 5; // Resulted in best performance after ______?
	  var SIZE = 1 << SHIFT;
	  var MASK = SIZE - 1;

	  // A consistent shared value representing "not set" which equals nothing other
	  // than itself, and nothing that could be provided externally.
	  var NOT_SET = {};

	  // Boolean references, Rough equivalent of `bool &`.
	  var CHANGE_LENGTH = { value: false };
	  var DID_ALTER = { value: false };

	  function MakeRef(ref) {
	    ref.value = false;
	    return ref;
	  }

	  function SetRef(ref) {
	    ref && (ref.value = true);
	  }

	  // A function which returns a value representing an "owner" for transient writes
	  // to tries. The return value will only ever equal itself, and will not equal
	  // the return of any subsequent call of this function.
	  function OwnerID() {}

	  // http://jsperf.com/copy-array-inline
	  function arrCopy(arr, offset) {
	    offset = offset || 0;
	    var len = Math.max(0, arr.length - offset);
	    var newArr = new Array(len);
	    for (var ii = 0; ii < len; ii++) {
	      newArr[ii] = arr[ii + offset];
	    }
	    return newArr;
	  }

	  function ensureSize(iter) {
	    if (iter.size === undefined) {
	      iter.size = iter.__iterate(returnTrue);
	    }
	    return iter.size;
	  }

	  function wrapIndex(iter, index) {
	    // This implements "is array index" which the ECMAString spec defines as:
	    //
	    //     A String property name P is an array index if and only if
	    //     ToString(ToUint32(P)) is equal to P and ToUint32(P) is not equal
	    //     to 2^32−1.
	    //
	    // http://www.ecma-international.org/ecma-262/6.0/#sec-array-exotic-objects
	    if (typeof index !== 'number') {
	      var uint32Index = index >>> 0; // N >>> 0 is shorthand for ToUint32
	      if ('' + uint32Index !== index || uint32Index === 4294967295) {
	        return NaN;
	      }
	      index = uint32Index;
	    }
	    return index < 0 ? ensureSize(iter) + index : index;
	  }

	  function returnTrue() {
	    return true;
	  }

	  function wholeSlice(begin, end, size) {
	    return (begin === 0 || (size !== undefined && begin <= -size)) &&
	      (end === undefined || (size !== undefined && end >= size));
	  }

	  function resolveBegin(begin, size) {
	    return resolveIndex(begin, size, 0);
	  }

	  function resolveEnd(end, size) {
	    return resolveIndex(end, size, size);
	  }

	  function resolveIndex(index, size, defaultIndex) {
	    return index === undefined ?
	      defaultIndex :
	      index < 0 ?
	        Math.max(0, size + index) :
	        size === undefined ?
	          index :
	          Math.min(size, index);
	  }

	  /* global Symbol */

	  var ITERATE_KEYS = 0;
	  var ITERATE_VALUES = 1;
	  var ITERATE_ENTRIES = 2;

	  var REAL_ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
	  var FAUX_ITERATOR_SYMBOL = '@@iterator';

	  var ITERATOR_SYMBOL = REAL_ITERATOR_SYMBOL || FAUX_ITERATOR_SYMBOL;


	  function Iterator(next) {
	      this.next = next;
	    }

	    Iterator.prototype.toString = function() {
	      return '[Iterator]';
	    };


	  Iterator.KEYS = ITERATE_KEYS;
	  Iterator.VALUES = ITERATE_VALUES;
	  Iterator.ENTRIES = ITERATE_ENTRIES;

	  Iterator.prototype.inspect =
	  Iterator.prototype.toSource = function () { return this.toString(); }
	  Iterator.prototype[ITERATOR_SYMBOL] = function () {
	    return this;
	  };


	  function iteratorValue(type, k, v, iteratorResult) {
	    var value = type === 0 ? k : type === 1 ? v : [k, v];
	    iteratorResult ? (iteratorResult.value = value) : (iteratorResult = {
	      value: value, done: false
	    });
	    return iteratorResult;
	  }

	  function iteratorDone() {
	    return { value: undefined, done: true };
	  }

	  function hasIterator(maybeIterable) {
	    return !!getIteratorFn(maybeIterable);
	  }

	  function isIterator(maybeIterator) {
	    return maybeIterator && typeof maybeIterator.next === 'function';
	  }

	  function getIterator(iterable) {
	    var iteratorFn = getIteratorFn(iterable);
	    return iteratorFn && iteratorFn.call(iterable);
	  }

	  function getIteratorFn(iterable) {
	    var iteratorFn = iterable && (
	      (REAL_ITERATOR_SYMBOL && iterable[REAL_ITERATOR_SYMBOL]) ||
	      iterable[FAUX_ITERATOR_SYMBOL]
	    );
	    if (typeof iteratorFn === 'function') {
	      return iteratorFn;
	    }
	  }

	  function isArrayLike(value) {
	    return value && typeof value.length === 'number';
	  }

	  createClass(Seq, Iterable);
	    function Seq(value) {
	      return value === null || value === undefined ? emptySequence() :
	        isIterable(value) ? value.toSeq() : seqFromValue(value);
	    }

	    Seq.of = function(/*...values*/) {
	      return Seq(arguments);
	    };

	    Seq.prototype.toSeq = function() {
	      return this;
	    };

	    Seq.prototype.toString = function() {
	      return this.__toString('Seq {', '}');
	    };

	    Seq.prototype.cacheResult = function() {
	      if (!this._cache && this.__iterateUncached) {
	        this._cache = this.entrySeq().toArray();
	        this.size = this._cache.length;
	      }
	      return this;
	    };

	    // abstract __iterateUncached(fn, reverse)

	    Seq.prototype.__iterate = function(fn, reverse) {
	      return seqIterate(this, fn, reverse, true);
	    };

	    // abstract __iteratorUncached(type, reverse)

	    Seq.prototype.__iterator = function(type, reverse) {
	      return seqIterator(this, type, reverse, true);
	    };



	  createClass(KeyedSeq, Seq);
	    function KeyedSeq(value) {
	      return value === null || value === undefined ?
	        emptySequence().toKeyedSeq() :
	        isIterable(value) ?
	          (isKeyed(value) ? value.toSeq() : value.fromEntrySeq()) :
	          keyedSeqFromValue(value);
	    }

	    KeyedSeq.prototype.toKeyedSeq = function() {
	      return this;
	    };



	  createClass(IndexedSeq, Seq);
	    function IndexedSeq(value) {
	      return value === null || value === undefined ? emptySequence() :
	        !isIterable(value) ? indexedSeqFromValue(value) :
	        isKeyed(value) ? value.entrySeq() : value.toIndexedSeq();
	    }

	    IndexedSeq.of = function(/*...values*/) {
	      return IndexedSeq(arguments);
	    };

	    IndexedSeq.prototype.toIndexedSeq = function() {
	      return this;
	    };

	    IndexedSeq.prototype.toString = function() {
	      return this.__toString('Seq [', ']');
	    };

	    IndexedSeq.prototype.__iterate = function(fn, reverse) {
	      return seqIterate(this, fn, reverse, false);
	    };

	    IndexedSeq.prototype.__iterator = function(type, reverse) {
	      return seqIterator(this, type, reverse, false);
	    };



	  createClass(SetSeq, Seq);
	    function SetSeq(value) {
	      return (
	        value === null || value === undefined ? emptySequence() :
	        !isIterable(value) ? indexedSeqFromValue(value) :
	        isKeyed(value) ? value.entrySeq() : value
	      ).toSetSeq();
	    }

	    SetSeq.of = function(/*...values*/) {
	      return SetSeq(arguments);
	    };

	    SetSeq.prototype.toSetSeq = function() {
	      return this;
	    };



	  Seq.isSeq = isSeq;
	  Seq.Keyed = KeyedSeq;
	  Seq.Set = SetSeq;
	  Seq.Indexed = IndexedSeq;

	  var IS_SEQ_SENTINEL = '@@__IMMUTABLE_SEQ__@@';

	  Seq.prototype[IS_SEQ_SENTINEL] = true;



	  createClass(ArraySeq, IndexedSeq);
	    function ArraySeq(array) {
	      this._array = array;
	      this.size = array.length;
	    }

	    ArraySeq.prototype.get = function(index, notSetValue) {
	      return this.has(index) ? this._array[wrapIndex(this, index)] : notSetValue;
	    };

	    ArraySeq.prototype.__iterate = function(fn, reverse) {
	      var array = this._array;
	      var maxIndex = array.length - 1;
	      for (var ii = 0; ii <= maxIndex; ii++) {
	        if (fn(array[reverse ? maxIndex - ii : ii], ii, this) === false) {
	          return ii + 1;
	        }
	      }
	      return ii;
	    };

	    ArraySeq.prototype.__iterator = function(type, reverse) {
	      var array = this._array;
	      var maxIndex = array.length - 1;
	      var ii = 0;
	      return new Iterator(function() 
	        {return ii > maxIndex ?
	          iteratorDone() :
	          iteratorValue(type, ii, array[reverse ? maxIndex - ii++ : ii++])}
	      );
	    };



	  createClass(ObjectSeq, KeyedSeq);
	    function ObjectSeq(object) {
	      var keys = Object.keys(object);
	      this._object = object;
	      this._keys = keys;
	      this.size = keys.length;
	    }

	    ObjectSeq.prototype.get = function(key, notSetValue) {
	      if (notSetValue !== undefined && !this.has(key)) {
	        return notSetValue;
	      }
	      return this._object[key];
	    };

	    ObjectSeq.prototype.has = function(key) {
	      return this._object.hasOwnProperty(key);
	    };

	    ObjectSeq.prototype.__iterate = function(fn, reverse) {
	      var object = this._object;
	      var keys = this._keys;
	      var maxIndex = keys.length - 1;
	      for (var ii = 0; ii <= maxIndex; ii++) {
	        var key = keys[reverse ? maxIndex - ii : ii];
	        if (fn(object[key], key, this) === false) {
	          return ii + 1;
	        }
	      }
	      return ii;
	    };

	    ObjectSeq.prototype.__iterator = function(type, reverse) {
	      var object = this._object;
	      var keys = this._keys;
	      var maxIndex = keys.length - 1;
	      var ii = 0;
	      return new Iterator(function()  {
	        var key = keys[reverse ? maxIndex - ii : ii];
	        return ii++ > maxIndex ?
	          iteratorDone() :
	          iteratorValue(type, key, object[key]);
	      });
	    };

	  ObjectSeq.prototype[IS_ORDERED_SENTINEL] = true;


	  createClass(IterableSeq, IndexedSeq);
	    function IterableSeq(iterable) {
	      this._iterable = iterable;
	      this.size = iterable.length || iterable.size;
	    }

	    IterableSeq.prototype.__iterateUncached = function(fn, reverse) {
	      if (reverse) {
	        return this.cacheResult().__iterate(fn, reverse);
	      }
	      var iterable = this._iterable;
	      var iterator = getIterator(iterable);
	      var iterations = 0;
	      if (isIterator(iterator)) {
	        var step;
	        while (!(step = iterator.next()).done) {
	          if (fn(step.value, iterations++, this) === false) {
	            break;
	          }
	        }
	      }
	      return iterations;
	    };

	    IterableSeq.prototype.__iteratorUncached = function(type, reverse) {
	      if (reverse) {
	        return this.cacheResult().__iterator(type, reverse);
	      }
	      var iterable = this._iterable;
	      var iterator = getIterator(iterable);
	      if (!isIterator(iterator)) {
	        return new Iterator(iteratorDone);
	      }
	      var iterations = 0;
	      return new Iterator(function()  {
	        var step = iterator.next();
	        return step.done ? step : iteratorValue(type, iterations++, step.value);
	      });
	    };



	  createClass(IteratorSeq, IndexedSeq);
	    function IteratorSeq(iterator) {
	      this._iterator = iterator;
	      this._iteratorCache = [];
	    }

	    IteratorSeq.prototype.__iterateUncached = function(fn, reverse) {
	      if (reverse) {
	        return this.cacheResult().__iterate(fn, reverse);
	      }
	      var iterator = this._iterator;
	      var cache = this._iteratorCache;
	      var iterations = 0;
	      while (iterations < cache.length) {
	        if (fn(cache[iterations], iterations++, this) === false) {
	          return iterations;
	        }
	      }
	      var step;
	      while (!(step = iterator.next()).done) {
	        var val = step.value;
	        cache[iterations] = val;
	        if (fn(val, iterations++, this) === false) {
	          break;
	        }
	      }
	      return iterations;
	    };

	    IteratorSeq.prototype.__iteratorUncached = function(type, reverse) {
	      if (reverse) {
	        return this.cacheResult().__iterator(type, reverse);
	      }
	      var iterator = this._iterator;
	      var cache = this._iteratorCache;
	      var iterations = 0;
	      return new Iterator(function()  {
	        if (iterations >= cache.length) {
	          var step = iterator.next();
	          if (step.done) {
	            return step;
	          }
	          cache[iterations] = step.value;
	        }
	        return iteratorValue(type, iterations, cache[iterations++]);
	      });
	    };




	  // # pragma Helper functions

	  function isSeq(maybeSeq) {
	    return !!(maybeSeq && maybeSeq[IS_SEQ_SENTINEL]);
	  }

	  var EMPTY_SEQ;

	  function emptySequence() {
	    return EMPTY_SEQ || (EMPTY_SEQ = new ArraySeq([]));
	  }

	  function keyedSeqFromValue(value) {
	    var seq =
	      Array.isArray(value) ? new ArraySeq(value).fromEntrySeq() :
	      isIterator(value) ? new IteratorSeq(value).fromEntrySeq() :
	      hasIterator(value) ? new IterableSeq(value).fromEntrySeq() :
	      typeof value === 'object' ? new ObjectSeq(value) :
	      undefined;
	    if (!seq) {
	      throw new TypeError(
	        'Expected Array or iterable object of [k, v] entries, '+
	        'or keyed object: ' + value
	      );
	    }
	    return seq;
	  }

	  function indexedSeqFromValue(value) {
	    var seq = maybeIndexedSeqFromValue(value);
	    if (!seq) {
	      throw new TypeError(
	        'Expected Array or iterable object of values: ' + value
	      );
	    }
	    return seq;
	  }

	  function seqFromValue(value) {
	    var seq = maybeIndexedSeqFromValue(value) ||
	      (typeof value === 'object' && new ObjectSeq(value));
	    if (!seq) {
	      throw new TypeError(
	        'Expected Array or iterable object of values, or keyed object: ' + value
	      );
	    }
	    return seq;
	  }

	  function maybeIndexedSeqFromValue(value) {
	    return (
	      isArrayLike(value) ? new ArraySeq(value) :
	      isIterator(value) ? new IteratorSeq(value) :
	      hasIterator(value) ? new IterableSeq(value) :
	      undefined
	    );
	  }

	  function seqIterate(seq, fn, reverse, useKeys) {
	    var cache = seq._cache;
	    if (cache) {
	      var maxIndex = cache.length - 1;
	      for (var ii = 0; ii <= maxIndex; ii++) {
	        var entry = cache[reverse ? maxIndex - ii : ii];
	        if (fn(entry[1], useKeys ? entry[0] : ii, seq) === false) {
	          return ii + 1;
	        }
	      }
	      return ii;
	    }
	    return seq.__iterateUncached(fn, reverse);
	  }

	  function seqIterator(seq, type, reverse, useKeys) {
	    var cache = seq._cache;
	    if (cache) {
	      var maxIndex = cache.length - 1;
	      var ii = 0;
	      return new Iterator(function()  {
	        var entry = cache[reverse ? maxIndex - ii : ii];
	        return ii++ > maxIndex ?
	          iteratorDone() :
	          iteratorValue(type, useKeys ? entry[0] : ii - 1, entry[1]);
	      });
	    }
	    return seq.__iteratorUncached(type, reverse);
	  }

	  function fromJS(json, converter) {
	    return converter ?
	      fromJSWith(converter, json, '', {'': json}) :
	      fromJSDefault(json);
	  }

	  function fromJSWith(converter, json, key, parentJSON) {
	    if (Array.isArray(json)) {
	      return converter.call(parentJSON, key, IndexedSeq(json).map(function(v, k)  {return fromJSWith(converter, v, k, json)}));
	    }
	    if (isPlainObj(json)) {
	      return converter.call(parentJSON, key, KeyedSeq(json).map(function(v, k)  {return fromJSWith(converter, v, k, json)}));
	    }
	    return json;
	  }

	  function fromJSDefault(json) {
	    if (Array.isArray(json)) {
	      return IndexedSeq(json).map(fromJSDefault).toList();
	    }
	    if (isPlainObj(json)) {
	      return KeyedSeq(json).map(fromJSDefault).toMap();
	    }
	    return json;
	  }

	  function isPlainObj(value) {
	    return value && (value.constructor === Object || value.constructor === undefined);
	  }

	  /**
	   * An extension of the "same-value" algorithm as [described for use by ES6 Map
	   * and Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#Key_equality)
	   *
	   * NaN is considered the same as NaN, however -0 and 0 are considered the same
	   * value, which is different from the algorithm described by
	   * [`Object.is`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is).
	   *
	   * This is extended further to allow Objects to describe the values they
	   * represent, by way of `valueOf` or `equals` (and `hashCode`).
	   *
	   * Note: because of this extension, the key equality of Immutable.Map and the
	   * value equality of Immutable.Set will differ from ES6 Map and Set.
	   *
	   * ### Defining custom values
	   *
	   * The easiest way to describe the value an object represents is by implementing
	   * `valueOf`. For example, `Date` represents a value by returning a unix
	   * timestamp for `valueOf`:
	   *
	   *     var date1 = new Date(1234567890000); // Fri Feb 13 2009 ...
	   *     var date2 = new Date(1234567890000);
	   *     date1.valueOf(); // 1234567890000
	   *     assert( date1 !== date2 );
	   *     assert( Immutable.is( date1, date2 ) );
	   *
	   * Note: overriding `valueOf` may have other implications if you use this object
	   * where JavaScript expects a primitive, such as implicit string coercion.
	   *
	   * For more complex types, especially collections, implementing `valueOf` may
	   * not be performant. An alternative is to implement `equals` and `hashCode`.
	   *
	   * `equals` takes another object, presumably of similar type, and returns true
	   * if the it is equal. Equality is symmetrical, so the same result should be
	   * returned if this and the argument are flipped.
	   *
	   *     assert( a.equals(b) === b.equals(a) );
	   *
	   * `hashCode` returns a 32bit integer number representing the object which will
	   * be used to determine how to store the value object in a Map or Set. You must
	   * provide both or neither methods, one must not exist without the other.
	   *
	   * Also, an important relationship between these methods must be upheld: if two
	   * values are equal, they *must* return the same hashCode. If the values are not
	   * equal, they might have the same hashCode; this is called a hash collision,
	   * and while undesirable for performance reasons, it is acceptable.
	   *
	   *     if (a.equals(b)) {
	   *       assert( a.hashCode() === b.hashCode() );
	   *     }
	   *
	   * All Immutable collections implement `equals` and `hashCode`.
	   *
	   */
	  function is(valueA, valueB) {
	    if (valueA === valueB || (valueA !== valueA && valueB !== valueB)) {
	      return true;
	    }
	    if (!valueA || !valueB) {
	      return false;
	    }
	    if (typeof valueA.valueOf === 'function' &&
	        typeof valueB.valueOf === 'function') {
	      valueA = valueA.valueOf();
	      valueB = valueB.valueOf();
	      if (valueA === valueB || (valueA !== valueA && valueB !== valueB)) {
	        return true;
	      }
	      if (!valueA || !valueB) {
	        return false;
	      }
	    }
	    if (typeof valueA.equals === 'function' &&
	        typeof valueB.equals === 'function' &&
	        valueA.equals(valueB)) {
	      return true;
	    }
	    return false;
	  }

	  function deepEqual(a, b) {
	    if (a === b) {
	      return true;
	    }

	    if (
	      !isIterable(b) ||
	      a.size !== undefined && b.size !== undefined && a.size !== b.size ||
	      a.__hash !== undefined && b.__hash !== undefined && a.__hash !== b.__hash ||
	      isKeyed(a) !== isKeyed(b) ||
	      isIndexed(a) !== isIndexed(b) ||
	      isOrdered(a) !== isOrdered(b)
	    ) {
	      return false;
	    }

	    if (a.size === 0 && b.size === 0) {
	      return true;
	    }

	    var notAssociative = !isAssociative(a);

	    if (isOrdered(a)) {
	      var entries = a.entries();
	      return b.every(function(v, k)  {
	        var entry = entries.next().value;
	        return entry && is(entry[1], v) && (notAssociative || is(entry[0], k));
	      }) && entries.next().done;
	    }

	    var flipped = false;

	    if (a.size === undefined) {
	      if (b.size === undefined) {
	        if (typeof a.cacheResult === 'function') {
	          a.cacheResult();
	        }
	      } else {
	        flipped = true;
	        var _ = a;
	        a = b;
	        b = _;
	      }
	    }

	    var allEqual = true;
	    var bSize = b.__iterate(function(v, k)  {
	      if (notAssociative ? !a.has(v) :
	          flipped ? !is(v, a.get(k, NOT_SET)) : !is(a.get(k, NOT_SET), v)) {
	        allEqual = false;
	        return false;
	      }
	    });

	    return allEqual && a.size === bSize;
	  }

	  createClass(Repeat, IndexedSeq);

	    function Repeat(value, times) {
	      if (!(this instanceof Repeat)) {
	        return new Repeat(value, times);
	      }
	      this._value = value;
	      this.size = times === undefined ? Infinity : Math.max(0, times);
	      if (this.size === 0) {
	        if (EMPTY_REPEAT) {
	          return EMPTY_REPEAT;
	        }
	        EMPTY_REPEAT = this;
	      }
	    }

	    Repeat.prototype.toString = function() {
	      if (this.size === 0) {
	        return 'Repeat []';
	      }
	      return 'Repeat [ ' + this._value + ' ' + this.size + ' times ]';
	    };

	    Repeat.prototype.get = function(index, notSetValue) {
	      return this.has(index) ? this._value : notSetValue;
	    };

	    Repeat.prototype.includes = function(searchValue) {
	      return is(this._value, searchValue);
	    };

	    Repeat.prototype.slice = function(begin, end) {
	      var size = this.size;
	      return wholeSlice(begin, end, size) ? this :
	        new Repeat(this._value, resolveEnd(end, size) - resolveBegin(begin, size));
	    };

	    Repeat.prototype.reverse = function() {
	      return this;
	    };

	    Repeat.prototype.indexOf = function(searchValue) {
	      if (is(this._value, searchValue)) {
	        return 0;
	      }
	      return -1;
	    };

	    Repeat.prototype.lastIndexOf = function(searchValue) {
	      if (is(this._value, searchValue)) {
	        return this.size;
	      }
	      return -1;
	    };

	    Repeat.prototype.__iterate = function(fn, reverse) {
	      for (var ii = 0; ii < this.size; ii++) {
	        if (fn(this._value, ii, this) === false) {
	          return ii + 1;
	        }
	      }
	      return ii;
	    };

	    Repeat.prototype.__iterator = function(type, reverse) {var this$0 = this;
	      var ii = 0;
	      return new Iterator(function() 
	        {return ii < this$0.size ? iteratorValue(type, ii++, this$0._value) : iteratorDone()}
	      );
	    };

	    Repeat.prototype.equals = function(other) {
	      return other instanceof Repeat ?
	        is(this._value, other._value) :
	        deepEqual(other);
	    };


	  var EMPTY_REPEAT;

	  function invariant(condition, error) {
	    if (!condition) throw new Error(error);
	  }

	  createClass(Range, IndexedSeq);

	    function Range(start, end, step) {
	      if (!(this instanceof Range)) {
	        return new Range(start, end, step);
	      }
	      invariant(step !== 0, 'Cannot step a Range by 0');
	      start = start || 0;
	      if (end === undefined) {
	        end = Infinity;
	      }
	      step = step === undefined ? 1 : Math.abs(step);
	      if (end < start) {
	        step = -step;
	      }
	      this._start = start;
	      this._end = end;
	      this._step = step;
	      this.size = Math.max(0, Math.ceil((end - start) / step - 1) + 1);
	      if (this.size === 0) {
	        if (EMPTY_RANGE) {
	          return EMPTY_RANGE;
	        }
	        EMPTY_RANGE = this;
	      }
	    }

	    Range.prototype.toString = function() {
	      if (this.size === 0) {
	        return 'Range []';
	      }
	      return 'Range [ ' +
	        this._start + '...' + this._end +
	        (this._step !== 1 ? ' by ' + this._step : '') +
	      ' ]';
	    };

	    Range.prototype.get = function(index, notSetValue) {
	      return this.has(index) ?
	        this._start + wrapIndex(this, index) * this._step :
	        notSetValue;
	    };

	    Range.prototype.includes = function(searchValue) {
	      var possibleIndex = (searchValue - this._start) / this._step;
	      return possibleIndex >= 0 &&
	        possibleIndex < this.size &&
	        possibleIndex === Math.floor(possibleIndex);
	    };

	    Range.prototype.slice = function(begin, end) {
	      if (wholeSlice(begin, end, this.size)) {
	        return this;
	      }
	      begin = resolveBegin(begin, this.size);
	      end = resolveEnd(end, this.size);
	      if (end <= begin) {
	        return new Range(0, 0);
	      }
	      return new Range(this.get(begin, this._end), this.get(end, this._end), this._step);
	    };

	    Range.prototype.indexOf = function(searchValue) {
	      var offsetValue = searchValue - this._start;
	      if (offsetValue % this._step === 0) {
	        var index = offsetValue / this._step;
	        if (index >= 0 && index < this.size) {
	          return index
	        }
	      }
	      return -1;
	    };

	    Range.prototype.lastIndexOf = function(searchValue) {
	      return this.indexOf(searchValue);
	    };

	    Range.prototype.__iterate = function(fn, reverse) {
	      var maxIndex = this.size - 1;
	      var step = this._step;
	      var value = reverse ? this._start + maxIndex * step : this._start;
	      for (var ii = 0; ii <= maxIndex; ii++) {
	        if (fn(value, ii, this) === false) {
	          return ii + 1;
	        }
	        value += reverse ? -step : step;
	      }
	      return ii;
	    };

	    Range.prototype.__iterator = function(type, reverse) {
	      var maxIndex = this.size - 1;
	      var step = this._step;
	      var value = reverse ? this._start + maxIndex * step : this._start;
	      var ii = 0;
	      return new Iterator(function()  {
	        var v = value;
	        value += reverse ? -step : step;
	        return ii > maxIndex ? iteratorDone() : iteratorValue(type, ii++, v);
	      });
	    };

	    Range.prototype.equals = function(other) {
	      return other instanceof Range ?
	        this._start === other._start &&
	        this._end === other._end &&
	        this._step === other._step :
	        deepEqual(this, other);
	    };


	  var EMPTY_RANGE;

	  createClass(Collection, Iterable);
	    function Collection() {
	      throw TypeError('Abstract');
	    }


	  createClass(KeyedCollection, Collection);function KeyedCollection() {}

	  createClass(IndexedCollection, Collection);function IndexedCollection() {}

	  createClass(SetCollection, Collection);function SetCollection() {}


	  Collection.Keyed = KeyedCollection;
	  Collection.Indexed = IndexedCollection;
	  Collection.Set = SetCollection;

	  var imul =
	    typeof Math.imul === 'function' && Math.imul(0xffffffff, 2) === -2 ?
	    Math.imul :
	    function imul(a, b) {
	      a = a | 0; // int
	      b = b | 0; // int
	      var c = a & 0xffff;
	      var d = b & 0xffff;
	      // Shift by 0 fixes the sign on the high part.
	      return (c * d) + ((((a >>> 16) * d + c * (b >>> 16)) << 16) >>> 0) | 0; // int
	    };

	  // v8 has an optimization for storing 31-bit signed numbers.
	  // Values which have either 00 or 11 as the high order bits qualify.
	  // This function drops the highest order bit in a signed number, maintaining
	  // the sign bit.
	  function smi(i32) {
	    return ((i32 >>> 1) & 0x40000000) | (i32 & 0xBFFFFFFF);
	  }

	  function hash(o) {
	    if (o === false || o === null || o === undefined) {
	      return 0;
	    }
	    if (typeof o.valueOf === 'function') {
	      o = o.valueOf();
	      if (o === false || o === null || o === undefined) {
	        return 0;
	      }
	    }
	    if (o === true) {
	      return 1;
	    }
	    var type = typeof o;
	    if (type === 'number') {
	      if (o !== o || o === Infinity) {
	        return 0;
	      }
	      var h = o | 0;
	      if (h !== o) {
	        h ^= o * 0xFFFFFFFF;
	      }
	      while (o > 0xFFFFFFFF) {
	        o /= 0xFFFFFFFF;
	        h ^= o;
	      }
	      return smi(h);
	    }
	    if (type === 'string') {
	      return o.length > STRING_HASH_CACHE_MIN_STRLEN ? cachedHashString(o) : hashString(o);
	    }
	    if (typeof o.hashCode === 'function') {
	      return o.hashCode();
	    }
	    if (type === 'object') {
	      return hashJSObj(o);
	    }
	    if (typeof o.toString === 'function') {
	      return hashString(o.toString());
	    }
	    throw new Error('Value type ' + type + ' cannot be hashed.');
	  }

	  function cachedHashString(string) {
	    var hash = stringHashCache[string];
	    if (hash === undefined) {
	      hash = hashString(string);
	      if (STRING_HASH_CACHE_SIZE === STRING_HASH_CACHE_MAX_SIZE) {
	        STRING_HASH_CACHE_SIZE = 0;
	        stringHashCache = {};
	      }
	      STRING_HASH_CACHE_SIZE++;
	      stringHashCache[string] = hash;
	    }
	    return hash;
	  }

	  // http://jsperf.com/hashing-strings
	  function hashString(string) {
	    // This is the hash from JVM
	    // The hash code for a string is computed as
	    // s[0] * 31 ^ (n - 1) + s[1] * 31 ^ (n - 2) + ... + s[n - 1],
	    // where s[i] is the ith character of the string and n is the length of
	    // the string. We "mod" the result to make it between 0 (inclusive) and 2^31
	    // (exclusive) by dropping high bits.
	    var hash = 0;
	    for (var ii = 0; ii < string.length; ii++) {
	      hash = 31 * hash + string.charCodeAt(ii) | 0;
	    }
	    return smi(hash);
	  }

	  function hashJSObj(obj) {
	    var hash;
	    if (usingWeakMap) {
	      hash = weakMap.get(obj);
	      if (hash !== undefined) {
	        return hash;
	      }
	    }

	    hash = obj[UID_HASH_KEY];
	    if (hash !== undefined) {
	      return hash;
	    }

	    if (!canDefineProperty) {
	      hash = obj.propertyIsEnumerable && obj.propertyIsEnumerable[UID_HASH_KEY];
	      if (hash !== undefined) {
	        return hash;
	      }

	      hash = getIENodeHash(obj);
	      if (hash !== undefined) {
	        return hash;
	      }
	    }

	    hash = ++objHashUID;
	    if (objHashUID & 0x40000000) {
	      objHashUID = 0;
	    }

	    if (usingWeakMap) {
	      weakMap.set(obj, hash);
	    } else if (isExtensible !== undefined && isExtensible(obj) === false) {
	      throw new Error('Non-extensible objects are not allowed as keys.');
	    } else if (canDefineProperty) {
	      Object.defineProperty(obj, UID_HASH_KEY, {
	        'enumerable': false,
	        'configurable': false,
	        'writable': false,
	        'value': hash
	      });
	    } else if (obj.propertyIsEnumerable !== undefined &&
	               obj.propertyIsEnumerable === obj.constructor.prototype.propertyIsEnumerable) {
	      // Since we can't define a non-enumerable property on the object
	      // we'll hijack one of the less-used non-enumerable properties to
	      // save our hash on it. Since this is a function it will not show up in
	      // `JSON.stringify` which is what we want.
	      obj.propertyIsEnumerable = function() {
	        return this.constructor.prototype.propertyIsEnumerable.apply(this, arguments);
	      };
	      obj.propertyIsEnumerable[UID_HASH_KEY] = hash;
	    } else if (obj.nodeType !== undefined) {
	      // At this point we couldn't get the IE `uniqueID` to use as a hash
	      // and we couldn't use a non-enumerable property to exploit the
	      // dontEnum bug so we simply add the `UID_HASH_KEY` on the node
	      // itself.
	      obj[UID_HASH_KEY] = hash;
	    } else {
	      throw new Error('Unable to set a non-enumerable property on object.');
	    }

	    return hash;
	  }

	  // Get references to ES5 object methods.
	  var isExtensible = Object.isExtensible;

	  // True if Object.defineProperty works as expected. IE8 fails this test.
	  var canDefineProperty = (function() {
	    try {
	      Object.defineProperty({}, '@', {});
	      return true;
	    } catch (e) {
	      return false;
	    }
	  }());

	  // IE has a `uniqueID` property on DOM nodes. We can construct the hash from it
	  // and avoid memory leaks from the IE cloneNode bug.
	  function getIENodeHash(node) {
	    if (node && node.nodeType > 0) {
	      switch (node.nodeType) {
	        case 1: // Element
	          return node.uniqueID;
	        case 9: // Document
	          return node.documentElement && node.documentElement.uniqueID;
	      }
	    }
	  }

	  // If possible, use a WeakMap.
	  var usingWeakMap = typeof WeakMap === 'function';
	  var weakMap;
	  if (usingWeakMap) {
	    weakMap = new WeakMap();
	  }

	  var objHashUID = 0;

	  var UID_HASH_KEY = '__immutablehash__';
	  if (typeof Symbol === 'function') {
	    UID_HASH_KEY = Symbol(UID_HASH_KEY);
	  }

	  var STRING_HASH_CACHE_MIN_STRLEN = 16;
	  var STRING_HASH_CACHE_MAX_SIZE = 255;
	  var STRING_HASH_CACHE_SIZE = 0;
	  var stringHashCache = {};

	  function assertNotInfinite(size) {
	    invariant(
	      size !== Infinity,
	      'Cannot perform this action with an infinite size.'
	    );
	  }

	  createClass(Map, KeyedCollection);

	    // @pragma Construction

	    function Map(value) {
	      return value === null || value === undefined ? emptyMap() :
	        isMap(value) && !isOrdered(value) ? value :
	        emptyMap().withMutations(function(map ) {
	          var iter = KeyedIterable(value);
	          assertNotInfinite(iter.size);
	          iter.forEach(function(v, k)  {return map.set(k, v)});
	        });
	    }

	    Map.of = function() {var keyValues = SLICE$0.call(arguments, 0);
	      return emptyMap().withMutations(function(map ) {
	        for (var i = 0; i < keyValues.length; i += 2) {
	          if (i + 1 >= keyValues.length) {
	            throw new Error('Missing value for key: ' + keyValues[i]);
	          }
	          map.set(keyValues[i], keyValues[i + 1]);
	        }
	      });
	    };

	    Map.prototype.toString = function() {
	      return this.__toString('Map {', '}');
	    };

	    // @pragma Access

	    Map.prototype.get = function(k, notSetValue) {
	      return this._root ?
	        this._root.get(0, undefined, k, notSetValue) :
	        notSetValue;
	    };

	    // @pragma Modification

	    Map.prototype.set = function(k, v) {
	      return updateMap(this, k, v);
	    };

	    Map.prototype.setIn = function(keyPath, v) {
	      return this.updateIn(keyPath, NOT_SET, function()  {return v});
	    };

	    Map.prototype.remove = function(k) {
	      return updateMap(this, k, NOT_SET);
	    };

	    Map.prototype.deleteIn = function(keyPath) {
	      return this.updateIn(keyPath, function()  {return NOT_SET});
	    };

	    Map.prototype.update = function(k, notSetValue, updater) {
	      return arguments.length === 1 ?
	        k(this) :
	        this.updateIn([k], notSetValue, updater);
	    };

	    Map.prototype.updateIn = function(keyPath, notSetValue, updater) {
	      if (!updater) {
	        updater = notSetValue;
	        notSetValue = undefined;
	      }
	      var updatedValue = updateInDeepMap(
	        this,
	        forceIterator(keyPath),
	        notSetValue,
	        updater
	      );
	      return updatedValue === NOT_SET ? undefined : updatedValue;
	    };

	    Map.prototype.clear = function() {
	      if (this.size === 0) {
	        return this;
	      }
	      if (this.__ownerID) {
	        this.size = 0;
	        this._root = null;
	        this.__hash = undefined;
	        this.__altered = true;
	        return this;
	      }
	      return emptyMap();
	    };

	    // @pragma Composition

	    Map.prototype.merge = function(/*...iters*/) {
	      return mergeIntoMapWith(this, undefined, arguments);
	    };

	    Map.prototype.mergeWith = function(merger) {var iters = SLICE$0.call(arguments, 1);
	      return mergeIntoMapWith(this, merger, iters);
	    };

	    Map.prototype.mergeIn = function(keyPath) {var iters = SLICE$0.call(arguments, 1);
	      return this.updateIn(
	        keyPath,
	        emptyMap(),
	        function(m ) {return typeof m.merge === 'function' ?
	          m.merge.apply(m, iters) :
	          iters[iters.length - 1]}
	      );
	    };

	    Map.prototype.mergeDeep = function(/*...iters*/) {
	      return mergeIntoMapWith(this, deepMerger, arguments);
	    };

	    Map.prototype.mergeDeepWith = function(merger) {var iters = SLICE$0.call(arguments, 1);
	      return mergeIntoMapWith(this, deepMergerWith(merger), iters);
	    };

	    Map.prototype.mergeDeepIn = function(keyPath) {var iters = SLICE$0.call(arguments, 1);
	      return this.updateIn(
	        keyPath,
	        emptyMap(),
	        function(m ) {return typeof m.mergeDeep === 'function' ?
	          m.mergeDeep.apply(m, iters) :
	          iters[iters.length - 1]}
	      );
	    };

	    Map.prototype.sort = function(comparator) {
	      // Late binding
	      return OrderedMap(sortFactory(this, comparator));
	    };

	    Map.prototype.sortBy = function(mapper, comparator) {
	      // Late binding
	      return OrderedMap(sortFactory(this, comparator, mapper));
	    };

	    // @pragma Mutability

	    Map.prototype.withMutations = function(fn) {
	      var mutable = this.asMutable();
	      fn(mutable);
	      return mutable.wasAltered() ? mutable.__ensureOwner(this.__ownerID) : this;
	    };

	    Map.prototype.asMutable = function() {
	      return this.__ownerID ? this : this.__ensureOwner(new OwnerID());
	    };

	    Map.prototype.asImmutable = function() {
	      return this.__ensureOwner();
	    };

	    Map.prototype.wasAltered = function() {
	      return this.__altered;
	    };

	    Map.prototype.__iterator = function(type, reverse) {
	      return new MapIterator(this, type, reverse);
	    };

	    Map.prototype.__iterate = function(fn, reverse) {var this$0 = this;
	      var iterations = 0;
	      this._root && this._root.iterate(function(entry ) {
	        iterations++;
	        return fn(entry[1], entry[0], this$0);
	      }, reverse);
	      return iterations;
	    };

	    Map.prototype.__ensureOwner = function(ownerID) {
	      if (ownerID === this.__ownerID) {
	        return this;
	      }
	      if (!ownerID) {
	        this.__ownerID = ownerID;
	        this.__altered = false;
	        return this;
	      }
	      return makeMap(this.size, this._root, ownerID, this.__hash);
	    };


	  function isMap(maybeMap) {
	    return !!(maybeMap && maybeMap[IS_MAP_SENTINEL]);
	  }

	  Map.isMap = isMap;

	  var IS_MAP_SENTINEL = '@@__IMMUTABLE_MAP__@@';

	  var MapPrototype = Map.prototype;
	  MapPrototype[IS_MAP_SENTINEL] = true;
	  MapPrototype[DELETE] = MapPrototype.remove;
	  MapPrototype.removeIn = MapPrototype.deleteIn;


	  // #pragma Trie Nodes



	    function ArrayMapNode(ownerID, entries) {
	      this.ownerID = ownerID;
	      this.entries = entries;
	    }

	    ArrayMapNode.prototype.get = function(shift, keyHash, key, notSetValue) {
	      var entries = this.entries;
	      for (var ii = 0, len = entries.length; ii < len; ii++) {
	        if (is(key, entries[ii][0])) {
	          return entries[ii][1];
	        }
	      }
	      return notSetValue;
	    };

	    ArrayMapNode.prototype.update = function(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
	      var removed = value === NOT_SET;

	      var entries = this.entries;
	      var idx = 0;
	      for (var len = entries.length; idx < len; idx++) {
	        if (is(key, entries[idx][0])) {
	          break;
	        }
	      }
	      var exists = idx < len;

	      if (exists ? entries[idx][1] === value : removed) {
	        return this;
	      }

	      SetRef(didAlter);
	      (removed || !exists) && SetRef(didChangeSize);

	      if (removed && entries.length === 1) {
	        return; // undefined
	      }

	      if (!exists && !removed && entries.length >= MAX_ARRAY_MAP_SIZE) {
	        return createNodes(ownerID, entries, key, value);
	      }

	      var isEditable = ownerID && ownerID === this.ownerID;
	      var newEntries = isEditable ? entries : arrCopy(entries);

	      if (exists) {
	        if (removed) {
	          idx === len - 1 ? newEntries.pop() : (newEntries[idx] = newEntries.pop());
	        } else {
	          newEntries[idx] = [key, value];
	        }
	      } else {
	        newEntries.push([key, value]);
	      }

	      if (isEditable) {
	        this.entries = newEntries;
	        return this;
	      }

	      return new ArrayMapNode(ownerID, newEntries);
	    };




	    function BitmapIndexedNode(ownerID, bitmap, nodes) {
	      this.ownerID = ownerID;
	      this.bitmap = bitmap;
	      this.nodes = nodes;
	    }

	    BitmapIndexedNode.prototype.get = function(shift, keyHash, key, notSetValue) {
	      if (keyHash === undefined) {
	        keyHash = hash(key);
	      }
	      var bit = (1 << ((shift === 0 ? keyHash : keyHash >>> shift) & MASK));
	      var bitmap = this.bitmap;
	      return (bitmap & bit) === 0 ? notSetValue :
	        this.nodes[popCount(bitmap & (bit - 1))].get(shift + SHIFT, keyHash, key, notSetValue);
	    };

	    BitmapIndexedNode.prototype.update = function(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
	      if (keyHash === undefined) {
	        keyHash = hash(key);
	      }
	      var keyHashFrag = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
	      var bit = 1 << keyHashFrag;
	      var bitmap = this.bitmap;
	      var exists = (bitmap & bit) !== 0;

	      if (!exists && value === NOT_SET) {
	        return this;
	      }

	      var idx = popCount(bitmap & (bit - 1));
	      var nodes = this.nodes;
	      var node = exists ? nodes[idx] : undefined;
	      var newNode = updateNode(node, ownerID, shift + SHIFT, keyHash, key, value, didChangeSize, didAlter);

	      if (newNode === node) {
	        return this;
	      }

	      if (!exists && newNode && nodes.length >= MAX_BITMAP_INDEXED_SIZE) {
	        return expandNodes(ownerID, nodes, bitmap, keyHashFrag, newNode);
	      }

	      if (exists && !newNode && nodes.length === 2 && isLeafNode(nodes[idx ^ 1])) {
	        return nodes[idx ^ 1];
	      }

	      if (exists && newNode && nodes.length === 1 && isLeafNode(newNode)) {
	        return newNode;
	      }

	      var isEditable = ownerID && ownerID === this.ownerID;
	      var newBitmap = exists ? newNode ? bitmap : bitmap ^ bit : bitmap | bit;
	      var newNodes = exists ? newNode ?
	        setIn(nodes, idx, newNode, isEditable) :
	        spliceOut(nodes, idx, isEditable) :
	        spliceIn(nodes, idx, newNode, isEditable);

	      if (isEditable) {
	        this.bitmap = newBitmap;
	        this.nodes = newNodes;
	        return this;
	      }

	      return new BitmapIndexedNode(ownerID, newBitmap, newNodes);
	    };




	    function HashArrayMapNode(ownerID, count, nodes) {
	      this.ownerID = ownerID;
	      this.count = count;
	      this.nodes = nodes;
	    }

	    HashArrayMapNode.prototype.get = function(shift, keyHash, key, notSetValue) {
	      if (keyHash === undefined) {
	        keyHash = hash(key);
	      }
	      var idx = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
	      var node = this.nodes[idx];
	      return node ? node.get(shift + SHIFT, keyHash, key, notSetValue) : notSetValue;
	    };

	    HashArrayMapNode.prototype.update = function(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
	      if (keyHash === undefined) {
	        keyHash = hash(key);
	      }
	      var idx = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
	      var removed = value === NOT_SET;
	      var nodes = this.nodes;
	      var node = nodes[idx];

	      if (removed && !node) {
	        return this;
	      }

	      var newNode = updateNode(node, ownerID, shift + SHIFT, keyHash, key, value, didChangeSize, didAlter);
	      if (newNode === node) {
	        return this;
	      }

	      var newCount = this.count;
	      if (!node) {
	        newCount++;
	      } else if (!newNode) {
	        newCount--;
	        if (newCount < MIN_HASH_ARRAY_MAP_SIZE) {
	          return packNodes(ownerID, nodes, newCount, idx);
	        }
	      }

	      var isEditable = ownerID && ownerID === this.ownerID;
	      var newNodes = setIn(nodes, idx, newNode, isEditable);

	      if (isEditable) {
	        this.count = newCount;
	        this.nodes = newNodes;
	        return this;
	      }

	      return new HashArrayMapNode(ownerID, newCount, newNodes);
	    };




	    function HashCollisionNode(ownerID, keyHash, entries) {
	      this.ownerID = ownerID;
	      this.keyHash = keyHash;
	      this.entries = entries;
	    }

	    HashCollisionNode.prototype.get = function(shift, keyHash, key, notSetValue) {
	      var entries = this.entries;
	      for (var ii = 0, len = entries.length; ii < len; ii++) {
	        if (is(key, entries[ii][0])) {
	          return entries[ii][1];
	        }
	      }
	      return notSetValue;
	    };

	    HashCollisionNode.prototype.update = function(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
	      if (keyHash === undefined) {
	        keyHash = hash(key);
	      }

	      var removed = value === NOT_SET;

	      if (keyHash !== this.keyHash) {
	        if (removed) {
	          return this;
	        }
	        SetRef(didAlter);
	        SetRef(didChangeSize);
	        return mergeIntoNode(this, ownerID, shift, keyHash, [key, value]);
	      }

	      var entries = this.entries;
	      var idx = 0;
	      for (var len = entries.length; idx < len; idx++) {
	        if (is(key, entries[idx][0])) {
	          break;
	        }
	      }
	      var exists = idx < len;

	      if (exists ? entries[idx][1] === value : removed) {
	        return this;
	      }

	      SetRef(didAlter);
	      (removed || !exists) && SetRef(didChangeSize);

	      if (removed && len === 2) {
	        return new ValueNode(ownerID, this.keyHash, entries[idx ^ 1]);
	      }

	      var isEditable = ownerID && ownerID === this.ownerID;
	      var newEntries = isEditable ? entries : arrCopy(entries);

	      if (exists) {
	        if (removed) {
	          idx === len - 1 ? newEntries.pop() : (newEntries[idx] = newEntries.pop());
	        } else {
	          newEntries[idx] = [key, value];
	        }
	      } else {
	        newEntries.push([key, value]);
	      }

	      if (isEditable) {
	        this.entries = newEntries;
	        return this;
	      }

	      return new HashCollisionNode(ownerID, this.keyHash, newEntries);
	    };




	    function ValueNode(ownerID, keyHash, entry) {
	      this.ownerID = ownerID;
	      this.keyHash = keyHash;
	      this.entry = entry;
	    }

	    ValueNode.prototype.get = function(shift, keyHash, key, notSetValue) {
	      return is(key, this.entry[0]) ? this.entry[1] : notSetValue;
	    };

	    ValueNode.prototype.update = function(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
	      var removed = value === NOT_SET;
	      var keyMatch = is(key, this.entry[0]);
	      if (keyMatch ? value === this.entry[1] : removed) {
	        return this;
	      }

	      SetRef(didAlter);

	      if (removed) {
	        SetRef(didChangeSize);
	        return; // undefined
	      }

	      if (keyMatch) {
	        if (ownerID && ownerID === this.ownerID) {
	          this.entry[1] = value;
	          return this;
	        }
	        return new ValueNode(ownerID, this.keyHash, [key, value]);
	      }

	      SetRef(didChangeSize);
	      return mergeIntoNode(this, ownerID, shift, hash(key), [key, value]);
	    };



	  // #pragma Iterators

	  ArrayMapNode.prototype.iterate =
	  HashCollisionNode.prototype.iterate = function (fn, reverse) {
	    var entries = this.entries;
	    for (var ii = 0, maxIndex = entries.length - 1; ii <= maxIndex; ii++) {
	      if (fn(entries[reverse ? maxIndex - ii : ii]) === false) {
	        return false;
	      }
	    }
	  }

	  BitmapIndexedNode.prototype.iterate =
	  HashArrayMapNode.prototype.iterate = function (fn, reverse) {
	    var nodes = this.nodes;
	    for (var ii = 0, maxIndex = nodes.length - 1; ii <= maxIndex; ii++) {
	      var node = nodes[reverse ? maxIndex - ii : ii];
	      if (node && node.iterate(fn, reverse) === false) {
	        return false;
	      }
	    }
	  }

	  ValueNode.prototype.iterate = function (fn, reverse) {
	    return fn(this.entry);
	  }

	  createClass(MapIterator, Iterator);

	    function MapIterator(map, type, reverse) {
	      this._type = type;
	      this._reverse = reverse;
	      this._stack = map._root && mapIteratorFrame(map._root);
	    }

	    MapIterator.prototype.next = function() {
	      var type = this._type;
	      var stack = this._stack;
	      while (stack) {
	        var node = stack.node;
	        var index = stack.index++;
	        var maxIndex;
	        if (node.entry) {
	          if (index === 0) {
	            return mapIteratorValue(type, node.entry);
	          }
	        } else if (node.entries) {
	          maxIndex = node.entries.length - 1;
	          if (index <= maxIndex) {
	            return mapIteratorValue(type, node.entries[this._reverse ? maxIndex - index : index]);
	          }
	        } else {
	          maxIndex = node.nodes.length - 1;
	          if (index <= maxIndex) {
	            var subNode = node.nodes[this._reverse ? maxIndex - index : index];
	            if (subNode) {
	              if (subNode.entry) {
	                return mapIteratorValue(type, subNode.entry);
	              }
	              stack = this._stack = mapIteratorFrame(subNode, stack);
	            }
	            continue;
	          }
	        }
	        stack = this._stack = this._stack.__prev;
	      }
	      return iteratorDone();
	    };


	  function mapIteratorValue(type, entry) {
	    return iteratorValue(type, entry[0], entry[1]);
	  }

	  function mapIteratorFrame(node, prev) {
	    return {
	      node: node,
	      index: 0,
	      __prev: prev
	    };
	  }

	  function makeMap(size, root, ownerID, hash) {
	    var map = Object.create(MapPrototype);
	    map.size = size;
	    map._root = root;
	    map.__ownerID = ownerID;
	    map.__hash = hash;
	    map.__altered = false;
	    return map;
	  }

	  var EMPTY_MAP;
	  function emptyMap() {
	    return EMPTY_MAP || (EMPTY_MAP = makeMap(0));
	  }

	  function updateMap(map, k, v) {
	    var newRoot;
	    var newSize;
	    if (!map._root) {
	      if (v === NOT_SET) {
	        return map;
	      }
	      newSize = 1;
	      newRoot = new ArrayMapNode(map.__ownerID, [[k, v]]);
	    } else {
	      var didChangeSize = MakeRef(CHANGE_LENGTH);
	      var didAlter = MakeRef(DID_ALTER);
	      newRoot = updateNode(map._root, map.__ownerID, 0, undefined, k, v, didChangeSize, didAlter);
	      if (!didAlter.value) {
	        return map;
	      }
	      newSize = map.size + (didChangeSize.value ? v === NOT_SET ? -1 : 1 : 0);
	    }
	    if (map.__ownerID) {
	      map.size = newSize;
	      map._root = newRoot;
	      map.__hash = undefined;
	      map.__altered = true;
	      return map;
	    }
	    return newRoot ? makeMap(newSize, newRoot) : emptyMap();
	  }

	  function updateNode(node, ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
	    if (!node) {
	      if (value === NOT_SET) {
	        return node;
	      }
	      SetRef(didAlter);
	      SetRef(didChangeSize);
	      return new ValueNode(ownerID, keyHash, [key, value]);
	    }
	    return node.update(ownerID, shift, keyHash, key, value, didChangeSize, didAlter);
	  }

	  function isLeafNode(node) {
	    return node.constructor === ValueNode || node.constructor === HashCollisionNode;
	  }

	  function mergeIntoNode(node, ownerID, shift, keyHash, entry) {
	    if (node.keyHash === keyHash) {
	      return new HashCollisionNode(ownerID, keyHash, [node.entry, entry]);
	    }

	    var idx1 = (shift === 0 ? node.keyHash : node.keyHash >>> shift) & MASK;
	    var idx2 = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;

	    var newNode;
	    var nodes = idx1 === idx2 ?
	      [mergeIntoNode(node, ownerID, shift + SHIFT, keyHash, entry)] :
	      ((newNode = new ValueNode(ownerID, keyHash, entry)), idx1 < idx2 ? [node, newNode] : [newNode, node]);

	    return new BitmapIndexedNode(ownerID, (1 << idx1) | (1 << idx2), nodes);
	  }

	  function createNodes(ownerID, entries, key, value) {
	    if (!ownerID) {
	      ownerID = new OwnerID();
	    }
	    var node = new ValueNode(ownerID, hash(key), [key, value]);
	    for (var ii = 0; ii < entries.length; ii++) {
	      var entry = entries[ii];
	      node = node.update(ownerID, 0, undefined, entry[0], entry[1]);
	    }
	    return node;
	  }

	  function packNodes(ownerID, nodes, count, excluding) {
	    var bitmap = 0;
	    var packedII = 0;
	    var packedNodes = new Array(count);
	    for (var ii = 0, bit = 1, len = nodes.length; ii < len; ii++, bit <<= 1) {
	      var node = nodes[ii];
	      if (node !== undefined && ii !== excluding) {
	        bitmap |= bit;
	        packedNodes[packedII++] = node;
	      }
	    }
	    return new BitmapIndexedNode(ownerID, bitmap, packedNodes);
	  }

	  function expandNodes(ownerID, nodes, bitmap, including, node) {
	    var count = 0;
	    var expandedNodes = new Array(SIZE);
	    for (var ii = 0; bitmap !== 0; ii++, bitmap >>>= 1) {
	      expandedNodes[ii] = bitmap & 1 ? nodes[count++] : undefined;
	    }
	    expandedNodes[including] = node;
	    return new HashArrayMapNode(ownerID, count + 1, expandedNodes);
	  }

	  function mergeIntoMapWith(map, merger, iterables) {
	    var iters = [];
	    for (var ii = 0; ii < iterables.length; ii++) {
	      var value = iterables[ii];
	      var iter = KeyedIterable(value);
	      if (!isIterable(value)) {
	        iter = iter.map(function(v ) {return fromJS(v)});
	      }
	      iters.push(iter);
	    }
	    return mergeIntoCollectionWith(map, merger, iters);
	  }

	  function deepMerger(existing, value, key) {
	    return existing && existing.mergeDeep && isIterable(value) ?
	      existing.mergeDeep(value) :
	      is(existing, value) ? existing : value;
	  }

	  function deepMergerWith(merger) {
	    return function(existing, value, key)  {
	      if (existing && existing.mergeDeepWith && isIterable(value)) {
	        return existing.mergeDeepWith(merger, value);
	      }
	      var nextValue = merger(existing, value, key);
	      return is(existing, nextValue) ? existing : nextValue;
	    };
	  }

	  function mergeIntoCollectionWith(collection, merger, iters) {
	    iters = iters.filter(function(x ) {return x.size !== 0});
	    if (iters.length === 0) {
	      return collection;
	    }
	    if (collection.size === 0 && !collection.__ownerID && iters.length === 1) {
	      return collection.constructor(iters[0]);
	    }
	    return collection.withMutations(function(collection ) {
	      var mergeIntoMap = merger ?
	        function(value, key)  {
	          collection.update(key, NOT_SET, function(existing )
	            {return existing === NOT_SET ? value : merger(existing, value, key)}
	          );
	        } :
	        function(value, key)  {
	          collection.set(key, value);
	        }
	      for (var ii = 0; ii < iters.length; ii++) {
	        iters[ii].forEach(mergeIntoMap);
	      }
	    });
	  }

	  function updateInDeepMap(existing, keyPathIter, notSetValue, updater) {
	    var isNotSet = existing === NOT_SET;
	    var step = keyPathIter.next();
	    if (step.done) {
	      var existingValue = isNotSet ? notSetValue : existing;
	      var newValue = updater(existingValue);
	      return newValue === existingValue ? existing : newValue;
	    }
	    invariant(
	      isNotSet || (existing && existing.set),
	      'invalid keyPath'
	    );
	    var key = step.value;
	    var nextExisting = isNotSet ? NOT_SET : existing.get(key, NOT_SET);
	    var nextUpdated = updateInDeepMap(
	      nextExisting,
	      keyPathIter,
	      notSetValue,
	      updater
	    );
	    return nextUpdated === nextExisting ? existing :
	      nextUpdated === NOT_SET ? existing.remove(key) :
	      (isNotSet ? emptyMap() : existing).set(key, nextUpdated);
	  }

	  function popCount(x) {
	    x = x - ((x >> 1) & 0x55555555);
	    x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
	    x = (x + (x >> 4)) & 0x0f0f0f0f;
	    x = x + (x >> 8);
	    x = x + (x >> 16);
	    return x & 0x7f;
	  }

	  function setIn(array, idx, val, canEdit) {
	    var newArray = canEdit ? array : arrCopy(array);
	    newArray[idx] = val;
	    return newArray;
	  }

	  function spliceIn(array, idx, val, canEdit) {
	    var newLen = array.length + 1;
	    if (canEdit && idx + 1 === newLen) {
	      array[idx] = val;
	      return array;
	    }
	    var newArray = new Array(newLen);
	    var after = 0;
	    for (var ii = 0; ii < newLen; ii++) {
	      if (ii === idx) {
	        newArray[ii] = val;
	        after = -1;
	      } else {
	        newArray[ii] = array[ii + after];
	      }
	    }
	    return newArray;
	  }

	  function spliceOut(array, idx, canEdit) {
	    var newLen = array.length - 1;
	    if (canEdit && idx === newLen) {
	      array.pop();
	      return array;
	    }
	    var newArray = new Array(newLen);
	    var after = 0;
	    for (var ii = 0; ii < newLen; ii++) {
	      if (ii === idx) {
	        after = 1;
	      }
	      newArray[ii] = array[ii + after];
	    }
	    return newArray;
	  }

	  var MAX_ARRAY_MAP_SIZE = SIZE / 4;
	  var MAX_BITMAP_INDEXED_SIZE = SIZE / 2;
	  var MIN_HASH_ARRAY_MAP_SIZE = SIZE / 4;

	  createClass(List, IndexedCollection);

	    // @pragma Construction

	    function List(value) {
	      var empty = emptyList();
	      if (value === null || value === undefined) {
	        return empty;
	      }
	      if (isList(value)) {
	        return value;
	      }
	      var iter = IndexedIterable(value);
	      var size = iter.size;
	      if (size === 0) {
	        return empty;
	      }
	      assertNotInfinite(size);
	      if (size > 0 && size < SIZE) {
	        return makeList(0, size, SHIFT, null, new VNode(iter.toArray()));
	      }
	      return empty.withMutations(function(list ) {
	        list.setSize(size);
	        iter.forEach(function(v, i)  {return list.set(i, v)});
	      });
	    }

	    List.of = function(/*...values*/) {
	      return this(arguments);
	    };

	    List.prototype.toString = function() {
	      return this.__toString('List [', ']');
	    };

	    // @pragma Access

	    List.prototype.get = function(index, notSetValue) {
	      index = wrapIndex(this, index);
	      if (index >= 0 && index < this.size) {
	        index += this._origin;
	        var node = listNodeFor(this, index);
	        return node && node.array[index & MASK];
	      }
	      return notSetValue;
	    };

	    // @pragma Modification

	    List.prototype.set = function(index, value) {
	      return updateList(this, index, value);
	    };

	    List.prototype.remove = function(index) {
	      return !this.has(index) ? this :
	        index === 0 ? this.shift() :
	        index === this.size - 1 ? this.pop() :
	        this.splice(index, 1);
	    };

	    List.prototype.insert = function(index, value) {
	      return this.splice(index, 0, value);
	    };

	    List.prototype.clear = function() {
	      if (this.size === 0) {
	        return this;
	      }
	      if (this.__ownerID) {
	        this.size = this._origin = this._capacity = 0;
	        this._level = SHIFT;
	        this._root = this._tail = null;
	        this.__hash = undefined;
	        this.__altered = true;
	        return this;
	      }
	      return emptyList();
	    };

	    List.prototype.push = function(/*...values*/) {
	      var values = arguments;
	      var oldSize = this.size;
	      return this.withMutations(function(list ) {
	        setListBounds(list, 0, oldSize + values.length);
	        for (var ii = 0; ii < values.length; ii++) {
	          list.set(oldSize + ii, values[ii]);
	        }
	      });
	    };

	    List.prototype.pop = function() {
	      return setListBounds(this, 0, -1);
	    };

	    List.prototype.unshift = function(/*...values*/) {
	      var values = arguments;
	      return this.withMutations(function(list ) {
	        setListBounds(list, -values.length);
	        for (var ii = 0; ii < values.length; ii++) {
	          list.set(ii, values[ii]);
	        }
	      });
	    };

	    List.prototype.shift = function() {
	      return setListBounds(this, 1);
	    };

	    // @pragma Composition

	    List.prototype.merge = function(/*...iters*/) {
	      return mergeIntoListWith(this, undefined, arguments);
	    };

	    List.prototype.mergeWith = function(merger) {var iters = SLICE$0.call(arguments, 1);
	      return mergeIntoListWith(this, merger, iters);
	    };

	    List.prototype.mergeDeep = function(/*...iters*/) {
	      return mergeIntoListWith(this, deepMerger, arguments);
	    };

	    List.prototype.mergeDeepWith = function(merger) {var iters = SLICE$0.call(arguments, 1);
	      return mergeIntoListWith(this, deepMergerWith(merger), iters);
	    };

	    List.prototype.setSize = function(size) {
	      return setListBounds(this, 0, size);
	    };

	    // @pragma Iteration

	    List.prototype.slice = function(begin, end) {
	      var size = this.size;
	      if (wholeSlice(begin, end, size)) {
	        return this;
	      }
	      return setListBounds(
	        this,
	        resolveBegin(begin, size),
	        resolveEnd(end, size)
	      );
	    };

	    List.prototype.__iterator = function(type, reverse) {
	      var index = 0;
	      var values = iterateList(this, reverse);
	      return new Iterator(function()  {
	        var value = values();
	        return value === DONE ?
	          iteratorDone() :
	          iteratorValue(type, index++, value);
	      });
	    };

	    List.prototype.__iterate = function(fn, reverse) {
	      var index = 0;
	      var values = iterateList(this, reverse);
	      var value;
	      while ((value = values()) !== DONE) {
	        if (fn(value, index++, this) === false) {
	          break;
	        }
	      }
	      return index;
	    };

	    List.prototype.__ensureOwner = function(ownerID) {
	      if (ownerID === this.__ownerID) {
	        return this;
	      }
	      if (!ownerID) {
	        this.__ownerID = ownerID;
	        return this;
	      }
	      return makeList(this._origin, this._capacity, this._level, this._root, this._tail, ownerID, this.__hash);
	    };


	  function isList(maybeList) {
	    return !!(maybeList && maybeList[IS_LIST_SENTINEL]);
	  }

	  List.isList = isList;

	  var IS_LIST_SENTINEL = '@@__IMMUTABLE_LIST__@@';

	  var ListPrototype = List.prototype;
	  ListPrototype[IS_LIST_SENTINEL] = true;
	  ListPrototype[DELETE] = ListPrototype.remove;
	  ListPrototype.setIn = MapPrototype.setIn;
	  ListPrototype.deleteIn =
	  ListPrototype.removeIn = MapPrototype.removeIn;
	  ListPrototype.update = MapPrototype.update;
	  ListPrototype.updateIn = MapPrototype.updateIn;
	  ListPrototype.mergeIn = MapPrototype.mergeIn;
	  ListPrototype.mergeDeepIn = MapPrototype.mergeDeepIn;
	  ListPrototype.withMutations = MapPrototype.withMutations;
	  ListPrototype.asMutable = MapPrototype.asMutable;
	  ListPrototype.asImmutable = MapPrototype.asImmutable;
	  ListPrototype.wasAltered = MapPrototype.wasAltered;



	    function VNode(array, ownerID) {
	      this.array = array;
	      this.ownerID = ownerID;
	    }

	    // TODO: seems like these methods are very similar

	    VNode.prototype.removeBefore = function(ownerID, level, index) {
	      if (index === level ? 1 << level : 0 || this.array.length === 0) {
	        return this;
	      }
	      var originIndex = (index >>> level) & MASK;
	      if (originIndex >= this.array.length) {
	        return new VNode([], ownerID);
	      }
	      var removingFirst = originIndex === 0;
	      var newChild;
	      if (level > 0) {
	        var oldChild = this.array[originIndex];
	        newChild = oldChild && oldChild.removeBefore(ownerID, level - SHIFT, index);
	        if (newChild === oldChild && removingFirst) {
	          return this;
	        }
	      }
	      if (removingFirst && !newChild) {
	        return this;
	      }
	      var editable = editableVNode(this, ownerID);
	      if (!removingFirst) {
	        for (var ii = 0; ii < originIndex; ii++) {
	          editable.array[ii] = undefined;
	        }
	      }
	      if (newChild) {
	        editable.array[originIndex] = newChild;
	      }
	      return editable;
	    };

	    VNode.prototype.removeAfter = function(ownerID, level, index) {
	      if (index === (level ? 1 << level : 0) || this.array.length === 0) {
	        return this;
	      }
	      var sizeIndex = ((index - 1) >>> level) & MASK;
	      if (sizeIndex >= this.array.length) {
	        return this;
	      }

	      var newChild;
	      if (level > 0) {
	        var oldChild = this.array[sizeIndex];
	        newChild = oldChild && oldChild.removeAfter(ownerID, level - SHIFT, index);
	        if (newChild === oldChild && sizeIndex === this.array.length - 1) {
	          return this;
	        }
	      }

	      var editable = editableVNode(this, ownerID);
	      editable.array.splice(sizeIndex + 1);
	      if (newChild) {
	        editable.array[sizeIndex] = newChild;
	      }
	      return editable;
	    };



	  var DONE = {};

	  function iterateList(list, reverse) {
	    var left = list._origin;
	    var right = list._capacity;
	    var tailPos = getTailOffset(right);
	    var tail = list._tail;

	    return iterateNodeOrLeaf(list._root, list._level, 0);

	    function iterateNodeOrLeaf(node, level, offset) {
	      return level === 0 ?
	        iterateLeaf(node, offset) :
	        iterateNode(node, level, offset);
	    }

	    function iterateLeaf(node, offset) {
	      var array = offset === tailPos ? tail && tail.array : node && node.array;
	      var from = offset > left ? 0 : left - offset;
	      var to = right - offset;
	      if (to > SIZE) {
	        to = SIZE;
	      }
	      return function()  {
	        if (from === to) {
	          return DONE;
	        }
	        var idx = reverse ? --to : from++;
	        return array && array[idx];
	      };
	    }

	    function iterateNode(node, level, offset) {
	      var values;
	      var array = node && node.array;
	      var from = offset > left ? 0 : (left - offset) >> level;
	      var to = ((right - offset) >> level) + 1;
	      if (to > SIZE) {
	        to = SIZE;
	      }
	      return function()  {
	        do {
	          if (values) {
	            var value = values();
	            if (value !== DONE) {
	              return value;
	            }
	            values = null;
	          }
	          if (from === to) {
	            return DONE;
	          }
	          var idx = reverse ? --to : from++;
	          values = iterateNodeOrLeaf(
	            array && array[idx], level - SHIFT, offset + (idx << level)
	          );
	        } while (true);
	      };
	    }
	  }

	  function makeList(origin, capacity, level, root, tail, ownerID, hash) {
	    var list = Object.create(ListPrototype);
	    list.size = capacity - origin;
	    list._origin = origin;
	    list._capacity = capacity;
	    list._level = level;
	    list._root = root;
	    list._tail = tail;
	    list.__ownerID = ownerID;
	    list.__hash = hash;
	    list.__altered = false;
	    return list;
	  }

	  var EMPTY_LIST;
	  function emptyList() {
	    return EMPTY_LIST || (EMPTY_LIST = makeList(0, 0, SHIFT));
	  }

	  function updateList(list, index, value) {
	    index = wrapIndex(list, index);

	    if (index !== index) {
	      return list;
	    }

	    if (index >= list.size || index < 0) {
	      return list.withMutations(function(list ) {
	        index < 0 ?
	          setListBounds(list, index).set(0, value) :
	          setListBounds(list, 0, index + 1).set(index, value)
	      });
	    }

	    index += list._origin;

	    var newTail = list._tail;
	    var newRoot = list._root;
	    var didAlter = MakeRef(DID_ALTER);
	    if (index >= getTailOffset(list._capacity)) {
	      newTail = updateVNode(newTail, list.__ownerID, 0, index, value, didAlter);
	    } else {
	      newRoot = updateVNode(newRoot, list.__ownerID, list._level, index, value, didAlter);
	    }

	    if (!didAlter.value) {
	      return list;
	    }

	    if (list.__ownerID) {
	      list._root = newRoot;
	      list._tail = newTail;
	      list.__hash = undefined;
	      list.__altered = true;
	      return list;
	    }
	    return makeList(list._origin, list._capacity, list._level, newRoot, newTail);
	  }

	  function updateVNode(node, ownerID, level, index, value, didAlter) {
	    var idx = (index >>> level) & MASK;
	    var nodeHas = node && idx < node.array.length;
	    if (!nodeHas && value === undefined) {
	      return node;
	    }

	    var newNode;

	    if (level > 0) {
	      var lowerNode = node && node.array[idx];
	      var newLowerNode = updateVNode(lowerNode, ownerID, level - SHIFT, index, value, didAlter);
	      if (newLowerNode === lowerNode) {
	        return node;
	      }
	      newNode = editableVNode(node, ownerID);
	      newNode.array[idx] = newLowerNode;
	      return newNode;
	    }

	    if (nodeHas && node.array[idx] === value) {
	      return node;
	    }

	    SetRef(didAlter);

	    newNode = editableVNode(node, ownerID);
	    if (value === undefined && idx === newNode.array.length - 1) {
	      newNode.array.pop();
	    } else {
	      newNode.array[idx] = value;
	    }
	    return newNode;
	  }

	  function editableVNode(node, ownerID) {
	    if (ownerID && node && ownerID === node.ownerID) {
	      return node;
	    }
	    return new VNode(node ? node.array.slice() : [], ownerID);
	  }

	  function listNodeFor(list, rawIndex) {
	    if (rawIndex >= getTailOffset(list._capacity)) {
	      return list._tail;
	    }
	    if (rawIndex < 1 << (list._level + SHIFT)) {
	      var node = list._root;
	      var level = list._level;
	      while (node && level > 0) {
	        node = node.array[(rawIndex >>> level) & MASK];
	        level -= SHIFT;
	      }
	      return node;
	    }
	  }

	  function setListBounds(list, begin, end) {
	    // Sanitize begin & end using this shorthand for ToInt32(argument)
	    // http://www.ecma-international.org/ecma-262/6.0/#sec-toint32
	    if (begin !== undefined) {
	      begin = begin | 0;
	    }
	    if (end !== undefined) {
	      end = end | 0;
	    }
	    var owner = list.__ownerID || new OwnerID();
	    var oldOrigin = list._origin;
	    var oldCapacity = list._capacity;
	    var newOrigin = oldOrigin + begin;
	    var newCapacity = end === undefined ? oldCapacity : end < 0 ? oldCapacity + end : oldOrigin + end;
	    if (newOrigin === oldOrigin && newCapacity === oldCapacity) {
	      return list;
	    }

	    // If it's going to end after it starts, it's empty.
	    if (newOrigin >= newCapacity) {
	      return list.clear();
	    }

	    var newLevel = list._level;
	    var newRoot = list._root;

	    // New origin might need creating a higher root.
	    var offsetShift = 0;
	    while (newOrigin + offsetShift < 0) {
	      newRoot = new VNode(newRoot && newRoot.array.length ? [undefined, newRoot] : [], owner);
	      newLevel += SHIFT;
	      offsetShift += 1 << newLevel;
	    }
	    if (offsetShift) {
	      newOrigin += offsetShift;
	      oldOrigin += offsetShift;
	      newCapacity += offsetShift;
	      oldCapacity += offsetShift;
	    }

	    var oldTailOffset = getTailOffset(oldCapacity);
	    var newTailOffset = getTailOffset(newCapacity);

	    // New size might need creating a higher root.
	    while (newTailOffset >= 1 << (newLevel + SHIFT)) {
	      newRoot = new VNode(newRoot && newRoot.array.length ? [newRoot] : [], owner);
	      newLevel += SHIFT;
	    }

	    // Locate or create the new tail.
	    var oldTail = list._tail;
	    var newTail = newTailOffset < oldTailOffset ?
	      listNodeFor(list, newCapacity - 1) :
	      newTailOffset > oldTailOffset ? new VNode([], owner) : oldTail;

	    // Merge Tail into tree.
	    if (oldTail && newTailOffset > oldTailOffset && newOrigin < oldCapacity && oldTail.array.length) {
	      newRoot = editableVNode(newRoot, owner);
	      var node = newRoot;
	      for (var level = newLevel; level > SHIFT; level -= SHIFT) {
	        var idx = (oldTailOffset >>> level) & MASK;
	        node = node.array[idx] = editableVNode(node.array[idx], owner);
	      }
	      node.array[(oldTailOffset >>> SHIFT) & MASK] = oldTail;
	    }

	    // If the size has been reduced, there's a chance the tail needs to be trimmed.
	    if (newCapacity < oldCapacity) {
	      newTail = newTail && newTail.removeAfter(owner, 0, newCapacity);
	    }

	    // If the new origin is within the tail, then we do not need a root.
	    if (newOrigin >= newTailOffset) {
	      newOrigin -= newTailOffset;
	      newCapacity -= newTailOffset;
	      newLevel = SHIFT;
	      newRoot = null;
	      newTail = newTail && newTail.removeBefore(owner, 0, newOrigin);

	    // Otherwise, if the root has been trimmed, garbage collect.
	    } else if (newOrigin > oldOrigin || newTailOffset < oldTailOffset) {
	      offsetShift = 0;

	      // Identify the new top root node of the subtree of the old root.
	      while (newRoot) {
	        var beginIndex = (newOrigin >>> newLevel) & MASK;
	        if (beginIndex !== (newTailOffset >>> newLevel) & MASK) {
	          break;
	        }
	        if (beginIndex) {
	          offsetShift += (1 << newLevel) * beginIndex;
	        }
	        newLevel -= SHIFT;
	        newRoot = newRoot.array[beginIndex];
	      }

	      // Trim the new sides of the new root.
	      if (newRoot && newOrigin > oldOrigin) {
	        newRoot = newRoot.removeBefore(owner, newLevel, newOrigin - offsetShift);
	      }
	      if (newRoot && newTailOffset < oldTailOffset) {
	        newRoot = newRoot.removeAfter(owner, newLevel, newTailOffset - offsetShift);
	      }
	      if (offsetShift) {
	        newOrigin -= offsetShift;
	        newCapacity -= offsetShift;
	      }
	    }

	    if (list.__ownerID) {
	      list.size = newCapacity - newOrigin;
	      list._origin = newOrigin;
	      list._capacity = newCapacity;
	      list._level = newLevel;
	      list._root = newRoot;
	      list._tail = newTail;
	      list.__hash = undefined;
	      list.__altered = true;
	      return list;
	    }
	    return makeList(newOrigin, newCapacity, newLevel, newRoot, newTail);
	  }

	  function mergeIntoListWith(list, merger, iterables) {
	    var iters = [];
	    var maxSize = 0;
	    for (var ii = 0; ii < iterables.length; ii++) {
	      var value = iterables[ii];
	      var iter = IndexedIterable(value);
	      if (iter.size > maxSize) {
	        maxSize = iter.size;
	      }
	      if (!isIterable(value)) {
	        iter = iter.map(function(v ) {return fromJS(v)});
	      }
	      iters.push(iter);
	    }
	    if (maxSize > list.size) {
	      list = list.setSize(maxSize);
	    }
	    return mergeIntoCollectionWith(list, merger, iters);
	  }

	  function getTailOffset(size) {
	    return size < SIZE ? 0 : (((size - 1) >>> SHIFT) << SHIFT);
	  }

	  createClass(OrderedMap, Map);

	    // @pragma Construction

	    function OrderedMap(value) {
	      return value === null || value === undefined ? emptyOrderedMap() :
	        isOrderedMap(value) ? value :
	        emptyOrderedMap().withMutations(function(map ) {
	          var iter = KeyedIterable(value);
	          assertNotInfinite(iter.size);
	          iter.forEach(function(v, k)  {return map.set(k, v)});
	        });
	    }

	    OrderedMap.of = function(/*...values*/) {
	      return this(arguments);
	    };

	    OrderedMap.prototype.toString = function() {
	      return this.__toString('OrderedMap {', '}');
	    };

	    // @pragma Access

	    OrderedMap.prototype.get = function(k, notSetValue) {
	      var index = this._map.get(k);
	      return index !== undefined ? this._list.get(index)[1] : notSetValue;
	    };

	    // @pragma Modification

	    OrderedMap.prototype.clear = function() {
	      if (this.size === 0) {
	        return this;
	      }
	      if (this.__ownerID) {
	        this.size = 0;
	        this._map.clear();
	        this._list.clear();
	        return this;
	      }
	      return emptyOrderedMap();
	    };

	    OrderedMap.prototype.set = function(k, v) {
	      return updateOrderedMap(this, k, v);
	    };

	    OrderedMap.prototype.remove = function(k) {
	      return updateOrderedMap(this, k, NOT_SET);
	    };

	    OrderedMap.prototype.wasAltered = function() {
	      return this._map.wasAltered() || this._list.wasAltered();
	    };

	    OrderedMap.prototype.__iterate = function(fn, reverse) {var this$0 = this;
	      return this._list.__iterate(
	        function(entry ) {return entry && fn(entry[1], entry[0], this$0)},
	        reverse
	      );
	    };

	    OrderedMap.prototype.__iterator = function(type, reverse) {
	      return this._list.fromEntrySeq().__iterator(type, reverse);
	    };

	    OrderedMap.prototype.__ensureOwner = function(ownerID) {
	      if (ownerID === this.__ownerID) {
	        return this;
	      }
	      var newMap = this._map.__ensureOwner(ownerID);
	      var newList = this._list.__ensureOwner(ownerID);
	      if (!ownerID) {
	        this.__ownerID = ownerID;
	        this._map = newMap;
	        this._list = newList;
	        return this;
	      }
	      return makeOrderedMap(newMap, newList, ownerID, this.__hash);
	    };


	  function isOrderedMap(maybeOrderedMap) {
	    return isMap(maybeOrderedMap) && isOrdered(maybeOrderedMap);
	  }

	  OrderedMap.isOrderedMap = isOrderedMap;

	  OrderedMap.prototype[IS_ORDERED_SENTINEL] = true;
	  OrderedMap.prototype[DELETE] = OrderedMap.prototype.remove;



	  function makeOrderedMap(map, list, ownerID, hash) {
	    var omap = Object.create(OrderedMap.prototype);
	    omap.size = map ? map.size : 0;
	    omap._map = map;
	    omap._list = list;
	    omap.__ownerID = ownerID;
	    omap.__hash = hash;
	    return omap;
	  }

	  var EMPTY_ORDERED_MAP;
	  function emptyOrderedMap() {
	    return EMPTY_ORDERED_MAP || (EMPTY_ORDERED_MAP = makeOrderedMap(emptyMap(), emptyList()));
	  }

	  function updateOrderedMap(omap, k, v) {
	    var map = omap._map;
	    var list = omap._list;
	    var i = map.get(k);
	    var has = i !== undefined;
	    var newMap;
	    var newList;
	    if (v === NOT_SET) { // removed
	      if (!has) {
	        return omap;
	      }
	      if (list.size >= SIZE && list.size >= map.size * 2) {
	        newList = list.filter(function(entry, idx)  {return entry !== undefined && i !== idx});
	        newMap = newList.toKeyedSeq().map(function(entry ) {return entry[0]}).flip().toMap();
	        if (omap.__ownerID) {
	          newMap.__ownerID = newList.__ownerID = omap.__ownerID;
	        }
	      } else {
	        newMap = map.remove(k);
	        newList = i === list.size - 1 ? list.pop() : list.set(i, undefined);
	      }
	    } else {
	      if (has) {
	        if (v === list.get(i)[1]) {
	          return omap;
	        }
	        newMap = map;
	        newList = list.set(i, [k, v]);
	      } else {
	        newMap = map.set(k, list.size);
	        newList = list.set(list.size, [k, v]);
	      }
	    }
	    if (omap.__ownerID) {
	      omap.size = newMap.size;
	      omap._map = newMap;
	      omap._list = newList;
	      omap.__hash = undefined;
	      return omap;
	    }
	    return makeOrderedMap(newMap, newList);
	  }

	  createClass(ToKeyedSequence, KeyedSeq);
	    function ToKeyedSequence(indexed, useKeys) {
	      this._iter = indexed;
	      this._useKeys = useKeys;
	      this.size = indexed.size;
	    }

	    ToKeyedSequence.prototype.get = function(key, notSetValue) {
	      return this._iter.get(key, notSetValue);
	    };

	    ToKeyedSequence.prototype.has = function(key) {
	      return this._iter.has(key);
	    };

	    ToKeyedSequence.prototype.valueSeq = function() {
	      return this._iter.valueSeq();
	    };

	    ToKeyedSequence.prototype.reverse = function() {var this$0 = this;
	      var reversedSequence = reverseFactory(this, true);
	      if (!this._useKeys) {
	        reversedSequence.valueSeq = function()  {return this$0._iter.toSeq().reverse()};
	      }
	      return reversedSequence;
	    };

	    ToKeyedSequence.prototype.map = function(mapper, context) {var this$0 = this;
	      var mappedSequence = mapFactory(this, mapper, context);
	      if (!this._useKeys) {
	        mappedSequence.valueSeq = function()  {return this$0._iter.toSeq().map(mapper, context)};
	      }
	      return mappedSequence;
	    };

	    ToKeyedSequence.prototype.__iterate = function(fn, reverse) {var this$0 = this;
	      var ii;
	      return this._iter.__iterate(
	        this._useKeys ?
	          function(v, k)  {return fn(v, k, this$0)} :
	          ((ii = reverse ? resolveSize(this) : 0),
	            function(v ) {return fn(v, reverse ? --ii : ii++, this$0)}),
	        reverse
	      );
	    };

	    ToKeyedSequence.prototype.__iterator = function(type, reverse) {
	      if (this._useKeys) {
	        return this._iter.__iterator(type, reverse);
	      }
	      var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
	      var ii = reverse ? resolveSize(this) : 0;
	      return new Iterator(function()  {
	        var step = iterator.next();
	        return step.done ? step :
	          iteratorValue(type, reverse ? --ii : ii++, step.value, step);
	      });
	    };

	  ToKeyedSequence.prototype[IS_ORDERED_SENTINEL] = true;


	  createClass(ToIndexedSequence, IndexedSeq);
	    function ToIndexedSequence(iter) {
	      this._iter = iter;
	      this.size = iter.size;
	    }

	    ToIndexedSequence.prototype.includes = function(value) {
	      return this._iter.includes(value);
	    };

	    ToIndexedSequence.prototype.__iterate = function(fn, reverse) {var this$0 = this;
	      var iterations = 0;
	      return this._iter.__iterate(function(v ) {return fn(v, iterations++, this$0)}, reverse);
	    };

	    ToIndexedSequence.prototype.__iterator = function(type, reverse) {
	      var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
	      var iterations = 0;
	      return new Iterator(function()  {
	        var step = iterator.next();
	        return step.done ? step :
	          iteratorValue(type, iterations++, step.value, step)
	      });
	    };



	  createClass(ToSetSequence, SetSeq);
	    function ToSetSequence(iter) {
	      this._iter = iter;
	      this.size = iter.size;
	    }

	    ToSetSequence.prototype.has = function(key) {
	      return this._iter.includes(key);
	    };

	    ToSetSequence.prototype.__iterate = function(fn, reverse) {var this$0 = this;
	      return this._iter.__iterate(function(v ) {return fn(v, v, this$0)}, reverse);
	    };

	    ToSetSequence.prototype.__iterator = function(type, reverse) {
	      var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
	      return new Iterator(function()  {
	        var step = iterator.next();
	        return step.done ? step :
	          iteratorValue(type, step.value, step.value, step);
	      });
	    };



	  createClass(FromEntriesSequence, KeyedSeq);
	    function FromEntriesSequence(entries) {
	      this._iter = entries;
	      this.size = entries.size;
	    }

	    FromEntriesSequence.prototype.entrySeq = function() {
	      return this._iter.toSeq();
	    };

	    FromEntriesSequence.prototype.__iterate = function(fn, reverse) {var this$0 = this;
	      return this._iter.__iterate(function(entry ) {
	        // Check if entry exists first so array access doesn't throw for holes
	        // in the parent iteration.
	        if (entry) {
	          validateEntry(entry);
	          var indexedIterable = isIterable(entry);
	          return fn(
	            indexedIterable ? entry.get(1) : entry[1],
	            indexedIterable ? entry.get(0) : entry[0],
	            this$0
	          );
	        }
	      }, reverse);
	    };

	    FromEntriesSequence.prototype.__iterator = function(type, reverse) {
	      var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
	      return new Iterator(function()  {
	        while (true) {
	          var step = iterator.next();
	          if (step.done) {
	            return step;
	          }
	          var entry = step.value;
	          // Check if entry exists first so array access doesn't throw for holes
	          // in the parent iteration.
	          if (entry) {
	            validateEntry(entry);
	            var indexedIterable = isIterable(entry);
	            return iteratorValue(
	              type,
	              indexedIterable ? entry.get(0) : entry[0],
	              indexedIterable ? entry.get(1) : entry[1],
	              step
	            );
	          }
	        }
	      });
	    };


	  ToIndexedSequence.prototype.cacheResult =
	  ToKeyedSequence.prototype.cacheResult =
	  ToSetSequence.prototype.cacheResult =
	  FromEntriesSequence.prototype.cacheResult =
	    cacheResultThrough;


	  function flipFactory(iterable) {
	    var flipSequence = makeSequence(iterable);
	    flipSequence._iter = iterable;
	    flipSequence.size = iterable.size;
	    flipSequence.flip = function()  {return iterable};
	    flipSequence.reverse = function () {
	      var reversedSequence = iterable.reverse.apply(this); // super.reverse()
	      reversedSequence.flip = function()  {return iterable.reverse()};
	      return reversedSequence;
	    };
	    flipSequence.has = function(key ) {return iterable.includes(key)};
	    flipSequence.includes = function(key ) {return iterable.has(key)};
	    flipSequence.cacheResult = cacheResultThrough;
	    flipSequence.__iterateUncached = function (fn, reverse) {var this$0 = this;
	      return iterable.__iterate(function(v, k)  {return fn(k, v, this$0) !== false}, reverse);
	    }
	    flipSequence.__iteratorUncached = function(type, reverse) {
	      if (type === ITERATE_ENTRIES) {
	        var iterator = iterable.__iterator(type, reverse);
	        return new Iterator(function()  {
	          var step = iterator.next();
	          if (!step.done) {
	            var k = step.value[0];
	            step.value[0] = step.value[1];
	            step.value[1] = k;
	          }
	          return step;
	        });
	      }
	      return iterable.__iterator(
	        type === ITERATE_VALUES ? ITERATE_KEYS : ITERATE_VALUES,
	        reverse
	      );
	    }
	    return flipSequence;
	  }


	  function mapFactory(iterable, mapper, context) {
	    var mappedSequence = makeSequence(iterable);
	    mappedSequence.size = iterable.size;
	    mappedSequence.has = function(key ) {return iterable.has(key)};
	    mappedSequence.get = function(key, notSetValue)  {
	      var v = iterable.get(key, NOT_SET);
	      return v === NOT_SET ?
	        notSetValue :
	        mapper.call(context, v, key, iterable);
	    };
	    mappedSequence.__iterateUncached = function (fn, reverse) {var this$0 = this;
	      return iterable.__iterate(
	        function(v, k, c)  {return fn(mapper.call(context, v, k, c), k, this$0) !== false},
	        reverse
	      );
	    }
	    mappedSequence.__iteratorUncached = function (type, reverse) {
	      var iterator = iterable.__iterator(ITERATE_ENTRIES, reverse);
	      return new Iterator(function()  {
	        var step = iterator.next();
	        if (step.done) {
	          return step;
	        }
	        var entry = step.value;
	        var key = entry[0];
	        return iteratorValue(
	          type,
	          key,
	          mapper.call(context, entry[1], key, iterable),
	          step
	        );
	      });
	    }
	    return mappedSequence;
	  }


	  function reverseFactory(iterable, useKeys) {
	    var reversedSequence = makeSequence(iterable);
	    reversedSequence._iter = iterable;
	    reversedSequence.size = iterable.size;
	    reversedSequence.reverse = function()  {return iterable};
	    if (iterable.flip) {
	      reversedSequence.flip = function () {
	        var flipSequence = flipFactory(iterable);
	        flipSequence.reverse = function()  {return iterable.flip()};
	        return flipSequence;
	      };
	    }
	    reversedSequence.get = function(key, notSetValue) 
	      {return iterable.get(useKeys ? key : -1 - key, notSetValue)};
	    reversedSequence.has = function(key )
	      {return iterable.has(useKeys ? key : -1 - key)};
	    reversedSequence.includes = function(value ) {return iterable.includes(value)};
	    reversedSequence.cacheResult = cacheResultThrough;
	    reversedSequence.__iterate = function (fn, reverse) {var this$0 = this;
	      return iterable.__iterate(function(v, k)  {return fn(v, k, this$0)}, !reverse);
	    };
	    reversedSequence.__iterator =
	      function(type, reverse)  {return iterable.__iterator(type, !reverse)};
	    return reversedSequence;
	  }


	  function filterFactory(iterable, predicate, context, useKeys) {
	    var filterSequence = makeSequence(iterable);
	    if (useKeys) {
	      filterSequence.has = function(key ) {
	        var v = iterable.get(key, NOT_SET);
	        return v !== NOT_SET && !!predicate.call(context, v, key, iterable);
	      };
	      filterSequence.get = function(key, notSetValue)  {
	        var v = iterable.get(key, NOT_SET);
	        return v !== NOT_SET && predicate.call(context, v, key, iterable) ?
	          v : notSetValue;
	      };
	    }
	    filterSequence.__iterateUncached = function (fn, reverse) {var this$0 = this;
	      var iterations = 0;
	      iterable.__iterate(function(v, k, c)  {
	        if (predicate.call(context, v, k, c)) {
	          iterations++;
	          return fn(v, useKeys ? k : iterations - 1, this$0);
	        }
	      }, reverse);
	      return iterations;
	    };
	    filterSequence.__iteratorUncached = function (type, reverse) {
	      var iterator = iterable.__iterator(ITERATE_ENTRIES, reverse);
	      var iterations = 0;
	      return new Iterator(function()  {
	        while (true) {
	          var step = iterator.next();
	          if (step.done) {
	            return step;
	          }
	          var entry = step.value;
	          var key = entry[0];
	          var value = entry[1];
	          if (predicate.call(context, value, key, iterable)) {
	            return iteratorValue(type, useKeys ? key : iterations++, value, step);
	          }
	        }
	      });
	    }
	    return filterSequence;
	  }


	  function countByFactory(iterable, grouper, context) {
	    var groups = Map().asMutable();
	    iterable.__iterate(function(v, k)  {
	      groups.update(
	        grouper.call(context, v, k, iterable),
	        0,
	        function(a ) {return a + 1}
	      );
	    });
	    return groups.asImmutable();
	  }


	  function groupByFactory(iterable, grouper, context) {
	    var isKeyedIter = isKeyed(iterable);
	    var groups = (isOrdered(iterable) ? OrderedMap() : Map()).asMutable();
	    iterable.__iterate(function(v, k)  {
	      groups.update(
	        grouper.call(context, v, k, iterable),
	        function(a ) {return (a = a || [], a.push(isKeyedIter ? [k, v] : v), a)}
	      );
	    });
	    var coerce = iterableClass(iterable);
	    return groups.map(function(arr ) {return reify(iterable, coerce(arr))});
	  }


	  function sliceFactory(iterable, begin, end, useKeys) {
	    var originalSize = iterable.size;

	    // Sanitize begin & end using this shorthand for ToInt32(argument)
	    // http://www.ecma-international.org/ecma-262/6.0/#sec-toint32
	    if (begin !== undefined) {
	      begin = begin | 0;
	    }
	    if (end !== undefined) {
	      if (end === Infinity) {
	        end = originalSize;
	      } else {
	        end = end | 0;
	      }
	    }

	    if (wholeSlice(begin, end, originalSize)) {
	      return iterable;
	    }

	    var resolvedBegin = resolveBegin(begin, originalSize);
	    var resolvedEnd = resolveEnd(end, originalSize);

	    // begin or end will be NaN if they were provided as negative numbers and
	    // this iterable's size is unknown. In that case, cache first so there is
	    // a known size and these do not resolve to NaN.
	    if (resolvedBegin !== resolvedBegin || resolvedEnd !== resolvedEnd) {
	      return sliceFactory(iterable.toSeq().cacheResult(), begin, end, useKeys);
	    }

	    // Note: resolvedEnd is undefined when the original sequence's length is
	    // unknown and this slice did not supply an end and should contain all
	    // elements after resolvedBegin.
	    // In that case, resolvedSize will be NaN and sliceSize will remain undefined.
	    var resolvedSize = resolvedEnd - resolvedBegin;
	    var sliceSize;
	    if (resolvedSize === resolvedSize) {
	      sliceSize = resolvedSize < 0 ? 0 : resolvedSize;
	    }

	    var sliceSeq = makeSequence(iterable);

	    // If iterable.size is undefined, the size of the realized sliceSeq is
	    // unknown at this point unless the number of items to slice is 0
	    sliceSeq.size = sliceSize === 0 ? sliceSize : iterable.size && sliceSize || undefined;

	    if (!useKeys && isSeq(iterable) && sliceSize >= 0) {
	      sliceSeq.get = function (index, notSetValue) {
	        index = wrapIndex(this, index);
	        return index >= 0 && index < sliceSize ?
	          iterable.get(index + resolvedBegin, notSetValue) :
	          notSetValue;
	      }
	    }

	    sliceSeq.__iterateUncached = function(fn, reverse) {var this$0 = this;
	      if (sliceSize === 0) {
	        return 0;
	      }
	      if (reverse) {
	        return this.cacheResult().__iterate(fn, reverse);
	      }
	      var skipped = 0;
	      var isSkipping = true;
	      var iterations = 0;
	      iterable.__iterate(function(v, k)  {
	        if (!(isSkipping && (isSkipping = skipped++ < resolvedBegin))) {
	          iterations++;
	          return fn(v, useKeys ? k : iterations - 1, this$0) !== false &&
	                 iterations !== sliceSize;
	        }
	      });
	      return iterations;
	    };

	    sliceSeq.__iteratorUncached = function(type, reverse) {
	      if (sliceSize !== 0 && reverse) {
	        return this.cacheResult().__iterator(type, reverse);
	      }
	      // Don't bother instantiating parent iterator if taking 0.
	      var iterator = sliceSize !== 0 && iterable.__iterator(type, reverse);
	      var skipped = 0;
	      var iterations = 0;
	      return new Iterator(function()  {
	        while (skipped++ < resolvedBegin) {
	          iterator.next();
	        }
	        if (++iterations > sliceSize) {
	          return iteratorDone();
	        }
	        var step = iterator.next();
	        if (useKeys || type === ITERATE_VALUES) {
	          return step;
	        } else if (type === ITERATE_KEYS) {
	          return iteratorValue(type, iterations - 1, undefined, step);
	        } else {
	          return iteratorValue(type, iterations - 1, step.value[1], step);
	        }
	      });
	    }

	    return sliceSeq;
	  }


	  function takeWhileFactory(iterable, predicate, context) {
	    var takeSequence = makeSequence(iterable);
	    takeSequence.__iterateUncached = function(fn, reverse) {var this$0 = this;
	      if (reverse) {
	        return this.cacheResult().__iterate(fn, reverse);
	      }
	      var iterations = 0;
	      iterable.__iterate(function(v, k, c) 
	        {return predicate.call(context, v, k, c) && ++iterations && fn(v, k, this$0)}
	      );
	      return iterations;
	    };
	    takeSequence.__iteratorUncached = function(type, reverse) {var this$0 = this;
	      if (reverse) {
	        return this.cacheResult().__iterator(type, reverse);
	      }
	      var iterator = iterable.__iterator(ITERATE_ENTRIES, reverse);
	      var iterating = true;
	      return new Iterator(function()  {
	        if (!iterating) {
	          return iteratorDone();
	        }
	        var step = iterator.next();
	        if (step.done) {
	          return step;
	        }
	        var entry = step.value;
	        var k = entry[0];
	        var v = entry[1];
	        if (!predicate.call(context, v, k, this$0)) {
	          iterating = false;
	          return iteratorDone();
	        }
	        return type === ITERATE_ENTRIES ? step :
	          iteratorValue(type, k, v, step);
	      });
	    };
	    return takeSequence;
	  }


	  function skipWhileFactory(iterable, predicate, context, useKeys) {
	    var skipSequence = makeSequence(iterable);
	    skipSequence.__iterateUncached = function (fn, reverse) {var this$0 = this;
	      if (reverse) {
	        return this.cacheResult().__iterate(fn, reverse);
	      }
	      var isSkipping = true;
	      var iterations = 0;
	      iterable.__iterate(function(v, k, c)  {
	        if (!(isSkipping && (isSkipping = predicate.call(context, v, k, c)))) {
	          iterations++;
	          return fn(v, useKeys ? k : iterations - 1, this$0);
	        }
	      });
	      return iterations;
	    };
	    skipSequence.__iteratorUncached = function(type, reverse) {var this$0 = this;
	      if (reverse) {
	        return this.cacheResult().__iterator(type, reverse);
	      }
	      var iterator = iterable.__iterator(ITERATE_ENTRIES, reverse);
	      var skipping = true;
	      var iterations = 0;
	      return new Iterator(function()  {
	        var step, k, v;
	        do {
	          step = iterator.next();
	          if (step.done) {
	            if (useKeys || type === ITERATE_VALUES) {
	              return step;
	            } else if (type === ITERATE_KEYS) {
	              return iteratorValue(type, iterations++, undefined, step);
	            } else {
	              return iteratorValue(type, iterations++, step.value[1], step);
	            }
	          }
	          var entry = step.value;
	          k = entry[0];
	          v = entry[1];
	          skipping && (skipping = predicate.call(context, v, k, this$0));
	        } while (skipping);
	        return type === ITERATE_ENTRIES ? step :
	          iteratorValue(type, k, v, step);
	      });
	    };
	    return skipSequence;
	  }


	  function concatFactory(iterable, values) {
	    var isKeyedIterable = isKeyed(iterable);
	    var iters = [iterable].concat(values).map(function(v ) {
	      if (!isIterable(v)) {
	        v = isKeyedIterable ?
	          keyedSeqFromValue(v) :
	          indexedSeqFromValue(Array.isArray(v) ? v : [v]);
	      } else if (isKeyedIterable) {
	        v = KeyedIterable(v);
	      }
	      return v;
	    }).filter(function(v ) {return v.size !== 0});

	    if (iters.length === 0) {
	      return iterable;
	    }

	    if (iters.length === 1) {
	      var singleton = iters[0];
	      if (singleton === iterable ||
	          isKeyedIterable && isKeyed(singleton) ||
	          isIndexed(iterable) && isIndexed(singleton)) {
	        return singleton;
	      }
	    }

	    var concatSeq = new ArraySeq(iters);
	    if (isKeyedIterable) {
	      concatSeq = concatSeq.toKeyedSeq();
	    } else if (!isIndexed(iterable)) {
	      concatSeq = concatSeq.toSetSeq();
	    }
	    concatSeq = concatSeq.flatten(true);
	    concatSeq.size = iters.reduce(
	      function(sum, seq)  {
	        if (sum !== undefined) {
	          var size = seq.size;
	          if (size !== undefined) {
	            return sum + size;
	          }
	        }
	      },
	      0
	    );
	    return concatSeq;
	  }


	  function flattenFactory(iterable, depth, useKeys) {
	    var flatSequence = makeSequence(iterable);
	    flatSequence.__iterateUncached = function(fn, reverse) {
	      var iterations = 0;
	      var stopped = false;
	      function flatDeep(iter, currentDepth) {var this$0 = this;
	        iter.__iterate(function(v, k)  {
	          if ((!depth || currentDepth < depth) && isIterable(v)) {
	            flatDeep(v, currentDepth + 1);
	          } else if (fn(v, useKeys ? k : iterations++, this$0) === false) {
	            stopped = true;
	          }
	          return !stopped;
	        }, reverse);
	      }
	      flatDeep(iterable, 0);
	      return iterations;
	    }
	    flatSequence.__iteratorUncached = function(type, reverse) {
	      var iterator = iterable.__iterator(type, reverse);
	      var stack = [];
	      var iterations = 0;
	      return new Iterator(function()  {
	        while (iterator) {
	          var step = iterator.next();
	          if (step.done !== false) {
	            iterator = stack.pop();
	            continue;
	          }
	          var v = step.value;
	          if (type === ITERATE_ENTRIES) {
	            v = v[1];
	          }
	          if ((!depth || stack.length < depth) && isIterable(v)) {
	            stack.push(iterator);
	            iterator = v.__iterator(type, reverse);
	          } else {
	            return useKeys ? step : iteratorValue(type, iterations++, v, step);
	          }
	        }
	        return iteratorDone();
	      });
	    }
	    return flatSequence;
	  }


	  function flatMapFactory(iterable, mapper, context) {
	    var coerce = iterableClass(iterable);
	    return iterable.toSeq().map(
	      function(v, k)  {return coerce(mapper.call(context, v, k, iterable))}
	    ).flatten(true);
	  }


	  function interposeFactory(iterable, separator) {
	    var interposedSequence = makeSequence(iterable);
	    interposedSequence.size = iterable.size && iterable.size * 2 -1;
	    interposedSequence.__iterateUncached = function(fn, reverse) {var this$0 = this;
	      var iterations = 0;
	      iterable.__iterate(function(v, k) 
	        {return (!iterations || fn(separator, iterations++, this$0) !== false) &&
	        fn(v, iterations++, this$0) !== false},
	        reverse
	      );
	      return iterations;
	    };
	    interposedSequence.__iteratorUncached = function(type, reverse) {
	      var iterator = iterable.__iterator(ITERATE_VALUES, reverse);
	      var iterations = 0;
	      var step;
	      return new Iterator(function()  {
	        if (!step || iterations % 2) {
	          step = iterator.next();
	          if (step.done) {
	            return step;
	          }
	        }
	        return iterations % 2 ?
	          iteratorValue(type, iterations++, separator) :
	          iteratorValue(type, iterations++, step.value, step);
	      });
	    };
	    return interposedSequence;
	  }


	  function sortFactory(iterable, comparator, mapper) {
	    if (!comparator) {
	      comparator = defaultComparator;
	    }
	    var isKeyedIterable = isKeyed(iterable);
	    var index = 0;
	    var entries = iterable.toSeq().map(
	      function(v, k)  {return [k, v, index++, mapper ? mapper(v, k, iterable) : v]}
	    ).toArray();
	    entries.sort(function(a, b)  {return comparator(a[3], b[3]) || a[2] - b[2]}).forEach(
	      isKeyedIterable ?
	      function(v, i)  { entries[i].length = 2; } :
	      function(v, i)  { entries[i] = v[1]; }
	    );
	    return isKeyedIterable ? KeyedSeq(entries) :
	      isIndexed(iterable) ? IndexedSeq(entries) :
	      SetSeq(entries);
	  }


	  function maxFactory(iterable, comparator, mapper) {
	    if (!comparator) {
	      comparator = defaultComparator;
	    }
	    if (mapper) {
	      var entry = iterable.toSeq()
	        .map(function(v, k)  {return [v, mapper(v, k, iterable)]})
	        .reduce(function(a, b)  {return maxCompare(comparator, a[1], b[1]) ? b : a});
	      return entry && entry[0];
	    } else {
	      return iterable.reduce(function(a, b)  {return maxCompare(comparator, a, b) ? b : a});
	    }
	  }

	  function maxCompare(comparator, a, b) {
	    var comp = comparator(b, a);
	    // b is considered the new max if the comparator declares them equal, but
	    // they are not equal and b is in fact a nullish value.
	    return (comp === 0 && b !== a && (b === undefined || b === null || b !== b)) || comp > 0;
	  }


	  function zipWithFactory(keyIter, zipper, iters) {
	    var zipSequence = makeSequence(keyIter);
	    zipSequence.size = new ArraySeq(iters).map(function(i ) {return i.size}).min();
	    // Note: this a generic base implementation of __iterate in terms of
	    // __iterator which may be more generically useful in the future.
	    zipSequence.__iterate = function(fn, reverse) {
	      /* generic:
	      var iterator = this.__iterator(ITERATE_ENTRIES, reverse);
	      var step;
	      var iterations = 0;
	      while (!(step = iterator.next()).done) {
	        iterations++;
	        if (fn(step.value[1], step.value[0], this) === false) {
	          break;
	        }
	      }
	      return iterations;
	      */
	      // indexed:
	      var iterator = this.__iterator(ITERATE_VALUES, reverse);
	      var step;
	      var iterations = 0;
	      while (!(step = iterator.next()).done) {
	        if (fn(step.value, iterations++, this) === false) {
	          break;
	        }
	      }
	      return iterations;
	    };
	    zipSequence.__iteratorUncached = function(type, reverse) {
	      var iterators = iters.map(function(i )
	        {return (i = Iterable(i), getIterator(reverse ? i.reverse() : i))}
	      );
	      var iterations = 0;
	      var isDone = false;
	      return new Iterator(function()  {
	        var steps;
	        if (!isDone) {
	          steps = iterators.map(function(i ) {return i.next()});
	          isDone = steps.some(function(s ) {return s.done});
	        }
	        if (isDone) {
	          return iteratorDone();
	        }
	        return iteratorValue(
	          type,
	          iterations++,
	          zipper.apply(null, steps.map(function(s ) {return s.value}))
	        );
	      });
	    };
	    return zipSequence
	  }


	  // #pragma Helper Functions

	  function reify(iter, seq) {
	    return isSeq(iter) ? seq : iter.constructor(seq);
	  }

	  function validateEntry(entry) {
	    if (entry !== Object(entry)) {
	      throw new TypeError('Expected [K, V] tuple: ' + entry);
	    }
	  }

	  function resolveSize(iter) {
	    assertNotInfinite(iter.size);
	    return ensureSize(iter);
	  }

	  function iterableClass(iterable) {
	    return isKeyed(iterable) ? KeyedIterable :
	      isIndexed(iterable) ? IndexedIterable :
	      SetIterable;
	  }

	  function makeSequence(iterable) {
	    return Object.create(
	      (
	        isKeyed(iterable) ? KeyedSeq :
	        isIndexed(iterable) ? IndexedSeq :
	        SetSeq
	      ).prototype
	    );
	  }

	  function cacheResultThrough() {
	    if (this._iter.cacheResult) {
	      this._iter.cacheResult();
	      this.size = this._iter.size;
	      return this;
	    } else {
	      return Seq.prototype.cacheResult.call(this);
	    }
	  }

	  function defaultComparator(a, b) {
	    return a > b ? 1 : a < b ? -1 : 0;
	  }

	  function forceIterator(keyPath) {
	    var iter = getIterator(keyPath);
	    if (!iter) {
	      // Array might not be iterable in this environment, so we need a fallback
	      // to our wrapped type.
	      if (!isArrayLike(keyPath)) {
	        throw new TypeError('Expected iterable or array-like: ' + keyPath);
	      }
	      iter = getIterator(Iterable(keyPath));
	    }
	    return iter;
	  }

	  createClass(Record, KeyedCollection);

	    function Record(defaultValues, name) {
	      var hasInitialized;

	      var RecordType = function Record(values) {
	        if (values instanceof RecordType) {
	          return values;
	        }
	        if (!(this instanceof RecordType)) {
	          return new RecordType(values);
	        }
	        if (!hasInitialized) {
	          hasInitialized = true;
	          var keys = Object.keys(defaultValues);
	          setProps(RecordTypePrototype, keys);
	          RecordTypePrototype.size = keys.length;
	          RecordTypePrototype._name = name;
	          RecordTypePrototype._keys = keys;
	          RecordTypePrototype._defaultValues = defaultValues;
	        }
	        this._map = Map(values);
	      };

	      var RecordTypePrototype = RecordType.prototype = Object.create(RecordPrototype);
	      RecordTypePrototype.constructor = RecordType;

	      return RecordType;
	    }

	    Record.prototype.toString = function() {
	      return this.__toString(recordName(this) + ' {', '}');
	    };

	    // @pragma Access

	    Record.prototype.has = function(k) {
	      return this._defaultValues.hasOwnProperty(k);
	    };

	    Record.prototype.get = function(k, notSetValue) {
	      if (!this.has(k)) {
	        return notSetValue;
	      }
	      var defaultVal = this._defaultValues[k];
	      return this._map ? this._map.get(k, defaultVal) : defaultVal;
	    };

	    // @pragma Modification

	    Record.prototype.clear = function() {
	      if (this.__ownerID) {
	        this._map && this._map.clear();
	        return this;
	      }
	      var RecordType = this.constructor;
	      return RecordType._empty || (RecordType._empty = makeRecord(this, emptyMap()));
	    };

	    Record.prototype.set = function(k, v) {
	      if (!this.has(k)) {
	        throw new Error('Cannot set unknown key "' + k + '" on ' + recordName(this));
	      }
	      if (this._map && !this._map.has(k)) {
	        var defaultVal = this._defaultValues[k];
	        if (v === defaultVal) {
	          return this;
	        }
	      }
	      var newMap = this._map && this._map.set(k, v);
	      if (this.__ownerID || newMap === this._map) {
	        return this;
	      }
	      return makeRecord(this, newMap);
	    };

	    Record.prototype.remove = function(k) {
	      if (!this.has(k)) {
	        return this;
	      }
	      var newMap = this._map && this._map.remove(k);
	      if (this.__ownerID || newMap === this._map) {
	        return this;
	      }
	      return makeRecord(this, newMap);
	    };

	    Record.prototype.wasAltered = function() {
	      return this._map.wasAltered();
	    };

	    Record.prototype.__iterator = function(type, reverse) {var this$0 = this;
	      return KeyedIterable(this._defaultValues).map(function(_, k)  {return this$0.get(k)}).__iterator(type, reverse);
	    };

	    Record.prototype.__iterate = function(fn, reverse) {var this$0 = this;
	      return KeyedIterable(this._defaultValues).map(function(_, k)  {return this$0.get(k)}).__iterate(fn, reverse);
	    };

	    Record.prototype.__ensureOwner = function(ownerID) {
	      if (ownerID === this.__ownerID) {
	        return this;
	      }
	      var newMap = this._map && this._map.__ensureOwner(ownerID);
	      if (!ownerID) {
	        this.__ownerID = ownerID;
	        this._map = newMap;
	        return this;
	      }
	      return makeRecord(this, newMap, ownerID);
	    };


	  var RecordPrototype = Record.prototype;
	  RecordPrototype[DELETE] = RecordPrototype.remove;
	  RecordPrototype.deleteIn =
	  RecordPrototype.removeIn = MapPrototype.removeIn;
	  RecordPrototype.merge = MapPrototype.merge;
	  RecordPrototype.mergeWith = MapPrototype.mergeWith;
	  RecordPrototype.mergeIn = MapPrototype.mergeIn;
	  RecordPrototype.mergeDeep = MapPrototype.mergeDeep;
	  RecordPrototype.mergeDeepWith = MapPrototype.mergeDeepWith;
	  RecordPrototype.mergeDeepIn = MapPrototype.mergeDeepIn;
	  RecordPrototype.setIn = MapPrototype.setIn;
	  RecordPrototype.update = MapPrototype.update;
	  RecordPrototype.updateIn = MapPrototype.updateIn;
	  RecordPrototype.withMutations = MapPrototype.withMutations;
	  RecordPrototype.asMutable = MapPrototype.asMutable;
	  RecordPrototype.asImmutable = MapPrototype.asImmutable;


	  function makeRecord(likeRecord, map, ownerID) {
	    var record = Object.create(Object.getPrototypeOf(likeRecord));
	    record._map = map;
	    record.__ownerID = ownerID;
	    return record;
	  }

	  function recordName(record) {
	    return record._name || record.constructor.name || 'Record';
	  }

	  function setProps(prototype, names) {
	    try {
	      names.forEach(setProp.bind(undefined, prototype));
	    } catch (error) {
	      // Object.defineProperty failed. Probably IE8.
	    }
	  }

	  function setProp(prototype, name) {
	    Object.defineProperty(prototype, name, {
	      get: function() {
	        return this.get(name);
	      },
	      set: function(value) {
	        invariant(this.__ownerID, 'Cannot set on an immutable record.');
	        this.set(name, value);
	      }
	    });
	  }

	  createClass(Set, SetCollection);

	    // @pragma Construction

	    function Set(value) {
	      return value === null || value === undefined ? emptySet() :
	        isSet(value) && !isOrdered(value) ? value :
	        emptySet().withMutations(function(set ) {
	          var iter = SetIterable(value);
	          assertNotInfinite(iter.size);
	          iter.forEach(function(v ) {return set.add(v)});
	        });
	    }

	    Set.of = function(/*...values*/) {
	      return this(arguments);
	    };

	    Set.fromKeys = function(value) {
	      return this(KeyedIterable(value).keySeq());
	    };

	    Set.prototype.toString = function() {
	      return this.__toString('Set {', '}');
	    };

	    // @pragma Access

	    Set.prototype.has = function(value) {
	      return this._map.has(value);
	    };

	    // @pragma Modification

	    Set.prototype.add = function(value) {
	      return updateSet(this, this._map.set(value, true));
	    };

	    Set.prototype.remove = function(value) {
	      return updateSet(this, this._map.remove(value));
	    };

	    Set.prototype.clear = function() {
	      return updateSet(this, this._map.clear());
	    };

	    // @pragma Composition

	    Set.prototype.union = function() {var iters = SLICE$0.call(arguments, 0);
	      iters = iters.filter(function(x ) {return x.size !== 0});
	      if (iters.length === 0) {
	        return this;
	      }
	      if (this.size === 0 && !this.__ownerID && iters.length === 1) {
	        return this.constructor(iters[0]);
	      }
	      return this.withMutations(function(set ) {
	        for (var ii = 0; ii < iters.length; ii++) {
	          SetIterable(iters[ii]).forEach(function(value ) {return set.add(value)});
	        }
	      });
	    };

	    Set.prototype.intersect = function() {var iters = SLICE$0.call(arguments, 0);
	      if (iters.length === 0) {
	        return this;
	      }
	      iters = iters.map(function(iter ) {return SetIterable(iter)});
	      var originalSet = this;
	      return this.withMutations(function(set ) {
	        originalSet.forEach(function(value ) {
	          if (!iters.every(function(iter ) {return iter.includes(value)})) {
	            set.remove(value);
	          }
	        });
	      });
	    };

	    Set.prototype.subtract = function() {var iters = SLICE$0.call(arguments, 0);
	      if (iters.length === 0) {
	        return this;
	      }
	      iters = iters.map(function(iter ) {return SetIterable(iter)});
	      var originalSet = this;
	      return this.withMutations(function(set ) {
	        originalSet.forEach(function(value ) {
	          if (iters.some(function(iter ) {return iter.includes(value)})) {
	            set.remove(value);
	          }
	        });
	      });
	    };

	    Set.prototype.merge = function() {
	      return this.union.apply(this, arguments);
	    };

	    Set.prototype.mergeWith = function(merger) {var iters = SLICE$0.call(arguments, 1);
	      return this.union.apply(this, iters);
	    };

	    Set.prototype.sort = function(comparator) {
	      // Late binding
	      return OrderedSet(sortFactory(this, comparator));
	    };

	    Set.prototype.sortBy = function(mapper, comparator) {
	      // Late binding
	      return OrderedSet(sortFactory(this, comparator, mapper));
	    };

	    Set.prototype.wasAltered = function() {
	      return this._map.wasAltered();
	    };

	    Set.prototype.__iterate = function(fn, reverse) {var this$0 = this;
	      return this._map.__iterate(function(_, k)  {return fn(k, k, this$0)}, reverse);
	    };

	    Set.prototype.__iterator = function(type, reverse) {
	      return this._map.map(function(_, k)  {return k}).__iterator(type, reverse);
	    };

	    Set.prototype.__ensureOwner = function(ownerID) {
	      if (ownerID === this.__ownerID) {
	        return this;
	      }
	      var newMap = this._map.__ensureOwner(ownerID);
	      if (!ownerID) {
	        this.__ownerID = ownerID;
	        this._map = newMap;
	        return this;
	      }
	      return this.__make(newMap, ownerID);
	    };


	  function isSet(maybeSet) {
	    return !!(maybeSet && maybeSet[IS_SET_SENTINEL]);
	  }

	  Set.isSet = isSet;

	  var IS_SET_SENTINEL = '@@__IMMUTABLE_SET__@@';

	  var SetPrototype = Set.prototype;
	  SetPrototype[IS_SET_SENTINEL] = true;
	  SetPrototype[DELETE] = SetPrototype.remove;
	  SetPrototype.mergeDeep = SetPrototype.merge;
	  SetPrototype.mergeDeepWith = SetPrototype.mergeWith;
	  SetPrototype.withMutations = MapPrototype.withMutations;
	  SetPrototype.asMutable = MapPrototype.asMutable;
	  SetPrototype.asImmutable = MapPrototype.asImmutable;

	  SetPrototype.__empty = emptySet;
	  SetPrototype.__make = makeSet;

	  function updateSet(set, newMap) {
	    if (set.__ownerID) {
	      set.size = newMap.size;
	      set._map = newMap;
	      return set;
	    }
	    return newMap === set._map ? set :
	      newMap.size === 0 ? set.__empty() :
	      set.__make(newMap);
	  }

	  function makeSet(map, ownerID) {
	    var set = Object.create(SetPrototype);
	    set.size = map ? map.size : 0;
	    set._map = map;
	    set.__ownerID = ownerID;
	    return set;
	  }

	  var EMPTY_SET;
	  function emptySet() {
	    return EMPTY_SET || (EMPTY_SET = makeSet(emptyMap()));
	  }

	  createClass(OrderedSet, Set);

	    // @pragma Construction

	    function OrderedSet(value) {
	      return value === null || value === undefined ? emptyOrderedSet() :
	        isOrderedSet(value) ? value :
	        emptyOrderedSet().withMutations(function(set ) {
	          var iter = SetIterable(value);
	          assertNotInfinite(iter.size);
	          iter.forEach(function(v ) {return set.add(v)});
	        });
	    }

	    OrderedSet.of = function(/*...values*/) {
	      return this(arguments);
	    };

	    OrderedSet.fromKeys = function(value) {
	      return this(KeyedIterable(value).keySeq());
	    };

	    OrderedSet.prototype.toString = function() {
	      return this.__toString('OrderedSet {', '}');
	    };


	  function isOrderedSet(maybeOrderedSet) {
	    return isSet(maybeOrderedSet) && isOrdered(maybeOrderedSet);
	  }

	  OrderedSet.isOrderedSet = isOrderedSet;

	  var OrderedSetPrototype = OrderedSet.prototype;
	  OrderedSetPrototype[IS_ORDERED_SENTINEL] = true;

	  OrderedSetPrototype.__empty = emptyOrderedSet;
	  OrderedSetPrototype.__make = makeOrderedSet;

	  function makeOrderedSet(map, ownerID) {
	    var set = Object.create(OrderedSetPrototype);
	    set.size = map ? map.size : 0;
	    set._map = map;
	    set.__ownerID = ownerID;
	    return set;
	  }

	  var EMPTY_ORDERED_SET;
	  function emptyOrderedSet() {
	    return EMPTY_ORDERED_SET || (EMPTY_ORDERED_SET = makeOrderedSet(emptyOrderedMap()));
	  }

	  createClass(Stack, IndexedCollection);

	    // @pragma Construction

	    function Stack(value) {
	      return value === null || value === undefined ? emptyStack() :
	        isStack(value) ? value :
	        emptyStack().unshiftAll(value);
	    }

	    Stack.of = function(/*...values*/) {
	      return this(arguments);
	    };

	    Stack.prototype.toString = function() {
	      return this.__toString('Stack [', ']');
	    };

	    // @pragma Access

	    Stack.prototype.get = function(index, notSetValue) {
	      var head = this._head;
	      index = wrapIndex(this, index);
	      while (head && index--) {
	        head = head.next;
	      }
	      return head ? head.value : notSetValue;
	    };

	    Stack.prototype.peek = function() {
	      return this._head && this._head.value;
	    };

	    // @pragma Modification

	    Stack.prototype.push = function(/*...values*/) {
	      if (arguments.length === 0) {
	        return this;
	      }
	      var newSize = this.size + arguments.length;
	      var head = this._head;
	      for (var ii = arguments.length - 1; ii >= 0; ii--) {
	        head = {
	          value: arguments[ii],
	          next: head
	        };
	      }
	      if (this.__ownerID) {
	        this.size = newSize;
	        this._head = head;
	        this.__hash = undefined;
	        this.__altered = true;
	        return this;
	      }
	      return makeStack(newSize, head);
	    };

	    Stack.prototype.pushAll = function(iter) {
	      iter = IndexedIterable(iter);
	      if (iter.size === 0) {
	        return this;
	      }
	      assertNotInfinite(iter.size);
	      var newSize = this.size;
	      var head = this._head;
	      iter.reverse().forEach(function(value ) {
	        newSize++;
	        head = {
	          value: value,
	          next: head
	        };
	      });
	      if (this.__ownerID) {
	        this.size = newSize;
	        this._head = head;
	        this.__hash = undefined;
	        this.__altered = true;
	        return this;
	      }
	      return makeStack(newSize, head);
	    };

	    Stack.prototype.pop = function() {
	      return this.slice(1);
	    };

	    Stack.prototype.unshift = function(/*...values*/) {
	      return this.push.apply(this, arguments);
	    };

	    Stack.prototype.unshiftAll = function(iter) {
	      return this.pushAll(iter);
	    };

	    Stack.prototype.shift = function() {
	      return this.pop.apply(this, arguments);
	    };

	    Stack.prototype.clear = function() {
	      if (this.size === 0) {
	        return this;
	      }
	      if (this.__ownerID) {
	        this.size = 0;
	        this._head = undefined;
	        this.__hash = undefined;
	        this.__altered = true;
	        return this;
	      }
	      return emptyStack();
	    };

	    Stack.prototype.slice = function(begin, end) {
	      if (wholeSlice(begin, end, this.size)) {
	        return this;
	      }
	      var resolvedBegin = resolveBegin(begin, this.size);
	      var resolvedEnd = resolveEnd(end, this.size);
	      if (resolvedEnd !== this.size) {
	        // super.slice(begin, end);
	        return IndexedCollection.prototype.slice.call(this, begin, end);
	      }
	      var newSize = this.size - resolvedBegin;
	      var head = this._head;
	      while (resolvedBegin--) {
	        head = head.next;
	      }
	      if (this.__ownerID) {
	        this.size = newSize;
	        this._head = head;
	        this.__hash = undefined;
	        this.__altered = true;
	        return this;
	      }
	      return makeStack(newSize, head);
	    };

	    // @pragma Mutability

	    Stack.prototype.__ensureOwner = function(ownerID) {
	      if (ownerID === this.__ownerID) {
	        return this;
	      }
	      if (!ownerID) {
	        this.__ownerID = ownerID;
	        this.__altered = false;
	        return this;
	      }
	      return makeStack(this.size, this._head, ownerID, this.__hash);
	    };

	    // @pragma Iteration

	    Stack.prototype.__iterate = function(fn, reverse) {
	      if (reverse) {
	        return this.reverse().__iterate(fn);
	      }
	      var iterations = 0;
	      var node = this._head;
	      while (node) {
	        if (fn(node.value, iterations++, this) === false) {
	          break;
	        }
	        node = node.next;
	      }
	      return iterations;
	    };

	    Stack.prototype.__iterator = function(type, reverse) {
	      if (reverse) {
	        return this.reverse().__iterator(type);
	      }
	      var iterations = 0;
	      var node = this._head;
	      return new Iterator(function()  {
	        if (node) {
	          var value = node.value;
	          node = node.next;
	          return iteratorValue(type, iterations++, value);
	        }
	        return iteratorDone();
	      });
	    };


	  function isStack(maybeStack) {
	    return !!(maybeStack && maybeStack[IS_STACK_SENTINEL]);
	  }

	  Stack.isStack = isStack;

	  var IS_STACK_SENTINEL = '@@__IMMUTABLE_STACK__@@';

	  var StackPrototype = Stack.prototype;
	  StackPrototype[IS_STACK_SENTINEL] = true;
	  StackPrototype.withMutations = MapPrototype.withMutations;
	  StackPrototype.asMutable = MapPrototype.asMutable;
	  StackPrototype.asImmutable = MapPrototype.asImmutable;
	  StackPrototype.wasAltered = MapPrototype.wasAltered;


	  function makeStack(size, head, ownerID, hash) {
	    var map = Object.create(StackPrototype);
	    map.size = size;
	    map._head = head;
	    map.__ownerID = ownerID;
	    map.__hash = hash;
	    map.__altered = false;
	    return map;
	  }

	  var EMPTY_STACK;
	  function emptyStack() {
	    return EMPTY_STACK || (EMPTY_STACK = makeStack(0));
	  }

	  /**
	   * Contributes additional methods to a constructor
	   */
	  function mixin(ctor, methods) {
	    var keyCopier = function(key ) { ctor.prototype[key] = methods[key]; };
	    Object.keys(methods).forEach(keyCopier);
	    Object.getOwnPropertySymbols &&
	      Object.getOwnPropertySymbols(methods).forEach(keyCopier);
	    return ctor;
	  }

	  Iterable.Iterator = Iterator;

	  mixin(Iterable, {

	    // ### Conversion to other types

	    toArray: function() {
	      assertNotInfinite(this.size);
	      var array = new Array(this.size || 0);
	      this.valueSeq().__iterate(function(v, i)  { array[i] = v; });
	      return array;
	    },

	    toIndexedSeq: function() {
	      return new ToIndexedSequence(this);
	    },

	    toJS: function() {
	      return this.toSeq().map(
	        function(value ) {return value && typeof value.toJS === 'function' ? value.toJS() : value}
	      ).__toJS();
	    },

	    toJSON: function() {
	      return this.toSeq().map(
	        function(value ) {return value && typeof value.toJSON === 'function' ? value.toJSON() : value}
	      ).__toJS();
	    },

	    toKeyedSeq: function() {
	      return new ToKeyedSequence(this, true);
	    },

	    toMap: function() {
	      // Use Late Binding here to solve the circular dependency.
	      return Map(this.toKeyedSeq());
	    },

	    toObject: function() {
	      assertNotInfinite(this.size);
	      var object = {};
	      this.__iterate(function(v, k)  { object[k] = v; });
	      return object;
	    },

	    toOrderedMap: function() {
	      // Use Late Binding here to solve the circular dependency.
	      return OrderedMap(this.toKeyedSeq());
	    },

	    toOrderedSet: function() {
	      // Use Late Binding here to solve the circular dependency.
	      return OrderedSet(isKeyed(this) ? this.valueSeq() : this);
	    },

	    toSet: function() {
	      // Use Late Binding here to solve the circular dependency.
	      return Set(isKeyed(this) ? this.valueSeq() : this);
	    },

	    toSetSeq: function() {
	      return new ToSetSequence(this);
	    },

	    toSeq: function() {
	      return isIndexed(this) ? this.toIndexedSeq() :
	        isKeyed(this) ? this.toKeyedSeq() :
	        this.toSetSeq();
	    },

	    toStack: function() {
	      // Use Late Binding here to solve the circular dependency.
	      return Stack(isKeyed(this) ? this.valueSeq() : this);
	    },

	    toList: function() {
	      // Use Late Binding here to solve the circular dependency.
	      return List(isKeyed(this) ? this.valueSeq() : this);
	    },


	    // ### Common JavaScript methods and properties

	    toString: function() {
	      return '[Iterable]';
	    },

	    __toString: function(head, tail) {
	      if (this.size === 0) {
	        return head + tail;
	      }
	      return head + ' ' + this.toSeq().map(this.__toStringMapper).join(', ') + ' ' + tail;
	    },


	    // ### ES6 Collection methods (ES6 Array and Map)

	    concat: function() {var values = SLICE$0.call(arguments, 0);
	      return reify(this, concatFactory(this, values));
	    },

	    includes: function(searchValue) {
	      return this.some(function(value ) {return is(value, searchValue)});
	    },

	    entries: function() {
	      return this.__iterator(ITERATE_ENTRIES);
	    },

	    every: function(predicate, context) {
	      assertNotInfinite(this.size);
	      var returnValue = true;
	      this.__iterate(function(v, k, c)  {
	        if (!predicate.call(context, v, k, c)) {
	          returnValue = false;
	          return false;
	        }
	      });
	      return returnValue;
	    },

	    filter: function(predicate, context) {
	      return reify(this, filterFactory(this, predicate, context, true));
	    },

	    find: function(predicate, context, notSetValue) {
	      var entry = this.findEntry(predicate, context);
	      return entry ? entry[1] : notSetValue;
	    },

	    forEach: function(sideEffect, context) {
	      assertNotInfinite(this.size);
	      return this.__iterate(context ? sideEffect.bind(context) : sideEffect);
	    },

	    join: function(separator) {
	      assertNotInfinite(this.size);
	      separator = separator !== undefined ? '' + separator : ',';
	      var joined = '';
	      var isFirst = true;
	      this.__iterate(function(v ) {
	        isFirst ? (isFirst = false) : (joined += separator);
	        joined += v !== null && v !== undefined ? v.toString() : '';
	      });
	      return joined;
	    },

	    keys: function() {
	      return this.__iterator(ITERATE_KEYS);
	    },

	    map: function(mapper, context) {
	      return reify(this, mapFactory(this, mapper, context));
	    },

	    reduce: function(reducer, initialReduction, context) {
	      assertNotInfinite(this.size);
	      var reduction;
	      var useFirst;
	      if (arguments.length < 2) {
	        useFirst = true;
	      } else {
	        reduction = initialReduction;
	      }
	      this.__iterate(function(v, k, c)  {
	        if (useFirst) {
	          useFirst = false;
	          reduction = v;
	        } else {
	          reduction = reducer.call(context, reduction, v, k, c);
	        }
	      });
	      return reduction;
	    },

	    reduceRight: function(reducer, initialReduction, context) {
	      var reversed = this.toKeyedSeq().reverse();
	      return reversed.reduce.apply(reversed, arguments);
	    },

	    reverse: function() {
	      return reify(this, reverseFactory(this, true));
	    },

	    slice: function(begin, end) {
	      return reify(this, sliceFactory(this, begin, end, true));
	    },

	    some: function(predicate, context) {
	      return !this.every(not(predicate), context);
	    },

	    sort: function(comparator) {
	      return reify(this, sortFactory(this, comparator));
	    },

	    values: function() {
	      return this.__iterator(ITERATE_VALUES);
	    },


	    // ### More sequential methods

	    butLast: function() {
	      return this.slice(0, -1);
	    },

	    isEmpty: function() {
	      return this.size !== undefined ? this.size === 0 : !this.some(function()  {return true});
	    },

	    count: function(predicate, context) {
	      return ensureSize(
	        predicate ? this.toSeq().filter(predicate, context) : this
	      );
	    },

	    countBy: function(grouper, context) {
	      return countByFactory(this, grouper, context);
	    },

	    equals: function(other) {
	      return deepEqual(this, other);
	    },

	    entrySeq: function() {
	      var iterable = this;
	      if (iterable._cache) {
	        // We cache as an entries array, so we can just return the cache!
	        return new ArraySeq(iterable._cache);
	      }
	      var entriesSequence = iterable.toSeq().map(entryMapper).toIndexedSeq();
	      entriesSequence.fromEntrySeq = function()  {return iterable.toSeq()};
	      return entriesSequence;
	    },

	    filterNot: function(predicate, context) {
	      return this.filter(not(predicate), context);
	    },

	    findEntry: function(predicate, context, notSetValue) {
	      var found = notSetValue;
	      this.__iterate(function(v, k, c)  {
	        if (predicate.call(context, v, k, c)) {
	          found = [k, v];
	          return false;
	        }
	      });
	      return found;
	    },

	    findKey: function(predicate, context) {
	      var entry = this.findEntry(predicate, context);
	      return entry && entry[0];
	    },

	    findLast: function(predicate, context, notSetValue) {
	      return this.toKeyedSeq().reverse().find(predicate, context, notSetValue);
	    },

	    findLastEntry: function(predicate, context, notSetValue) {
	      return this.toKeyedSeq().reverse().findEntry(predicate, context, notSetValue);
	    },

	    findLastKey: function(predicate, context) {
	      return this.toKeyedSeq().reverse().findKey(predicate, context);
	    },

	    first: function() {
	      return this.find(returnTrue);
	    },

	    flatMap: function(mapper, context) {
	      return reify(this, flatMapFactory(this, mapper, context));
	    },

	    flatten: function(depth) {
	      return reify(this, flattenFactory(this, depth, true));
	    },

	    fromEntrySeq: function() {
	      return new FromEntriesSequence(this);
	    },

	    get: function(searchKey, notSetValue) {
	      return this.find(function(_, key)  {return is(key, searchKey)}, undefined, notSetValue);
	    },

	    getIn: function(searchKeyPath, notSetValue) {
	      var nested = this;
	      // Note: in an ES6 environment, we would prefer:
	      // for (var key of searchKeyPath) {
	      var iter = forceIterator(searchKeyPath);
	      var step;
	      while (!(step = iter.next()).done) {
	        var key = step.value;
	        nested = nested && nested.get ? nested.get(key, NOT_SET) : NOT_SET;
	        if (nested === NOT_SET) {
	          return notSetValue;
	        }
	      }
	      return nested;
	    },

	    groupBy: function(grouper, context) {
	      return groupByFactory(this, grouper, context);
	    },

	    has: function(searchKey) {
	      return this.get(searchKey, NOT_SET) !== NOT_SET;
	    },

	    hasIn: function(searchKeyPath) {
	      return this.getIn(searchKeyPath, NOT_SET) !== NOT_SET;
	    },

	    isSubset: function(iter) {
	      iter = typeof iter.includes === 'function' ? iter : Iterable(iter);
	      return this.every(function(value ) {return iter.includes(value)});
	    },

	    isSuperset: function(iter) {
	      iter = typeof iter.isSubset === 'function' ? iter : Iterable(iter);
	      return iter.isSubset(this);
	    },

	    keyOf: function(searchValue) {
	      return this.findKey(function(value ) {return is(value, searchValue)});
	    },

	    keySeq: function() {
	      return this.toSeq().map(keyMapper).toIndexedSeq();
	    },

	    last: function() {
	      return this.toSeq().reverse().first();
	    },

	    lastKeyOf: function(searchValue) {
	      return this.toKeyedSeq().reverse().keyOf(searchValue);
	    },

	    max: function(comparator) {
	      return maxFactory(this, comparator);
	    },

	    maxBy: function(mapper, comparator) {
	      return maxFactory(this, comparator, mapper);
	    },

	    min: function(comparator) {
	      return maxFactory(this, comparator ? neg(comparator) : defaultNegComparator);
	    },

	    minBy: function(mapper, comparator) {
	      return maxFactory(this, comparator ? neg(comparator) : defaultNegComparator, mapper);
	    },

	    rest: function() {
	      return this.slice(1);
	    },

	    skip: function(amount) {
	      return this.slice(Math.max(0, amount));
	    },

	    skipLast: function(amount) {
	      return reify(this, this.toSeq().reverse().skip(amount).reverse());
	    },

	    skipWhile: function(predicate, context) {
	      return reify(this, skipWhileFactory(this, predicate, context, true));
	    },

	    skipUntil: function(predicate, context) {
	      return this.skipWhile(not(predicate), context);
	    },

	    sortBy: function(mapper, comparator) {
	      return reify(this, sortFactory(this, comparator, mapper));
	    },

	    take: function(amount) {
	      return this.slice(0, Math.max(0, amount));
	    },

	    takeLast: function(amount) {
	      return reify(this, this.toSeq().reverse().take(amount).reverse());
	    },

	    takeWhile: function(predicate, context) {
	      return reify(this, takeWhileFactory(this, predicate, context));
	    },

	    takeUntil: function(predicate, context) {
	      return this.takeWhile(not(predicate), context);
	    },

	    valueSeq: function() {
	      return this.toIndexedSeq();
	    },


	    // ### Hashable Object

	    hashCode: function() {
	      return this.__hash || (this.__hash = hashIterable(this));
	    }


	    // ### Internal

	    // abstract __iterate(fn, reverse)

	    // abstract __iterator(type, reverse)
	  });

	  // var IS_ITERABLE_SENTINEL = '@@__IMMUTABLE_ITERABLE__@@';
	  // var IS_KEYED_SENTINEL = '@@__IMMUTABLE_KEYED__@@';
	  // var IS_INDEXED_SENTINEL = '@@__IMMUTABLE_INDEXED__@@';
	  // var IS_ORDERED_SENTINEL = '@@__IMMUTABLE_ORDERED__@@';

	  var IterablePrototype = Iterable.prototype;
	  IterablePrototype[IS_ITERABLE_SENTINEL] = true;
	  IterablePrototype[ITERATOR_SYMBOL] = IterablePrototype.values;
	  IterablePrototype.__toJS = IterablePrototype.toArray;
	  IterablePrototype.__toStringMapper = quoteString;
	  IterablePrototype.inspect =
	  IterablePrototype.toSource = function() { return this.toString(); };
	  IterablePrototype.chain = IterablePrototype.flatMap;
	  IterablePrototype.contains = IterablePrototype.includes;

	  mixin(KeyedIterable, {

	    // ### More sequential methods

	    flip: function() {
	      return reify(this, flipFactory(this));
	    },

	    mapEntries: function(mapper, context) {var this$0 = this;
	      var iterations = 0;
	      return reify(this,
	        this.toSeq().map(
	          function(v, k)  {return mapper.call(context, [k, v], iterations++, this$0)}
	        ).fromEntrySeq()
	      );
	    },

	    mapKeys: function(mapper, context) {var this$0 = this;
	      return reify(this,
	        this.toSeq().flip().map(
	          function(k, v)  {return mapper.call(context, k, v, this$0)}
	        ).flip()
	      );
	    }

	  });

	  var KeyedIterablePrototype = KeyedIterable.prototype;
	  KeyedIterablePrototype[IS_KEYED_SENTINEL] = true;
	  KeyedIterablePrototype[ITERATOR_SYMBOL] = IterablePrototype.entries;
	  KeyedIterablePrototype.__toJS = IterablePrototype.toObject;
	  KeyedIterablePrototype.__toStringMapper = function(v, k)  {return JSON.stringify(k) + ': ' + quoteString(v)};



	  mixin(IndexedIterable, {

	    // ### Conversion to other types

	    toKeyedSeq: function() {
	      return new ToKeyedSequence(this, false);
	    },


	    // ### ES6 Collection methods (ES6 Array and Map)

	    filter: function(predicate, context) {
	      return reify(this, filterFactory(this, predicate, context, false));
	    },

	    findIndex: function(predicate, context) {
	      var entry = this.findEntry(predicate, context);
	      return entry ? entry[0] : -1;
	    },

	    indexOf: function(searchValue) {
	      var key = this.keyOf(searchValue);
	      return key === undefined ? -1 : key;
	    },

	    lastIndexOf: function(searchValue) {
	      var key = this.lastKeyOf(searchValue);
	      return key === undefined ? -1 : key;
	    },

	    reverse: function() {
	      return reify(this, reverseFactory(this, false));
	    },

	    slice: function(begin, end) {
	      return reify(this, sliceFactory(this, begin, end, false));
	    },

	    splice: function(index, removeNum /*, ...values*/) {
	      var numArgs = arguments.length;
	      removeNum = Math.max(removeNum | 0, 0);
	      if (numArgs === 0 || (numArgs === 2 && !removeNum)) {
	        return this;
	      }
	      // If index is negative, it should resolve relative to the size of the
	      // collection. However size may be expensive to compute if not cached, so
	      // only call count() if the number is in fact negative.
	      index = resolveBegin(index, index < 0 ? this.count() : this.size);
	      var spliced = this.slice(0, index);
	      return reify(
	        this,
	        numArgs === 1 ?
	          spliced :
	          spliced.concat(arrCopy(arguments, 2), this.slice(index + removeNum))
	      );
	    },


	    // ### More collection methods

	    findLastIndex: function(predicate, context) {
	      var entry = this.findLastEntry(predicate, context);
	      return entry ? entry[0] : -1;
	    },

	    first: function() {
	      return this.get(0);
	    },

	    flatten: function(depth) {
	      return reify(this, flattenFactory(this, depth, false));
	    },

	    get: function(index, notSetValue) {
	      index = wrapIndex(this, index);
	      return (index < 0 || (this.size === Infinity ||
	          (this.size !== undefined && index > this.size))) ?
	        notSetValue :
	        this.find(function(_, key)  {return key === index}, undefined, notSetValue);
	    },

	    has: function(index) {
	      index = wrapIndex(this, index);
	      return index >= 0 && (this.size !== undefined ?
	        this.size === Infinity || index < this.size :
	        this.indexOf(index) !== -1
	      );
	    },

	    interpose: function(separator) {
	      return reify(this, interposeFactory(this, separator));
	    },

	    interleave: function(/*...iterables*/) {
	      var iterables = [this].concat(arrCopy(arguments));
	      var zipped = zipWithFactory(this.toSeq(), IndexedSeq.of, iterables);
	      var interleaved = zipped.flatten(true);
	      if (zipped.size) {
	        interleaved.size = zipped.size * iterables.length;
	      }
	      return reify(this, interleaved);
	    },

	    keySeq: function() {
	      return Range(0, this.size);
	    },

	    last: function() {
	      return this.get(-1);
	    },

	    skipWhile: function(predicate, context) {
	      return reify(this, skipWhileFactory(this, predicate, context, false));
	    },

	    zip: function(/*, ...iterables */) {
	      var iterables = [this].concat(arrCopy(arguments));
	      return reify(this, zipWithFactory(this, defaultZipper, iterables));
	    },

	    zipWith: function(zipper/*, ...iterables */) {
	      var iterables = arrCopy(arguments);
	      iterables[0] = this;
	      return reify(this, zipWithFactory(this, zipper, iterables));
	    }

	  });

	  IndexedIterable.prototype[IS_INDEXED_SENTINEL] = true;
	  IndexedIterable.prototype[IS_ORDERED_SENTINEL] = true;



	  mixin(SetIterable, {

	    // ### ES6 Collection methods (ES6 Array and Map)

	    get: function(value, notSetValue) {
	      return this.has(value) ? value : notSetValue;
	    },

	    includes: function(value) {
	      return this.has(value);
	    },


	    // ### More sequential methods

	    keySeq: function() {
	      return this.valueSeq();
	    }

	  });

	  SetIterable.prototype.has = IterablePrototype.includes;
	  SetIterable.prototype.contains = SetIterable.prototype.includes;


	  // Mixin subclasses

	  mixin(KeyedSeq, KeyedIterable.prototype);
	  mixin(IndexedSeq, IndexedIterable.prototype);
	  mixin(SetSeq, SetIterable.prototype);

	  mixin(KeyedCollection, KeyedIterable.prototype);
	  mixin(IndexedCollection, IndexedIterable.prototype);
	  mixin(SetCollection, SetIterable.prototype);


	  // #pragma Helper functions

	  function keyMapper(v, k) {
	    return k;
	  }

	  function entryMapper(v, k) {
	    return [k, v];
	  }

	  function not(predicate) {
	    return function() {
	      return !predicate.apply(this, arguments);
	    }
	  }

	  function neg(predicate) {
	    return function() {
	      return -predicate.apply(this, arguments);
	    }
	  }

	  function quoteString(value) {
	    return typeof value === 'string' ? JSON.stringify(value) : String(value);
	  }

	  function defaultZipper() {
	    return arrCopy(arguments);
	  }

	  function defaultNegComparator(a, b) {
	    return a < b ? 1 : a > b ? -1 : 0;
	  }

	  function hashIterable(iterable) {
	    if (iterable.size === Infinity) {
	      return 0;
	    }
	    var ordered = isOrdered(iterable);
	    var keyed = isKeyed(iterable);
	    var h = ordered ? 1 : 0;
	    var size = iterable.__iterate(
	      keyed ?
	        ordered ?
	          function(v, k)  { h = 31 * h + hashMerge(hash(v), hash(k)) | 0; } :
	          function(v, k)  { h = h + hashMerge(hash(v), hash(k)) | 0; } :
	        ordered ?
	          function(v ) { h = 31 * h + hash(v) | 0; } :
	          function(v ) { h = h + hash(v) | 0; }
	    );
	    return murmurHashOfSize(size, h);
	  }

	  function murmurHashOfSize(size, h) {
	    h = imul(h, 0xCC9E2D51);
	    h = imul(h << 15 | h >>> -15, 0x1B873593);
	    h = imul(h << 13 | h >>> -13, 5);
	    h = (h + 0xE6546B64 | 0) ^ size;
	    h = imul(h ^ h >>> 16, 0x85EBCA6B);
	    h = imul(h ^ h >>> 13, 0xC2B2AE35);
	    h = smi(h ^ h >>> 16);
	    return h;
	  }

	  function hashMerge(a, b) {
	    return a ^ b + 0x9E3779B9 + (a << 6) + (a >> 2) | 0; // int
	  }

	  var Immutable = {

	    Iterable: Iterable,

	    Seq: Seq,
	    Collection: Collection,
	    Map: Map,
	    OrderedMap: OrderedMap,
	    List: List,
	    Stack: Stack,
	    Set: Set,
	    OrderedSet: OrderedSet,

	    Record: Record,
	    Range: Range,
	    Repeat: Repeat,

	    is: is,
	    fromJS: fromJS

	  };

	  return Immutable;

	}));

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	/*!
	 * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
	 * MIT Licensed
	 */

	var fs = __webpack_require__(74);

	function Options(defaults) {
	  var internalValues = {};
	  var values = this.value = {};
	  Object.keys(defaults).forEach(function(key) {
	    internalValues[key] = defaults[key];
	    Object.defineProperty(values, key, {
	      get: function() { return internalValues[key]; },
	      configurable: false,
	      enumerable: true
	    });
	  });
	  this.reset = function() {
	    Object.keys(defaults).forEach(function(key) {
	      internalValues[key] = defaults[key];
	    });
	    return this;
	  };
	  this.merge = function(options, required) {
	    options = options || {};
	    if (Object.prototype.toString.call(required) === '[object Array]') {
	      var missing = [];
	      for (var i = 0, l = required.length; i < l; ++i) {
	        var key = required[i];
	        if (!(key in options)) {
	          missing.push(key);
	        }
	      }
	      if (missing.length > 0) {
	        if (missing.length > 1) {
	          throw new Error('options ' +
	            missing.slice(0, missing.length - 1).join(', ') + ' and ' +
	            missing[missing.length - 1] + ' must be defined');
	        }
	        else throw new Error('option ' + missing[0] + ' must be defined');
	      }
	    }
	    Object.keys(options).forEach(function(key) {
	      if (key in internalValues) {
	        internalValues[key] = options[key];
	      }
	    });
	    return this;
	  };
	  this.copy = function(keys) {
	    var obj = {};
	    Object.keys(defaults).forEach(function(key) {
	      if (keys.indexOf(key) !== -1) {
	        obj[key] = values[key];
	      }
	    });
	    return obj;
	  };
	  this.read = function(filename, cb) {
	    if (typeof cb == 'function') {
	      var self = this;
	      fs.readFile(filename, function(error, data) {
	        if (error) return cb(error);
	        var conf = JSON.parse(data);
	        self.merge(conf);
	        cb();
	      });
	    }
	    else {
	      var conf = JSON.parse(fs.readFileSync(filename));
	      this.merge(conf);
	    }
	    return this;
	  };
	  this.isDefined = function(key) {
	    return typeof values[key] != 'undefined';
	  };
	  this.isDefinedAndNonNull = function(key) {
	    return typeof values[key] != 'undefined' && values[key] !== null;
	  };
	  Object.freeze(values);
	  Object.freeze(this);
	}

	module.exports = Options;


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/*!
	 * ws: a node.js websocket client
	 * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
	 * MIT Licensed
	 */

	try {
	  module.exports = __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"bufferutil\""); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
	} catch (e) {
	  module.exports = __webpack_require__(68);
	}


/***/ },
/* 13 */
/***/ function(module, exports) {

	/*!
	 * ws: a node.js websocket client
	 * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
	 * MIT Licensed
	 */

	module.exports = {
	  isValidErrorCode: function(code) {
	    return (code >= 1000 && code <= 1011 && code != 1004 && code != 1005 && code != 1006) ||
	         (code >= 3000 && code <= 4999);
	  },
	  1000: 'normal',
	  1001: 'going away',
	  1002: 'protocol error',
	  1003: 'unsupported data',
	  1004: 'reserved',
	  1005: 'reserved for extensions',
	  1006: 'reserved for extensions',
	  1007: 'inconsistent or invalid data',
	  1008: 'policy violation',
	  1009: 'message too big',
	  1010: 'extension handshake missing',
	  1011: 'an unexpected condition prevented the request from being fulfilled',
	};

/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	
	var util = __webpack_require__(1);

	/**
	 * Module exports.
	 */

	exports.parse = parse;
	exports.format = format;

	/**
	 * Parse extensions header value
	 */

	function parse(value) {
	  value = value || '';

	  var extensions = {};

	  value.split(',').forEach(function(v) {
	    var params = v.split(';');
	    var token = params.shift().trim();
	    var paramsList = extensions[token] = extensions[token] || [];
	    var parsedParams = {};

	    params.forEach(function(param) {
	      var parts = param.trim().split('=');
	      var key = parts[0];
	      var value = parts[1];
	      if (typeof value === 'undefined') {
	        value = true;
	      } else {
	        // unquote value
	        if (value[0] === '"') {
	          value = value.slice(1);
	        }
	        if (value[value.length - 1] === '"') {
	          value = value.slice(0, value.length - 1);
	        }
	      }
	      (parsedParams[key] = parsedParams[key] || []).push(value);
	    });

	    paramsList.push(parsedParams);
	  });

	  return extensions;
	}

	/**
	 * Format extensions header value
	 */

	function format(value) {
	  return Object.keys(value).map(function(token) {
	    var paramsList = value[token];
	    if (!util.isArray(paramsList)) {
	      paramsList = [paramsList];
	    }
	    return paramsList.map(function(params) {
	      return [token].concat(Object.keys(params).map(function(k) {
	        var p = params[k];
	        if (!util.isArray(p)) p = [p];
	        return p.map(function(v) {
	          return v === true ? k : k + '=' + v;
	        }).join('; ');
	      })).join('; ');
	    }).join(', ');
	  }).join(', ');
	}


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	/*!
	 * ws: a node.js websocket client
	 * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
	 * MIT Licensed
	 */

	var util = __webpack_require__(1)
	  , Validation = __webpack_require__(72).Validation
	  , ErrorCodes = __webpack_require__(13)
	  , BufferPool = __webpack_require__(67)
	  , bufferUtil = __webpack_require__(12).BufferUtil
	  , PerMessageDeflate = __webpack_require__(3);

	/**
	 * HyBi Receiver implementation
	 */

	function Receiver (extensions,maxPayload) {
	  if (this instanceof Receiver === false) {
	    throw new TypeError("Classes can't be function-called");
	  }
	  if(typeof extensions==='number'){
	    maxPayload=extensions;
	    extensions={};
	  }


	  // memory pool for fragmented messages
	  var fragmentedPoolPrevUsed = -1;
	  this.fragmentedBufferPool = new BufferPool(1024, function(db, length) {
	    return db.used + length;
	  }, function(db) {
	    return fragmentedPoolPrevUsed = fragmentedPoolPrevUsed >= 0 ?
	      Math.ceil((fragmentedPoolPrevUsed + db.used) / 2) :
	      db.used;
	  });

	  // memory pool for unfragmented messages
	  var unfragmentedPoolPrevUsed = -1;
	  this.unfragmentedBufferPool = new BufferPool(1024, function(db, length) {
	    return db.used + length;
	  }, function(db) {
	    return unfragmentedPoolPrevUsed = unfragmentedPoolPrevUsed >= 0 ?
	      Math.ceil((unfragmentedPoolPrevUsed + db.used) / 2) :
	      db.used;
	  });
	  this.extensions = extensions || {};
	  this.maxPayload = maxPayload || 0;
	  this.currentPayloadLength = 0;
	  this.state = {
	    activeFragmentedOperation: null,
	    lastFragment: false,
	    masked: false,
	    opcode: 0,
	    fragmentedOperation: false
	  };
	  this.overflow = [];
	  this.headerBuffer = new Buffer(10);
	  this.expectOffset = 0;
	  this.expectBuffer = null;
	  this.expectHandler = null;
	  this.currentMessage = [];
	  this.currentMessageLength = 0;
	  this.messageHandlers = [];
	  this.expectHeader(2, this.processPacket);
	  this.dead = false;
	  this.processing = false;

	  this.onerror = function() {};
	  this.ontext = function() {};
	  this.onbinary = function() {};
	  this.onclose = function() {};
	  this.onping = function() {};
	  this.onpong = function() {};
	}

	module.exports = Receiver;

	/**
	 * Add new data to the parser.
	 *
	 * @api public
	 */

	Receiver.prototype.add = function(data) {
	  if (this.dead) return;
	  var dataLength = data.length;
	  if (dataLength == 0) return;
	  if (this.expectBuffer == null) {
	    this.overflow.push(data);
	    return;
	  }
	  var toRead = Math.min(dataLength, this.expectBuffer.length - this.expectOffset);
	  fastCopy(toRead, data, this.expectBuffer, this.expectOffset);
	  this.expectOffset += toRead;
	  if (toRead < dataLength) {
	    this.overflow.push(data.slice(toRead));
	  }
	  while (this.expectBuffer && this.expectOffset == this.expectBuffer.length) {
	    var bufferForHandler = this.expectBuffer;
	    this.expectBuffer = null;
	    this.expectOffset = 0;
	    this.expectHandler.call(this, bufferForHandler);
	  }
	};

	/**
	 * Releases all resources used by the receiver.
	 *
	 * @api public
	 */

	Receiver.prototype.cleanup = function() {
	  this.dead = true;
	  this.overflow = null;
	  this.headerBuffer = null;
	  this.expectBuffer = null;
	  this.expectHandler = null;
	  this.unfragmentedBufferPool = null;
	  this.fragmentedBufferPool = null;
	  this.state = null;
	  this.currentMessage = null;
	  this.onerror = null;
	  this.ontext = null;
	  this.onbinary = null;
	  this.onclose = null;
	  this.onping = null;
	  this.onpong = null;
	};

	/**
	 * Waits for a certain amount of header bytes to be available, then fires a callback.
	 *
	 * @api private
	 */

	Receiver.prototype.expectHeader = function(length, handler) {
	  if (length == 0) {
	    handler(null);
	    return;
	  }
	  this.expectBuffer = this.headerBuffer.slice(this.expectOffset, this.expectOffset + length);
	  this.expectHandler = handler;
	  var toRead = length;
	  while (toRead > 0 && this.overflow.length > 0) {
	    var fromOverflow = this.overflow.pop();
	    if (toRead < fromOverflow.length) this.overflow.push(fromOverflow.slice(toRead));
	    var read = Math.min(fromOverflow.length, toRead);
	    fastCopy(read, fromOverflow, this.expectBuffer, this.expectOffset);
	    this.expectOffset += read;
	    toRead -= read;
	  }
	};

	/**
	 * Waits for a certain amount of data bytes to be available, then fires a callback.
	 *
	 * @api private
	 */

	Receiver.prototype.expectData = function(length, handler) {
	  if (length == 0) {
	    handler(null);
	    return;
	  }
	  this.expectBuffer = this.allocateFromPool(length, this.state.fragmentedOperation);
	  this.expectHandler = handler;
	  var toRead = length;
	  while (toRead > 0 && this.overflow.length > 0) {
	    var fromOverflow = this.overflow.pop();
	    if (toRead < fromOverflow.length) this.overflow.push(fromOverflow.slice(toRead));
	    var read = Math.min(fromOverflow.length, toRead);
	    fastCopy(read, fromOverflow, this.expectBuffer, this.expectOffset);
	    this.expectOffset += read;
	    toRead -= read;
	  }
	};

	/**
	 * Allocates memory from the buffer pool.
	 *
	 * @api private
	 */

	Receiver.prototype.allocateFromPool = function(length, isFragmented) {
	  return (isFragmented ? this.fragmentedBufferPool : this.unfragmentedBufferPool).get(length);
	};

	/**
	 * Start processing a new packet.
	 *
	 * @api private
	 */

	Receiver.prototype.processPacket = function (data) {
	  if (this.extensions[PerMessageDeflate.extensionName]) {
	    if ((data[0] & 0x30) != 0) {
	      this.error('reserved fields (2, 3) must be empty', 1002);
	      return;
	    }
	  } else {
	    if ((data[0] & 0x70) != 0) {
	      this.error('reserved fields must be empty', 1002);
	      return;
	    }
	  }
	  this.state.lastFragment = (data[0] & 0x80) == 0x80;
	  this.state.masked = (data[1] & 0x80) == 0x80;
	  var compressed = (data[0] & 0x40) == 0x40;
	  var opcode = data[0] & 0xf;
	  if (opcode === 0) {
	    if (compressed) {
	      this.error('continuation frame cannot have the Per-message Compressed bits', 1002);
	      return;
	    }
	    // continuation frame
	    this.state.fragmentedOperation = true;
	    this.state.opcode = this.state.activeFragmentedOperation;
	    if (!(this.state.opcode == 1 || this.state.opcode == 2)) {
	      this.error('continuation frame cannot follow current opcode', 1002);
	      return;
	    }
	  }
	  else {
	    if (opcode < 3 && this.state.activeFragmentedOperation != null) {
	      this.error('data frames after the initial data frame must have opcode 0', 1002);
	      return;
	    }
	    if (opcode >= 8 && compressed) {
	      this.error('control frames cannot have the Per-message Compressed bits', 1002);
	      return;
	    }
	    this.state.compressed = compressed;
	    this.state.opcode = opcode;
	    if (this.state.lastFragment === false) {
	      this.state.fragmentedOperation = true;
	      this.state.activeFragmentedOperation = opcode;
	    }
	    else this.state.fragmentedOperation = false;
	  }
	  var handler = opcodes[this.state.opcode];
	  if (typeof handler == 'undefined') this.error('no handler for opcode ' + this.state.opcode, 1002);
	  else {
	    handler.start.call(this, data);
	  }
	};

	/**
	 * Endprocessing a packet.
	 *
	 * @api private
	 */

	Receiver.prototype.endPacket = function() {
	  if (this.dead) return;
	  if (!this.state.fragmentedOperation) this.unfragmentedBufferPool.reset(true);
	  else if (this.state.lastFragment) this.fragmentedBufferPool.reset(true);
	  this.expectOffset = 0;
	  this.expectBuffer = null;
	  this.expectHandler = null;
	  if (this.state.lastFragment && this.state.opcode === this.state.activeFragmentedOperation) {
	    // end current fragmented operation
	    this.state.activeFragmentedOperation = null;
	  }
	  this.currentPayloadLength = 0;
	  this.state.lastFragment = false;
	  this.state.opcode = this.state.activeFragmentedOperation != null ? this.state.activeFragmentedOperation : 0;
	  this.state.masked = false;
	  this.expectHeader(2, this.processPacket);
	};

	/**
	 * Reset the parser state.
	 *
	 * @api private
	 */

	Receiver.prototype.reset = function() {
	  if (this.dead) return;
	  this.state = {
	    activeFragmentedOperation: null,
	    lastFragment: false,
	    masked: false,
	    opcode: 0,
	    fragmentedOperation: false
	  };
	  this.fragmentedBufferPool.reset(true);
	  this.unfragmentedBufferPool.reset(true);
	  this.expectOffset = 0;
	  this.expectBuffer = null;
	  this.expectHandler = null;
	  this.overflow = [];
	  this.currentMessage = [];
	  this.currentMessageLength = 0;
	  this.messageHandlers = [];
	  this.currentPayloadLength = 0;
	};

	/**
	 * Unmask received data.
	 *
	 * @api private
	 */

	Receiver.prototype.unmask = function (mask, buf, binary) {
	  if (mask != null && buf != null) bufferUtil.unmask(buf, mask);
	  if (binary) return buf;
	  return buf != null ? buf.toString('utf8') : '';
	};

	/**
	 * Handles an error
	 *
	 * @api private
	 */

	Receiver.prototype.error = function (reason, protocolErrorCode) {
	  if (this.dead) return;
	  this.reset();
	  if(typeof reason == 'string'){
	    this.onerror(new Error(reason), protocolErrorCode);
	  }
	  else if(reason.constructor == Error){
	    this.onerror(reason, protocolErrorCode);
	  }
	  else{
	    this.onerror(new Error("An error occured"),protocolErrorCode);
	  }
	  return this;
	};

	/**
	 * Execute message handler buffers
	 *
	 * @api private
	 */

	Receiver.prototype.flush = function() {
	  if (this.processing || this.dead) return;

	  var handler = this.messageHandlers.shift();
	  if (!handler) return;

	  this.processing = true;
	  var self = this;

	  handler(function() {
	    self.processing = false;
	    self.flush();
	  });
	};

	/**
	 * Apply extensions to message
	 *
	 * @api private
	 */

	Receiver.prototype.applyExtensions = function(messageBuffer, fin, compressed, callback) {
	  var self = this;
	  if (compressed) {
	    this.extensions[PerMessageDeflate.extensionName].decompress(messageBuffer, fin, function(err, buffer) {
	      if (self.dead) return;
	      if (err) {
	        callback(new Error('invalid compressed data'));
	        return;
	      }
	      callback(null, buffer);
	    });
	  } else {
	    callback(null, messageBuffer);
	  }
	};

	/**
	* Checks payload size, disconnects socket when it exceeds maxPayload
	*
	* @api private
	*/
	Receiver.prototype.maxPayloadExceeded = function(length) {
	  if (this.maxPayload=== undefined || this.maxPayload === null || this.maxPayload < 1) {
	    return false;
	  }
	  var fullLength = this.currentPayloadLength + length;
	  if (fullLength < this.maxPayload) {
	    this.currentPayloadLength = fullLength;
	    return false;
	  }
	  this.error('payload cannot exceed ' + this.maxPayload + ' bytes', 1009);
	  this.messageBuffer=[];
	  this.cleanup();

	  return true;
	};

	/**
	 * Buffer utilities
	 */

	function readUInt16BE(start) {
	  return (this[start]<<8) +
	         this[start+1];
	}

	function readUInt32BE(start) {
	  return (this[start]<<24) +
	         (this[start+1]<<16) +
	         (this[start+2]<<8) +
	         this[start+3];
	}

	function fastCopy(length, srcBuffer, dstBuffer, dstOffset) {
	  switch (length) {
	    default: srcBuffer.copy(dstBuffer, dstOffset, 0, length); break;
	    case 16: dstBuffer[dstOffset+15] = srcBuffer[15];
	    case 15: dstBuffer[dstOffset+14] = srcBuffer[14];
	    case 14: dstBuffer[dstOffset+13] = srcBuffer[13];
	    case 13: dstBuffer[dstOffset+12] = srcBuffer[12];
	    case 12: dstBuffer[dstOffset+11] = srcBuffer[11];
	    case 11: dstBuffer[dstOffset+10] = srcBuffer[10];
	    case 10: dstBuffer[dstOffset+9] = srcBuffer[9];
	    case 9: dstBuffer[dstOffset+8] = srcBuffer[8];
	    case 8: dstBuffer[dstOffset+7] = srcBuffer[7];
	    case 7: dstBuffer[dstOffset+6] = srcBuffer[6];
	    case 6: dstBuffer[dstOffset+5] = srcBuffer[5];
	    case 5: dstBuffer[dstOffset+4] = srcBuffer[4];
	    case 4: dstBuffer[dstOffset+3] = srcBuffer[3];
	    case 3: dstBuffer[dstOffset+2] = srcBuffer[2];
	    case 2: dstBuffer[dstOffset+1] = srcBuffer[1];
	    case 1: dstBuffer[dstOffset] = srcBuffer[0];
	  }
	}

	function clone(obj) {
	  var cloned = {};
	  for (var k in obj) {
	    if (obj.hasOwnProperty(k)) {
	      cloned[k] = obj[k];
	    }
	  }
	  return cloned;
	}

	/**
	 * Opcode handlers
	 */

	var opcodes = {
	  // text
	  '1': {
	    start: function(data) {
	      var self = this;
	      // decode length
	      var firstLength = data[1] & 0x7f;
	      if (firstLength < 126) {
	        if (self.maxPayloadExceeded(firstLength)){
	          self.error('Maximumpayload exceeded in compressed text message. Aborting...', 1009);
	          return;
	        }
	        opcodes['1'].getData.call(self, firstLength);
	      }
	      else if (firstLength == 126) {
	        self.expectHeader(2, function(data) {
	          var length = readUInt16BE.call(data, 0);
	          if (self.maxPayloadExceeded(length)){
	            self.error('Maximumpayload exceeded in compressed text message. Aborting...', 1009);
	            return;
	          }
	          opcodes['1'].getData.call(self, length);
	        });
	      }
	      else if (firstLength == 127) {
	        self.expectHeader(8, function(data) {
	          if (readUInt32BE.call(data, 0) != 0) {
	            self.error('packets with length spanning more than 32 bit is currently not supported', 1008);
	            return;
	          }
	          var length = readUInt32BE.call(data, 4);
	          if (self.maxPayloadExceeded(length)){
	            self.error('Maximumpayload exceeded in compressed text message. Aborting...', 1009);
	            return;
	          }
	          opcodes['1'].getData.call(self, readUInt32BE.call(data, 4));
	        });
	      }
	    },
	    getData: function(length) {
	      var self = this;
	      if (self.state.masked) {
	        self.expectHeader(4, function(data) {
	          var mask = data;
	          self.expectData(length, function(data) {
	            opcodes['1'].finish.call(self, mask, data);
	          });
	        });
	      }
	      else {
	        self.expectData(length, function(data) {
	          opcodes['1'].finish.call(self, null, data);
	        });
	      }
	    },
	    finish: function(mask, data) {
	      var self = this;
	      var packet = this.unmask(mask, data, true) || new Buffer(0);
	      var state = clone(this.state);
	      this.messageHandlers.push(function(callback) {
	        self.applyExtensions(packet, state.lastFragment, state.compressed, function(err, buffer) {
	          if (err) {
	            if(err.type===1009){
	                return self.error('Maximumpayload exceeded in compressed text message. Aborting...', 1009);
	            }
	            return self.error(err.message, 1007);
	          }
	          if (buffer != null) {
	            if( self.maxPayload==0 || (self.maxPayload > 0 && (self.currentMessageLength + buffer.length) < self.maxPayload) ){
	              self.currentMessage.push(buffer);
	            }
	            else{
	                self.currentMessage=null;
	                self.currentMessage = [];
	                self.currentMessageLength = 0;
	                self.error(new Error('Maximum payload exceeded. maxPayload: '+self.maxPayload), 1009);
	                return;
	            }
	            self.currentMessageLength += buffer.length;
	          }
	          if (state.lastFragment) {
	            var messageBuffer = Buffer.concat(self.currentMessage);
	            self.currentMessage = [];
	            self.currentMessageLength = 0;
	            if (!Validation.isValidUTF8(messageBuffer)) {
	              self.error('invalid utf8 sequence', 1007);
	              return;
	            }
	            self.ontext(messageBuffer.toString('utf8'), {masked: state.masked, buffer: messageBuffer});
	          }
	          callback();
	        });
	      });
	      this.flush();
	      this.endPacket();
	    }
	  },
	  // binary
	  '2': {
	    start: function(data) {
	      var self = this;
	      // decode length
	      var firstLength = data[1] & 0x7f;
	      if (firstLength < 126) {
	          if (self.maxPayloadExceeded(firstLength)){
	            self.error('Max payload exceeded in compressed text message. Aborting...', 1009);
	            return;
	          }
	        opcodes['2'].getData.call(self, firstLength);
	      }
	      else if (firstLength == 126) {
	        self.expectHeader(2, function(data) {
	          var length = readUInt16BE.call(data, 0);
	          if (self.maxPayloadExceeded(length)){
	            self.error('Max payload exceeded in compressed text message. Aborting...', 1009);
	            return;
	          }
	          opcodes['2'].getData.call(self, length);
	        });
	      }
	      else if (firstLength == 127) {
	        self.expectHeader(8, function(data) {
	          if (readUInt32BE.call(data, 0) != 0) {
	            self.error('packets with length spanning more than 32 bit is currently not supported', 1008);
	            return;
	          }
	          var length = readUInt32BE.call(data, 4, true);
	          if (self.maxPayloadExceeded(length)){
	            self.error('Max payload exceeded in compressed text message. Aborting...', 1009);
	            return;
	          }
	          opcodes['2'].getData.call(self, length);
	        });
	      }
	    },
	    getData: function(length) {
	      var self = this;
	      if (self.state.masked) {
	        self.expectHeader(4, function(data) {
	          var mask = data;
	          self.expectData(length, function(data) {
	            opcodes['2'].finish.call(self, mask, data);
	          });
	        });
	      }
	      else {
	        self.expectData(length, function(data) {
	          opcodes['2'].finish.call(self, null, data);
	        });
	      }
	    },
	    finish: function(mask, data) {
	      var self = this;
	      var packet = this.unmask(mask, data, true) || new Buffer(0);
	      var state = clone(this.state);
	      this.messageHandlers.push(function(callback) {
	        self.applyExtensions(packet, state.lastFragment, state.compressed, function(err, buffer) {
	          if (err) {
	            if(err.type===1009){
	                return self.error('Max payload exceeded in compressed binary message. Aborting...', 1009);
	            }
	            return self.error(err.message, 1007);
	          }
	          if (buffer != null) {
	            if( self.maxPayload==0 || (self.maxPayload > 0 && (self.currentMessageLength + buffer.length) < self.maxPayload) ){
	              self.currentMessage.push(buffer);
	            }
	            else{
	                self.currentMessage=null;
	                self.currentMessage = [];
	                self.currentMessageLength = 0;
	                self.error(new Error('Maximum payload exceeded'), 1009);
	                return;
	            }
	            self.currentMessageLength += buffer.length;
	          }
	          if (state.lastFragment) {
	            var messageBuffer = Buffer.concat(self.currentMessage);
	            self.currentMessage = [];
	            self.currentMessageLength = 0;
	            self.onbinary(messageBuffer, {masked: state.masked, buffer: messageBuffer});
	          }
	          callback();
	        });
	      });
	      this.flush();
	      this.endPacket();
	    }
	  },
	  // close
	  '8': {
	    start: function(data) {
	      var self = this;
	      if (self.state.lastFragment == false) {
	        self.error('fragmented close is not supported', 1002);
	        return;
	      }

	      // decode length
	      var firstLength = data[1] & 0x7f;
	      if (firstLength < 126) {
	        opcodes['8'].getData.call(self, firstLength);
	      }
	      else {
	        self.error('control frames cannot have more than 125 bytes of data', 1002);
	      }
	    },
	    getData: function(length) {
	      var self = this;
	      if (self.state.masked) {
	        self.expectHeader(4, function(data) {
	          var mask = data;
	          self.expectData(length, function(data) {
	            opcodes['8'].finish.call(self, mask, data);
	          });
	        });
	      }
	      else {
	        self.expectData(length, function(data) {
	          opcodes['8'].finish.call(self, null, data);
	        });
	      }
	    },
	    finish: function(mask, data) {
	      var self = this;
	      data = self.unmask(mask, data, true);

	      var state = clone(this.state);
	      this.messageHandlers.push(function() {
	        if (data && data.length == 1) {
	          self.error('close packets with data must be at least two bytes long', 1002);
	          return;
	        }
	        var code = data && data.length > 1 ? readUInt16BE.call(data, 0) : 1000;
	        if (!ErrorCodes.isValidErrorCode(code)) {
	          self.error('invalid error code', 1002);
	          return;
	        }
	        var message = '';
	        if (data && data.length > 2) {
	          var messageBuffer = data.slice(2);
	          if (!Validation.isValidUTF8(messageBuffer)) {
	            self.error('invalid utf8 sequence', 1007);
	            return;
	          }
	          message = messageBuffer.toString('utf8');
	        }
	        self.onclose(code, message, {masked: state.masked});
	        self.reset();
	      });
	      this.flush();
	    },
	  },
	  // ping
	  '9': {
	    start: function(data) {
	      var self = this;
	      if (self.state.lastFragment == false) {
	        self.error('fragmented ping is not supported', 1002);
	        return;
	      }

	      // decode length
	      var firstLength = data[1] & 0x7f;
	      if (firstLength < 126) {
	        opcodes['9'].getData.call(self, firstLength);
	      }
	      else {
	        self.error('control frames cannot have more than 125 bytes of data', 1002);
	      }
	    },
	    getData: function(length) {
	      var self = this;
	      if (self.state.masked) {
	        self.expectHeader(4, function(data) {
	          var mask = data;
	          self.expectData(length, function(data) {
	            opcodes['9'].finish.call(self, mask, data);
	          });
	        });
	      }
	      else {
	        self.expectData(length, function(data) {
	          opcodes['9'].finish.call(self, null, data);
	        });
	      }
	    },
	    finish: function(mask, data) {
	      var self = this;
	      data = this.unmask(mask, data, true);
	      var state = clone(this.state);
	      this.messageHandlers.push(function(callback) {
	        self.onping(data, {masked: state.masked, binary: true});
	        callback();
	      });
	      this.flush();
	      this.endPacket();
	    }
	  },
	  // pong
	  '10': {
	    start: function(data) {
	      var self = this;
	      if (self.state.lastFragment == false) {
	        self.error('fragmented pong is not supported', 1002);
	        return;
	      }

	      // decode length
	      var firstLength = data[1] & 0x7f;
	      if (firstLength < 126) {
	        opcodes['10'].getData.call(self, firstLength);
	      }
	      else {
	        self.error('control frames cannot have more than 125 bytes of data', 1002);
	      }
	    },
	    getData: function(length) {
	      var self = this;
	      if (this.state.masked) {
	        this.expectHeader(4, function(data) {
	          var mask = data;
	          self.expectData(length, function(data) {
	            opcodes['10'].finish.call(self, mask, data);
	          });
	        });
	      }
	      else {
	        this.expectData(length, function(data) {
	          opcodes['10'].finish.call(self, null, data);
	        });
	      }
	    },
	    finish: function(mask, data) {
	      var self = this;
	      data = self.unmask(mask, data, true);
	      var state = clone(this.state);
	      this.messageHandlers.push(function(callback) {
	        self.onpong(data, {masked: state.masked, binary: true});
	        callback();
	      });
	      this.flush();
	      this.endPacket();
	    }
	  }
	}


/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	/*!
	 * ws: a node.js websocket client
	 * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
	 * MIT Licensed
	 */

	var events = __webpack_require__(2)
	  , util = __webpack_require__(1)
	  , EventEmitter = events.EventEmitter
	  , ErrorCodes = __webpack_require__(13)
	  , bufferUtil = __webpack_require__(12).BufferUtil
	  , PerMessageDeflate = __webpack_require__(3);

	/**
	 * HyBi Sender implementation
	 */

	function Sender(socket, extensions) {
	  if (this instanceof Sender === false) {
	    throw new TypeError("Classes can't be function-called");
	  }

	  events.EventEmitter.call(this);

	  this._socket = socket;
	  this.extensions = extensions || {};
	  this.firstFragment = true;
	  this.compress = false;
	  this.messageHandlers = [];
	  this.processing = false;
	}

	/**
	 * Inherits from EventEmitter.
	 */

	util.inherits(Sender, events.EventEmitter);

	/**
	 * Sends a close instruction to the remote party.
	 *
	 * @api public
	 */

	Sender.prototype.close = function(code, data, mask, cb) {
	  if (typeof code !== 'undefined') {
	    if (typeof code !== 'number' ||
	      !ErrorCodes.isValidErrorCode(code)) throw new Error('first argument must be a valid error code number');
	  }
	  code = code || 1000;
	  var dataBuffer = new Buffer(2 + (data ? Buffer.byteLength(data) : 0));
	  writeUInt16BE.call(dataBuffer, code, 0);
	  if (dataBuffer.length > 2) dataBuffer.write(data, 2);

	  var self = this;
	  this.messageHandlers.push(function(callback) {
	    self.frameAndSend(0x8, dataBuffer, true, mask);
	    callback();
	    if (typeof cb == 'function') cb();
	  });
	  this.flush();
	};

	/**
	 * Sends a ping message to the remote party.
	 *
	 * @api public
	 */

	Sender.prototype.ping = function(data, options) {
	  var mask = options && options.mask;
	  var self = this;
	  this.messageHandlers.push(function(callback) {
	    self.frameAndSend(0x9, data || '', true, mask);
	    callback();
	  });
	  this.flush();
	};

	/**
	 * Sends a pong message to the remote party.
	 *
	 * @api public
	 */

	Sender.prototype.pong = function(data, options) {
	  var mask = options && options.mask;
	  var self = this;
	  this.messageHandlers.push(function(callback) {
	    self.frameAndSend(0xa, data || '', true, mask);
	    callback();
	  });
	  this.flush();
	};

	/**
	 * Sends text or binary data to the remote party.
	 *
	 * @api public
	 */

	Sender.prototype.send = function(data, options, cb) {
	  var finalFragment = options && options.fin === false ? false : true;
	  var mask = options && options.mask;
	  var compress = options && options.compress;
	  var opcode = options && options.binary ? 2 : 1;
	  if (this.firstFragment === false) {
	    opcode = 0;
	    compress = false;
	  } else {
	    this.firstFragment = false;
	    this.compress = compress;
	  }
	  if (finalFragment) this.firstFragment = true

	  var compressFragment = this.compress;

	  var self = this;
	  this.messageHandlers.push(function(callback) {
	    self.applyExtensions(data, finalFragment, compressFragment, function(err, data) {
	      if (err) {
	        if (typeof cb == 'function') cb(err);
	        else self.emit('error', err);
	        return;
	      }
	      self.frameAndSend(opcode, data, finalFragment, mask, compress, cb);
	      callback();
	    });
	  });
	  this.flush();
	};

	/**
	 * Frames and sends a piece of data according to the HyBi WebSocket protocol.
	 *
	 * @api private
	 */

	Sender.prototype.frameAndSend = function(opcode, data, finalFragment, maskData, compressed, cb) {
	  var canModifyData = false;

	  if (!data) {
	    try {
	      this._socket.write(new Buffer([opcode | (finalFragment ? 0x80 : 0), 0 | (maskData ? 0x80 : 0)].concat(maskData ? [0, 0, 0, 0] : [])), 'binary', cb);
	    }
	    catch (e) {
	      if (typeof cb == 'function') cb(e);
	      else this.emit('error', e);
	    }
	    return;
	  }

	  if (!Buffer.isBuffer(data)) {
	    canModifyData = true;
	    if (data && (typeof data.byteLength !== 'undefined' || typeof data.buffer !== 'undefined')) {
	      data = getArrayBuffer(data);
	    } else {
	      //
	      // If people want to send a number, this would allocate the number in
	      // bytes as memory size instead of storing the number as buffer value. So
	      // we need to transform it to string in order to prevent possible
	      // vulnerabilities / memory attacks.
	      //
	      if (typeof data === 'number') data = data.toString();

	      data = new Buffer(data);
	    }
	  }

	  var dataLength = data.length
	    , dataOffset = maskData ? 6 : 2
	    , secondByte = dataLength;

	  if (dataLength >= 65536) {
	    dataOffset += 8;
	    secondByte = 127;
	  }
	  else if (dataLength > 125) {
	    dataOffset += 2;
	    secondByte = 126;
	  }

	  var mergeBuffers = dataLength < 32768 || (maskData && !canModifyData);
	  var totalLength = mergeBuffers ? dataLength + dataOffset : dataOffset;
	  var outputBuffer = new Buffer(totalLength);
	  outputBuffer[0] = finalFragment ? opcode | 0x80 : opcode;
	  if (compressed) outputBuffer[0] |= 0x40;

	  switch (secondByte) {
	    case 126:
	      writeUInt16BE.call(outputBuffer, dataLength, 2);
	      break;
	    case 127:
	      writeUInt32BE.call(outputBuffer, 0, 2);
	      writeUInt32BE.call(outputBuffer, dataLength, 6);
	  }

	  if (maskData) {
	    outputBuffer[1] = secondByte | 0x80;
	    var mask = getRandomMask();
	    outputBuffer[dataOffset - 4] = mask[0];
	    outputBuffer[dataOffset - 3] = mask[1];
	    outputBuffer[dataOffset - 2] = mask[2];
	    outputBuffer[dataOffset - 1] = mask[3];
	    if (mergeBuffers) {
	      bufferUtil.mask(data, mask, outputBuffer, dataOffset, dataLength);
	      try {
	        this._socket.write(outputBuffer, 'binary', cb);
	      }
	      catch (e) {
	        if (typeof cb == 'function') cb(e);
	        else this.emit('error', e);
	      }
	    }
	    else {
	      bufferUtil.mask(data, mask, data, 0, dataLength);
	      try {
	        this._socket.write(outputBuffer, 'binary');
	        this._socket.write(data, 'binary', cb);
	      }
	      catch (e) {
	        if (typeof cb == 'function') cb(e);
	        else this.emit('error', e);
	      }
	    }
	  }
	  else {
	    outputBuffer[1] = secondByte;
	    if (mergeBuffers) {
	      data.copy(outputBuffer, dataOffset);
	      try {
	        this._socket.write(outputBuffer, 'binary', cb);
	      }
	      catch (e) {
	        if (typeof cb == 'function') cb(e);
	        else this.emit('error', e);
	      }
	    }
	    else {
	      try {
	        this._socket.write(outputBuffer, 'binary');
	        this._socket.write(data, 'binary', cb);
	      }
	      catch (e) {
	        if (typeof cb == 'function') cb(e);
	        else this.emit('error', e);
	      }
	    }
	  }
	};

	/**
	 * Execute message handler buffers
	 *
	 * @api private
	 */

	Sender.prototype.flush = function() {
	  if (this.processing) return;

	  var handler = this.messageHandlers.shift();
	  if (!handler) return;

	  this.processing = true;

	  var self = this;

	  handler(function() {
	    self.processing = false;
	    self.flush();
	  });
	};

	/**
	 * Apply extensions to message
	 *
	 * @api private
	 */

	Sender.prototype.applyExtensions = function(data, fin, compress, callback) {
	  if (compress && data) {
	    if ((data.buffer || data) instanceof ArrayBuffer) {
	      data = getArrayBuffer(data);
	    }
	    this.extensions[PerMessageDeflate.extensionName].compress(data, fin, callback);
	  } else {
	    callback(null, data);
	  }
	};

	module.exports = Sender;

	function writeUInt16BE(value, offset) {
	  this[offset] = (value & 0xff00)>>8;
	  this[offset+1] = value & 0xff;
	}

	function writeUInt32BE(value, offset) {
	  this[offset] = (value & 0xff000000)>>24;
	  this[offset+1] = (value & 0xff0000)>>16;
	  this[offset+2] = (value & 0xff00)>>8;
	  this[offset+3] = value & 0xff;
	}

	function getArrayBuffer(data) {
	  // data is either an ArrayBuffer or ArrayBufferView.
	  var array = new Uint8Array(data.buffer || data)
	    , l = data.byteLength || data.length
	    , o = data.byteOffset || 0
	    , buffer = new Buffer(l);
	  for (var i = 0; i < l; ++i) {
	    buffer[i] = array[o+i];
	  }
	  return buffer;
	}

	function getRandomMask() {
	  return new Buffer([
	    ~~(Math.random() * 255),
	    ~~(Math.random() * 255),
	    ~~(Math.random() * 255),
	    ~~(Math.random() * 255)
	  ]);
	}


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/*!
	 * ws: a node.js websocket client
	 * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
	 * MIT Licensed
	 */

	var url = __webpack_require__(20)
	  , util = __webpack_require__(1)
	  , http = __webpack_require__(19)
	  , https = __webpack_require__(75)
	  , crypto = __webpack_require__(18)
	  , stream = __webpack_require__(76)
	  , Ultron = __webpack_require__(65)
	  , Options = __webpack_require__(11)
	  , Sender = __webpack_require__(16)
	  , Receiver = __webpack_require__(15)
	  , SenderHixie = __webpack_require__(70)
	  , ReceiverHixie = __webpack_require__(69)
	  , Extensions = __webpack_require__(14)
	  , PerMessageDeflate = __webpack_require__(3)
	  , EventEmitter = __webpack_require__(2).EventEmitter;

	/**
	 * Constants
	 */

	// Default protocol version

	var protocolVersion = 13;

	// Close timeout

	var closeTimeout = 30 * 1000; // Allow 30 seconds to terminate the connection cleanly

	/**
	 * WebSocket implementation
	 *
	 * @constructor
	 * @param {String} address Connection address.
	 * @param {String|Array} protocols WebSocket protocols.
	 * @param {Object} options Additional connection options.
	 * @api public
	 */
	function WebSocket(address, protocols, options) {
	  if (this instanceof WebSocket === false) {
	    return new WebSocket(address, protocols, options);
	  }

	  EventEmitter.call(this);

	  if (protocols && !Array.isArray(protocols) && 'object' === typeof protocols) {
	    // accept the "options" Object as the 2nd argument
	    options = protocols;
	    protocols = null;
	  }

	  if ('string' === typeof protocols) {
	    protocols = [ protocols ];
	  }

	  if (!Array.isArray(protocols)) {
	    protocols = [];
	  }

	  this._socket = null;
	  this._ultron = null;
	  this._closeReceived = false;
	  this.bytesReceived = 0;
	  this.readyState = null;
	  this.supports = {};
	  this.extensions = {};
	  this._binaryType = 'nodebuffer';

	  if (Array.isArray(address)) {
	    initAsServerClient.apply(this, address.concat(options));
	  } else {
	    initAsClient.apply(this, [address, protocols, options]);
	  }
	}

	/**
	 * Inherits from EventEmitter.
	 */
	util.inherits(WebSocket, EventEmitter);

	/**
	 * Ready States
	 */
	["CONNECTING", "OPEN", "CLOSING", "CLOSED"].forEach(function each(state, index) {
	    WebSocket.prototype[state] = WebSocket[state] = index;
	});

	/**
	 * Gracefully closes the connection, after sending a description message to the server
	 *
	 * @param {Object} data to be sent to the server
	 * @api public
	 */
	WebSocket.prototype.close = function close(code, data) {
	  if (this.readyState === WebSocket.CLOSED) return;

	  if (this.readyState === WebSocket.CONNECTING) {
	    this.readyState = WebSocket.CLOSED;
	    return;
	  }

	  if (this.readyState === WebSocket.CLOSING) {
	    if (this._closeReceived && this._isServer) {
	      this.terminate();
	    }
	    return;
	  }

	  var self = this;
	  try {
	    this.readyState = WebSocket.CLOSING;
	    this._closeCode = code;
	    this._closeMessage = data;
	    var mask = !this._isServer;
	    this._sender.close(code, data, mask, function(err) {
	      if (err) self.emit('error', err);

	      if (self._closeReceived && self._isServer) {
	        self.terminate();
	      } else {
	        // ensure that the connection is cleaned up even when no response of closing handshake.
	        clearTimeout(self._closeTimer);
	        self._closeTimer = setTimeout(cleanupWebsocketResources.bind(self, true), closeTimeout);
	      }
	    });
	  } catch (e) {
	    this.emit('error', e);
	  }
	};

	/**
	 * Pause the client stream
	 *
	 * @api public
	 */
	WebSocket.prototype.pause = function pauser() {
	  if (this.readyState !== WebSocket.OPEN) throw new Error('not opened');

	  return this._socket.pause();
	};

	/**
	 * Sends a ping
	 *
	 * @param {Object} data to be sent to the server
	 * @param {Object} Members - mask: boolean, binary: boolean
	 * @param {boolean} dontFailWhenClosed indicates whether or not to throw if the connection isnt open
	 * @api public
	 */
	WebSocket.prototype.ping = function ping(data, options, dontFailWhenClosed) {
	  if (this.readyState !== WebSocket.OPEN) {
	    if (dontFailWhenClosed === true) return;
	    throw new Error('not opened');
	  }

	  options = options || {};

	  if (typeof options.mask === 'undefined') options.mask = !this._isServer;

	  this._sender.ping(data, options);
	};

	/**
	 * Sends a pong
	 *
	 * @param {Object} data to be sent to the server
	 * @param {Object} Members - mask: boolean, binary: boolean
	 * @param {boolean} dontFailWhenClosed indicates whether or not to throw if the connection isnt open
	 * @api public
	 */
	WebSocket.prototype.pong = function(data, options, dontFailWhenClosed) {
	  if (this.readyState !== WebSocket.OPEN) {
	    if (dontFailWhenClosed === true) return;
	    throw new Error('not opened');
	  }

	  options = options || {};

	  if (typeof options.mask === 'undefined') options.mask = !this._isServer;

	  this._sender.pong(data, options);
	};

	/**
	 * Resume the client stream
	 *
	 * @api public
	 */
	WebSocket.prototype.resume = function resume() {
	  if (this.readyState !== WebSocket.OPEN) throw new Error('not opened');

	  return this._socket.resume();
	};

	/**
	 * Sends a piece of data
	 *
	 * @param {Object} data to be sent to the server
	 * @param {Object} Members - mask: boolean, binary: boolean, compress: boolean
	 * @param {function} Optional callback which is executed after the send completes
	 * @api public
	 */

	WebSocket.prototype.send = function send(data, options, cb) {
	  if (typeof options === 'function') {
	    cb = options;
	    options = {};
	  }

	  if (this.readyState !== WebSocket.OPEN) {
	    if (typeof cb === 'function') cb(new Error('not opened'));
	    else throw new Error('not opened');
	    return;
	  }

	  if (!data) data = '';
	  if (this._queue) {
	    var self = this;
	    this._queue.push(function() { self.send(data, options, cb); });
	    return;
	  }

	  options = options || {};
	  options.fin = true;

	  if (typeof options.binary === 'undefined') {
	    options.binary = (data instanceof ArrayBuffer || data instanceof Buffer ||
	      data instanceof Uint8Array ||
	      data instanceof Uint16Array ||
	      data instanceof Uint32Array ||
	      data instanceof Int8Array ||
	      data instanceof Int16Array ||
	      data instanceof Int32Array ||
	      data instanceof Float32Array ||
	      data instanceof Float64Array);
	  }

	  if (typeof options.mask === 'undefined') options.mask = !this._isServer;
	  if (typeof options.compress === 'undefined') options.compress = true;
	  if (!this.extensions[PerMessageDeflate.extensionName]) {
	    options.compress = false;
	  }

	  var readable = typeof stream.Readable === 'function'
	    ? stream.Readable
	    : stream.Stream;

	  if (data instanceof readable) {
	    startQueue(this);
	    var self = this;

	    sendStream(this, data, options, function send(error) {
	      process.nextTick(function tock() {
	        executeQueueSends(self);
	      });

	      if (typeof cb === 'function') cb(error);
	    });
	  } else {
	    this._sender.send(data, options, cb);
	  }
	};

	/**
	 * Streams data through calls to a user supplied function
	 *
	 * @param {Object} Members - mask: boolean, binary: boolean, compress: boolean
	 * @param {function} 'function (error, send)' which is executed on successive ticks of which send is 'function (data, final)'.
	 * @api public
	 */
	WebSocket.prototype.stream = function stream(options, cb) {
	  if (typeof options === 'function') {
	    cb = options;
	    options = {};
	  }

	  var self = this;

	  if (typeof cb !== 'function') throw new Error('callback must be provided');

	  if (this.readyState !== WebSocket.OPEN) {
	    if (typeof cb === 'function') cb(new Error('not opened'));
	    else throw new Error('not opened');
	    return;
	  }

	  if (this._queue) {
	    this._queue.push(function () { self.stream(options, cb); });
	    return;
	  }

	  options = options || {};

	  if (typeof options.mask === 'undefined') options.mask = !this._isServer;
	  if (typeof options.compress === 'undefined') options.compress = true;
	  if (!this.extensions[PerMessageDeflate.extensionName]) {
	    options.compress = false;
	  }

	  startQueue(this);

	  function send(data, final) {
	    try {
	      if (self.readyState !== WebSocket.OPEN) throw new Error('not opened');
	      options.fin = final === true;
	      self._sender.send(data, options);
	      if (!final) process.nextTick(cb.bind(null, null, send));
	      else executeQueueSends(self);
	    } catch (e) {
	      if (typeof cb === 'function') cb(e);
	      else {
	        delete self._queue;
	        self.emit('error', e);
	      }
	    }
	  }

	  process.nextTick(cb.bind(null, null, send));
	};

	/**
	 * Immediately shuts down the connection
	 *
	 * @api public
	 */
	WebSocket.prototype.terminate = function terminate() {
	  if (this.readyState === WebSocket.CLOSED) return;

	  if (this._socket) {
	    this.readyState = WebSocket.CLOSING;

	    // End the connection
	    try { this._socket.end(); }
	    catch (e) {
	      // Socket error during end() call, so just destroy it right now
	      cleanupWebsocketResources.call(this, true);
	      return;
	    }

	    // Add a timeout to ensure that the connection is completely
	    // cleaned up within 30 seconds, even if the clean close procedure
	    // fails for whatever reason
	    // First cleanup any pre-existing timeout from an earlier "terminate" call,
	    // if one exists.  Otherwise terminate calls in quick succession will leak timeouts
	    // and hold the program open for `closeTimout` time.
	    if (this._closeTimer) { clearTimeout(this._closeTimer); }
	    this._closeTimer = setTimeout(cleanupWebsocketResources.bind(this, true), closeTimeout);
	  } else if (this.readyState === WebSocket.CONNECTING) {
	    cleanupWebsocketResources.call(this, true);
	  }
	};

	/**
	 * Expose bufferedAmount
	 *
	 * @api public
	 */
	Object.defineProperty(WebSocket.prototype, 'bufferedAmount', {
	  get: function get() {
	    var amount = 0;
	    if (this._socket) {
	      amount = this._socket.bufferSize || 0;
	    }
	    return amount;
	  }
	});

	/**
	 * Expose binaryType
	 *
	 * This deviates from the W3C interface since ws doesn't support the required
	 * default "blob" type (instead we define a custom "nodebuffer" type).
	 *
	 * @see http://dev.w3.org/html5/websockets/#the-websocket-interface
	 * @api public
	 */
	Object.defineProperty(WebSocket.prototype, 'binaryType', {
	  get: function get() {
	    return this._binaryType;
	  },
	  set: function set(type) {
	    if (type === 'arraybuffer' || type === 'nodebuffer')
	      this._binaryType = type;
	    else
	      throw new SyntaxError('unsupported binaryType: must be either "nodebuffer" or "arraybuffer"');
	  }
	});

	/**
	 * Emulates the W3C Browser based WebSocket interface using function members.
	 *
	 * @see http://dev.w3.org/html5/websockets/#the-websocket-interface
	 * @api public
	 */
	['open', 'error', 'close', 'message'].forEach(function(method) {
	  Object.defineProperty(WebSocket.prototype, 'on' + method, {
	    /**
	     * Returns the current listener
	     *
	     * @returns {Mixed} the set function or undefined
	     * @api public
	     */
	    get: function get() {
	      var listener = this.listeners(method)[0];
	      return listener ? (listener._listener ? listener._listener : listener) : undefined;
	    },

	    /**
	     * Start listening for events
	     *
	     * @param {Function} listener the listener
	     * @returns {Mixed} the set function or undefined
	     * @api public
	     */
	    set: function set(listener) {
	      this.removeAllListeners(method);
	      this.addEventListener(method, listener);
	    }
	  });
	});

	/**
	 * Emulates the W3C Browser based WebSocket interface using addEventListener.
	 *
	 * @see https://developer.mozilla.org/en/DOM/element.addEventListener
	 * @see http://dev.w3.org/html5/websockets/#the-websocket-interface
	 * @api public
	 */
	WebSocket.prototype.addEventListener = function(method, listener) {
	  var target = this;

	  function onMessage (data, flags) {
	    if (flags.binary && this.binaryType === 'arraybuffer')
	        data = new Uint8Array(data).buffer;
	    listener.call(target, new MessageEvent(data, !!flags.binary, target));
	  }

	  function onClose (code, message) {
	    listener.call(target, new CloseEvent(code, message, target));
	  }

	  function onError (event) {
	    event.type = 'error';
	    event.target = target;
	    listener.call(target, event);
	  }

	  function onOpen () {
	    listener.call(target, new OpenEvent(target));
	  }

	  if (typeof listener === 'function') {
	    if (method === 'message') {
	      // store a reference so we can return the original function from the
	      // addEventListener hook
	      onMessage._listener = listener;
	      this.on(method, onMessage);
	    } else if (method === 'close') {
	      // store a reference so we can return the original function from the
	      // addEventListener hook
	      onClose._listener = listener;
	      this.on(method, onClose);
	    } else if (method === 'error') {
	      // store a reference so we can return the original function from the
	      // addEventListener hook
	      onError._listener = listener;
	      this.on(method, onError);
	    } else if (method === 'open') {
	      // store a reference so we can return the original function from the
	      // addEventListener hook
	      onOpen._listener = listener;
	      this.on(method, onOpen);
	    } else {
	      this.on(method, listener);
	    }
	  }
	};

	module.exports = WebSocket;
	module.exports.buildHostHeader = buildHostHeader

	/**
	 * W3C MessageEvent
	 *
	 * @see http://www.w3.org/TR/html5/comms.html
	 * @constructor
	 * @api private
	 */
	function MessageEvent(dataArg, isBinary, target) {
	  this.type = 'message';
	  this.data = dataArg;
	  this.target = target;
	  this.binary = isBinary; // non-standard.
	}

	/**
	 * W3C CloseEvent
	 *
	 * @see http://www.w3.org/TR/html5/comms.html
	 * @constructor
	 * @api private
	 */
	function CloseEvent(code, reason, target) {
	  this.type = 'close';
	  this.wasClean = (typeof code === 'undefined' || code === 1000);
	  this.code = code;
	  this.reason = reason;
	  this.target = target;
	}

	/**
	 * W3C OpenEvent
	 *
	 * @see http://www.w3.org/TR/html5/comms.html
	 * @constructor
	 * @api private
	 */
	function OpenEvent(target) {
	  this.type = 'open';
	  this.target = target;
	}

	// Append port number to Host header, only if specified in the url
	// and non-default
	function buildHostHeader(isSecure, hostname, port) {
	  var headerHost = hostname;
	  if (hostname) {
	    if ((isSecure && (port != 443)) || (!isSecure && (port != 80))){
	      headerHost = headerHost + ':' + port;
	    }
	  }
	  return headerHost;
	}

	/**
	 * Entirely private apis,
	 * which may or may not be bound to a sepcific WebSocket instance.
	 */
	function initAsServerClient(req, socket, upgradeHead, options) {
	  options = new Options({
	    protocolVersion: protocolVersion,
	    protocol: null,
	    extensions: {},
	    maxPayload: 0
	  }).merge(options);

	  // expose state properties
	  this.protocol = options.value.protocol;
	  this.protocolVersion = options.value.protocolVersion;
	  this.extensions = options.value.extensions;
	  this.supports.binary = (this.protocolVersion !== 'hixie-76');
	  this.upgradeReq = req;
	  this.readyState = WebSocket.CONNECTING;
	  this._isServer = true;
	  this.maxPayload = options.value.maxPayload;
	  // establish connection
	  if (options.value.protocolVersion === 'hixie-76') {
	    establishConnection.call(this, ReceiverHixie, SenderHixie, socket, upgradeHead);
	  } else {
	    establishConnection.call(this, Receiver, Sender, socket, upgradeHead);
	  }
	}

	function initAsClient(address, protocols, options) {
	  options = new Options({
	    origin: null,
	    protocolVersion: protocolVersion,
	    host: null,
	    headers: null,
	    protocol: protocols.join(','),
	    agent: null,

	    // ssl-related options
	    pfx: null,
	    key: null,
	    passphrase: null,
	    cert: null,
	    ca: null,
	    ciphers: null,
	    rejectUnauthorized: null,
	    perMessageDeflate: true,
	    localAddress: null
	  }).merge(options);

	  if (options.value.protocolVersion !== 8 && options.value.protocolVersion !== 13) {
	    throw new Error('unsupported protocol version');
	  }

	  // verify URL and establish http class
	  var serverUrl = url.parse(address);
	  var isUnixSocket = serverUrl.protocol === 'ws+unix:';
	  if (!serverUrl.host && !isUnixSocket) throw new Error('invalid url');
	  var isSecure = serverUrl.protocol === 'wss:' || serverUrl.protocol === 'https:';
	  var httpObj = isSecure ? https : http;
	  var port = serverUrl.port || (isSecure ? 443 : 80);
	  var auth = serverUrl.auth;

	  // prepare extensions
	  var extensionsOffer = {};
	  var perMessageDeflate;
	  if (options.value.perMessageDeflate) {
	    perMessageDeflate = new PerMessageDeflate(typeof options.value.perMessageDeflate !== true ? options.value.perMessageDeflate : {}, false);
	    extensionsOffer[PerMessageDeflate.extensionName] = perMessageDeflate.offer();
	  }

	  // expose state properties
	  this._isServer = false;
	  this.url = address;
	  this.protocolVersion = options.value.protocolVersion;
	  this.supports.binary = (this.protocolVersion !== 'hixie-76');

	  // begin handshake
	  var key = new Buffer(options.value.protocolVersion + '-' + Date.now()).toString('base64');
	  var shasum = crypto.createHash('sha1');
	  shasum.update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
	  var expectedServerKey = shasum.digest('base64');

	  var agent = options.value.agent;

	  var headerHost = buildHostHeader(isSecure, serverUrl.hostname, port)

	  var requestOptions = {
	    port: port,
	    host: serverUrl.hostname,
	    headers: {
	      'Connection': 'Upgrade',
	      'Upgrade': 'websocket',
	      'Host': headerHost,
	      'Sec-WebSocket-Version': options.value.protocolVersion,
	      'Sec-WebSocket-Key': key
	    }
	  };

	  // If we have basic auth.
	  if (auth) {
	    requestOptions.headers.Authorization = 'Basic ' + new Buffer(auth).toString('base64');
	  }

	  if (options.value.protocol) {
	    requestOptions.headers['Sec-WebSocket-Protocol'] = options.value.protocol;
	  }

	  if (options.value.host) {
	    requestOptions.headers.Host = options.value.host;
	  }

	  if (options.value.headers) {
	    for (var header in options.value.headers) {
	       if (options.value.headers.hasOwnProperty(header)) {
	        requestOptions.headers[header] = options.value.headers[header];
	       }
	    }
	  }

	  if (Object.keys(extensionsOffer).length) {
	    requestOptions.headers['Sec-WebSocket-Extensions'] = Extensions.format(extensionsOffer);
	  }

	  if (options.isDefinedAndNonNull('pfx')
	   || options.isDefinedAndNonNull('key')
	   || options.isDefinedAndNonNull('passphrase')
	   || options.isDefinedAndNonNull('cert')
	   || options.isDefinedAndNonNull('ca')
	   || options.isDefinedAndNonNull('ciphers')
	   || options.isDefinedAndNonNull('rejectUnauthorized')) {

	    if (options.isDefinedAndNonNull('pfx')) requestOptions.pfx = options.value.pfx;
	    if (options.isDefinedAndNonNull('key')) requestOptions.key = options.value.key;
	    if (options.isDefinedAndNonNull('passphrase')) requestOptions.passphrase = options.value.passphrase;
	    if (options.isDefinedAndNonNull('cert')) requestOptions.cert = options.value.cert;
	    if (options.isDefinedAndNonNull('ca')) requestOptions.ca = options.value.ca;
	    if (options.isDefinedAndNonNull('ciphers')) requestOptions.ciphers = options.value.ciphers;
	    if (options.isDefinedAndNonNull('rejectUnauthorized')) requestOptions.rejectUnauthorized = options.value.rejectUnauthorized;

	    if (!agent) {
	        // global agent ignores client side certificates
	        agent = new httpObj.Agent(requestOptions);
	    }
	  }

	  requestOptions.path = serverUrl.path || '/';

	  if (agent) {
	    requestOptions.agent = agent;
	  }

	  if (isUnixSocket) {
	    requestOptions.socketPath = serverUrl.pathname;
	  }

	  if (options.value.localAddress) {
	    requestOptions.localAddress = options.value.localAddress;
	  }

	  if (options.value.origin) {
	    if (options.value.protocolVersion < 13) requestOptions.headers['Sec-WebSocket-Origin'] = options.value.origin;
	    else requestOptions.headers.Origin = options.value.origin;
	  }

	  var self = this;
	  var req = httpObj.request(requestOptions);

	  req.on('error', function onerror(error) {
	    self.emit('error', error);
	    cleanupWebsocketResources.call(self, error);
	  });

	  req.once('response', function response(res) {
	    var error;

	    if (!self.emit('unexpected-response', req, res)) {
	      error = new Error('unexpected server response (' + res.statusCode + ')');
	      req.abort();
	      self.emit('error', error);
	    }

	    cleanupWebsocketResources.call(self, error);
	  });

	  req.once('upgrade', function upgrade(res, socket, upgradeHead) {
	    if (self.readyState === WebSocket.CLOSED) {
	      // client closed before server accepted connection
	      self.emit('close');
	      self.removeAllListeners();
	      socket.end();
	      return;
	    }

	    var serverKey = res.headers['sec-websocket-accept'];
	    if (typeof serverKey === 'undefined' || serverKey !== expectedServerKey) {
	      self.emit('error', 'invalid server key');
	      self.removeAllListeners();
	      socket.end();
	      return;
	    }

	    var serverProt = res.headers['sec-websocket-protocol'];
	    var protList = (options.value.protocol || "").split(/, */);
	    var protError = null;

	    if (!options.value.protocol && serverProt) {
	      protError = 'server sent a subprotocol even though none requested';
	    } else if (options.value.protocol && !serverProt) {
	      protError = 'server sent no subprotocol even though requested';
	    } else if (serverProt && protList.indexOf(serverProt) === -1) {
	      protError = 'server responded with an invalid protocol';
	    }

	    if (protError) {
	      self.emit('error', protError);
	      self.removeAllListeners();
	      socket.end();
	      return;
	    } else if (serverProt) {
	      self.protocol = serverProt;
	    }

	    var serverExtensions = Extensions.parse(res.headers['sec-websocket-extensions']);
	    if (perMessageDeflate && serverExtensions[PerMessageDeflate.extensionName]) {
	      try {
	        perMessageDeflate.accept(serverExtensions[PerMessageDeflate.extensionName]);
	      } catch (err) {
	        self.emit('error', 'invalid extension parameter');
	        self.removeAllListeners();
	        socket.end();
	        return;
	      }
	      self.extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
	    }

	    establishConnection.call(self, Receiver, Sender, socket, upgradeHead);

	    // perform cleanup on http resources
	    req.removeAllListeners();
	    req = null;
	    agent = null;
	  });

	  req.end();
	  this.readyState = WebSocket.CONNECTING;
	}

	function establishConnection(ReceiverClass, SenderClass, socket, upgradeHead) {
	  var ultron = this._ultron = new Ultron(socket)
	    , called = false
	    , self = this;

	  socket.setTimeout(0);
	  socket.setNoDelay(true);

	  this._receiver = new ReceiverClass(this.extensions,this.maxPayload);
	  this._socket = socket;

	  // socket cleanup handlers
	  ultron.on('end', cleanupWebsocketResources.bind(this));
	  ultron.on('close', cleanupWebsocketResources.bind(this));
	  ultron.on('error', cleanupWebsocketResources.bind(this));

	  // ensure that the upgradeHead is added to the receiver
	  function firstHandler(data) {
	    if (called || self.readyState === WebSocket.CLOSED) return;

	    called = true;
	    socket.removeListener('data', firstHandler);
	    ultron.on('data', realHandler);

	    if (upgradeHead && upgradeHead.length > 0) {
	      realHandler(upgradeHead);
	      upgradeHead = null;
	    }

	    if (data) realHandler(data);
	  }

	  // subsequent packets are pushed straight to the receiver
	  function realHandler(data) {
	    self.bytesReceived += data.length;
	    self._receiver.add(data);
	  }

	  ultron.on('data', firstHandler);

	  // if data was passed along with the http upgrade,
	  // this will schedule a push of that on to the receiver.
	  // this has to be done on next tick, since the caller
	  // hasn't had a chance to set event handlers on this client
	  // object yet.
	  process.nextTick(firstHandler);

	  // receiver event handlers
	  self._receiver.ontext = function ontext(data, flags) {
	    flags = flags || {};

	    self.emit('message', data, flags);
	  };

	  self._receiver.onbinary = function onbinary(data, flags) {
	    flags = flags || {};

	    flags.binary = true;
	    self.emit('message', data, flags);
	  };

	  self._receiver.onping = function onping(data, flags) {
	    flags = flags || {};

	    self.pong(data, {
	      mask: !self._isServer,
	      binary: flags.binary === true
	    }, true);

	    self.emit('ping', data, flags);
	  };

	  self._receiver.onpong = function onpong(data, flags) {
	    self.emit('pong', data, flags || {});
	  };

	  self._receiver.onclose = function onclose(code, data, flags) {
	    flags = flags || {};

	    self._closeReceived = true;
	    self.close(code, data);
	  };

	  self._receiver.onerror = function onerror(reason, errorCode) {
	    // close the connection when the receiver reports a HyBi error code
	    self.close(typeof errorCode !== 'undefined' ? errorCode : 1002, '');
	    self.emit('error', (reason instanceof Error) ? reason : (new Error(reason)));
	  };

	  // finalize the client
	  this._sender = new SenderClass(socket, this.extensions);
	  this._sender.on('error', function onerror(error) {
	    self.close(1002, '');
	    self.emit('error', error);
	  });

	  this.readyState = WebSocket.OPEN;
	  this.emit('open');
	}

	function startQueue(instance) {
	  instance._queue = instance._queue || [];
	}

	function executeQueueSends(instance) {
	  var queue = instance._queue;
	  if (typeof queue === 'undefined') return;

	  delete instance._queue;
	  for (var i = 0, l = queue.length; i < l; ++i) {
	    queue[i]();
	  }
	}

	function sendStream(instance, stream, options, cb) {
	  stream.on('data', function incoming(data) {
	    if (instance.readyState !== WebSocket.OPEN) {
	      if (typeof cb === 'function') cb(new Error('not opened'));
	      else {
	        delete instance._queue;
	        instance.emit('error', new Error('not opened'));
	      }
	      return;
	    }

	    options.fin = false;
	    instance._sender.send(data, options);
	  });

	  stream.on('end', function end() {
	    if (instance.readyState !== WebSocket.OPEN) {
	      if (typeof cb === 'function') cb(new Error('not opened'));
	      else {
	        delete instance._queue;
	        instance.emit('error', new Error('not opened'));
	      }
	      return;
	    }

	    options.fin = true;
	    instance._sender.send(null, options);

	    if (typeof cb === 'function') cb(null);
	  });
	}

	function cleanupWebsocketResources(error) {
	  if (this.readyState === WebSocket.CLOSED) return;

	  this.readyState = WebSocket.CLOSED;

	  clearTimeout(this._closeTimer);
	  this._closeTimer = null;

	  // If the connection was closed abnormally (with an error), or if
	  // the close control frame was not received then the close code
	  // must default to 1006.
	  if (error || !this._closeReceived) {
	    this._closeCode = 1006;
	  }
	  this.emit('close', this._closeCode || 1000, this._closeMessage || '');

	  if (this._socket) {
	    if (this._ultron) this._ultron.destroy();
	    this._socket.on('error', function onerror() {
	      try { this.destroy(); }
	      catch (e) {}
	    });

	    try {
	      if (!error) this._socket.end();
	      else this._socket.destroy();
	    } catch (e) { /* Ignore termination errors */ }

	    this._socket = null;
	    this._ultron = null;
	  }

	  if (this._sender) {
	    this._sender.removeAllListeners();
	    this._sender = null;
	  }

	  if (this._receiver) {
	    this._receiver.cleanup();
	    this._receiver = null;
	  }

	  if (this.extensions[PerMessageDeflate.extensionName]) {
	    this.extensions[PerMessageDeflate.extensionName].cleanup();
	  }

	  this.extensions = null;

	  this.removeAllListeners();
	  this.on('error', function onerror() {}); // catch all errors after this
	  delete this._queue;
	}


/***/ },
/* 18 */
/***/ function(module, exports) {

	module.exports = require("crypto");

/***/ },
/* 19 */
/***/ function(module, exports) {

	module.exports = require("http");

/***/ },
/* 20 */
/***/ function(module, exports) {

	module.exports = require("url");

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	var { EventEmitter } = __webpack_require__(2);

	var assign = __webpack_require__(4);
	var guid = __webpack_require__(41);

	/**
	 * The agent lives on the page in the same context as React, observes events
	 * from the `backend`, and communicates (via a `Bridge`) with the frontend.
	 *
	 * It is responsible for generating string IDs (ElementID) for each react
	 * element, maintaining a mapping of those IDs to elements, handling messages
	 * from the frontend, and translating between react elements and native
	 * handles.
	 *
	 *
	 *   React
	 *     |
	 *     v
	 *  backend
	 *     |
	 *     v
	 *  -----------
	 * | **Agent** |
	 *  -----------
	 *     ^
	 *     |
	 *     v
	 *  (Bridge)
	 *     ^
	 *     |
	 * serialization
	 *     |
	 *     v
	 *  (Bridge)
	 *     ^
	 *     |
	 *     v
	 *  ----------------
	 * | Frontend Store |
	 *  ----------------
	 *
	 *
	 * Events from the `backend`:
	 * - root (got a root)
	 * - mount (a component mounted)
	 * - update (a component updated)
	 * - unmount (a component mounted)
	 *
	 * Events from the `frontend` Store:
	 * - see `addBridge` for subscriptions
	 *
	 * Events that Agent fires:
	 * - selected
	 * - hideHighlight
	 * - startInspecting
	 * - stopInspecting
	 * - shutdown
	 * - highlight /highlightMany
	 * - setSelection
	 * - root
	 * - mount
	 * - update
	 * - unmount
	 */
	class Agent extends EventEmitter {

	  constructor(global, capabilities) {
	    super();
	    this.global = global;
	    this.reactElements = new Map();
	    this.ids = new WeakMap();
	    this.renderers = new Map();
	    this.elementData = new Map();
	    this.roots = new Set();
	    this.reactInternals = {};
	    this.on('selected', id => {
	      var data = this.elementData.get(id);
	      if (data && data.publicInstance) {
	        this.global.$r = data.publicInstance;
	      }
	    });
	    this._prevSelected = null;
	    var isReactDOM = window.document && typeof window.document.createElement === 'function';
	    this.capabilities = assign({
	      scroll: isReactDOM && typeof window.document.body.scrollIntoView === 'function',
	      dom: isReactDOM,
	      editTextContent: false
	    }, capabilities);
	  }

	  // returns an "unsubscribe" function

	  // the window or global -> used to "make a value available in the console"
	  sub(ev, fn) {
	    this.on(ev, fn);
	    return () => {
	      this.removeListener(ev, fn);
	    };
	  }

	  setReactInternals(renderer, reactInternals) {
	    this.reactInternals[renderer] = reactInternals;
	  }

	  addBridge(bridge) {
	    /** Events received from the frontend **/
	    // the initial handshake
	    bridge.on('requestCapabilities', () => {
	      bridge.send('capabilities', this.capabilities);
	      this.emit('connected');
	    });
	    bridge.on('setState', this._setState.bind(this));
	    bridge.on('setProps', this._setProps.bind(this));
	    bridge.on('setContext', this._setContext.bind(this));
	    bridge.on('makeGlobal', this._makeGlobal.bind(this));
	    bridge.on('highlight', id => this.highlight(id));
	    bridge.on('highlightMany', id => this.highlightMany(id));
	    bridge.on('hideHighlight', () => this.emit('hideHighlight'));
	    bridge.on('startInspecting', () => this.emit('startInspecting'));
	    bridge.on('stopInspecting', () => this.emit('stopInspecting'));
	    bridge.on('selected', id => this.emit('selected', id));
	    bridge.on('shutdown', () => this.emit('shutdown'));
	    bridge.on('changeTextContent', ({ id, text }) => {
	      var node = this.getNodeForID(id);
	      if (!node) {
	        return;
	      }
	      node.textContent = text;
	    });
	    // used to "inspect node in Elements pane"
	    bridge.on('putSelectedNode', id => {
	      window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$node = this.getNodeForID(id);
	    });
	    // used to "view source in Sources pane"
	    bridge.on('putSelectedInstance', id => {
	      var node = this.elementData.get(id);
	      if (node && node.publicInstance) {
	        window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$inst = node.publicInstance;
	      } else {
	        window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$inst = null;
	      }
	    });
	    // used to select the inspected node ($0)
	    bridge.on('checkSelection', () => {
	      var newSelected = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$0;
	      if (newSelected !== this._prevSelected) {
	        this._prevSelected = newSelected;
	        var sentSelected = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$node;
	        if (newSelected !== sentSelected) {
	          this.selectFromDOMNode(newSelected, true);
	        }
	      }
	    });
	    bridge.on('scrollToNode', id => this.scrollToNode(id));
	    bridge.on('bananaslugchange', value => this.emit('bananaslugchange', value));

	    /** Events sent to the frontend **/
	    this.on('root', id => bridge.send('root', id));
	    this.on('mount', data => bridge.send('mount', data));
	    this.on('update', data => bridge.send('update', data));
	    this.on('unmount', id => {
	      bridge.send('unmount', id);
	      // once an element has been unmounted, the bridge doesn't need to be
	      // able to inspect it anymore.
	      bridge.forget(id);
	    });
	    this.on('setSelection', data => bridge.send('select', data));
	  }

	  scrollToNode(id) {
	    var node = this.getNodeForID(id);
	    if (!node) {
	      return;
	    }
	    if (node.scrollIntoViewIfNeeded) {
	      node.scrollIntoViewIfNeeded();
	    } else {
	      node.scrollIntoView();
	    }
	    this.highlight(id);
	  }

	  highlight(id) {
	    var data = this.elementData.get(id);
	    var node = this.getNodeForID(id);
	    if (data && node) {
	      this.emit('highlight', { node, name: data.name, props: data.props });
	    }
	  }

	  highlightMany(ids) {
	    var nodes = [];
	    ids.forEach(id => {
	      var node = this.getNodeForID(id);
	      if (node) {
	        nodes.push(node);
	      }
	    });
	    if (nodes.length) {
	      this.emit('highlightMany', nodes);
	    }
	  }

	  getNodeForID(id) {
	    var component = this.reactElements.get(id);
	    if (!component) {
	      return null;
	    }
	    var renderer = this.renderers.get(id);
	    if (renderer && this.reactInternals[renderer].getNativeFromReactElement) {
	      return this.reactInternals[renderer].getNativeFromReactElement(component);
	    }
	  }

	  selectFromDOMNode(node, quiet) {
	    var id = this.getIDForNode(node);
	    if (!id) {
	      return;
	    }
	    this.emit('setSelection', { id, quiet });
	  }

	  selectFromReactInstance(instance, quiet) {
	    var id = this.getId(instance);
	    if (!id) {
	      return;
	    }
	    this.emit('setSelection', { id, quiet });
	  }

	  getIDForNode(node) {
	    if (!this.reactInternals) {
	      return null;
	    }
	    var component;
	    for (var renderer in this.reactInternals) {
	      // If a renderer doesn't know about a reactId, it will throw an error.
	      try {
	        // $FlowFixMe possibly null - it's not null
	        component = this.reactInternals[renderer].getReactElementFromNative(node);
	      } catch (e) {}
	      if (component) {
	        return this.getId(component);
	      }
	    }
	  }

	  _setProps({ id, path, value }) {
	    var data = this.elementData.get(id);
	    if (data && data.updater && data.updater.setInProps) {
	      data.updater.setInProps(path, value);
	    } else {}
	  }

	  _setState({ id, path, value }) {
	    var data = this.elementData.get(id);
	    if (data && data.updater && data.updater.setInState) {
	      data.updater.setInState(path, value);
	    } else {}
	  }

	  _setContext({ id, path, value }) {
	    var data = this.elementData.get(id);
	    if (data && data.updater && data.updater.setInContext) {
	      data.updater.setInContext(path, value);
	    } else {}
	  }

	  _makeGlobal({ id, path }) {
	    var data = this.elementData.get(id);
	    if (!data) {
	      return;
	    }
	    var value;
	    if (path === 'instance') {
	      value = data.publicInstance;
	    } else {
	      value = getIn(data, path);
	    }
	    this.global.$tmp = value;
	  }

	  getId(element) {
	    if (typeof element !== 'object') {
	      return element;
	    }
	    if (!this.ids.has(element)) {
	      this.ids.set(element, guid());
	      this.reactElements.set(this.ids.get(element), element);
	    }
	    return this.ids.get(element);
	  }

	  addRoot(renderer, element) {
	    var id = this.getId(element);
	    this.roots.add(id);
	    this.emit('root', id);
	  }

	  onMounted(renderer, component, data) {
	    var id = this.getId(component);
	    this.renderers.set(id, renderer);
	    this.elementData.set(id, data);

	    var send = assign({}, data);
	    if (send.children && send.children.map) {
	      send.children = send.children.map(c => this.getId(c));
	    }
	    send.id = id;
	    send.canUpdate = send.updater && !!send.updater.forceUpdate;
	    delete send.type;
	    delete send.updater;
	    this.emit('mount', send);
	  }

	  onUpdated(component, data) {
	    var id = this.getId(component);
	    this.elementData.set(id, data);

	    var send = assign({}, data);
	    if (send.children && send.children.map) {
	      send.children = send.children.map(c => this.getId(c));
	    }
	    send.id = id;
	    send.canUpdate = send.updater && !!send.updater.forceUpdate;
	    delete send.type;
	    delete send.updater;
	    this.emit('update', send);
	  }

	  onUnmounted(component) {
	    var id = this.getId(component);
	    this.elementData.delete(id);
	    this.roots.delete(id);
	    this.renderers.delete(id);
	    this.emit('unmount', id);
	    this.ids.delete(component);
	  }
	}

	function getIn(base, path) {
	  return path.reduce((obj, attr) => {
	    return obj ? obj[attr] : null;
	  }, base);
	}

	module.exports = Agent;

/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var consts = __webpack_require__(5);
	var hydrate = __webpack_require__(24);
	var dehydrate = __webpack_require__(23);
	var performanceNow = __webpack_require__(64);

	/**
	 * The bridge is responsible for serializing requests between the Agent and
	 * the Frontend Store. It needs to be connected to a Wall object that can send
	 * JSONable data to the bridge on the other side.
	 *
	 * complex data
	 *     |
	 *     v
	 *  [Bridge]
	 *     |
	 * jsonable data
	 *     |
	 *     v
	 *   [wall]
	 *     |
	 *     v
	 * ~ some barrier ~
	 *     |
	 *     v
	 *   [wall]
	 *     |
	 *     v
	 *  [Bridge]
	 *     |
	 *     v
	 * "hydrated" data
	 *
	 * When an item is passed in that can't be serialized (anything other than a
	 * plain array, object, or literal value), the object is "cleaned", and
	 * rehydrated on the other side with `Symbol` attributes indicating that the
	 * object needs to be inspected for more detail.
	 *
	 * Example:
	 *
	 * bridge.send('evname', {id: 'someid', foo: MyCoolObjectInstance})
	 * ->
	 * shows up, hydrated as
	 * {
	 *   id: 'someid',
	 *   foo: {
	 *     [consts.name]: 'MyCoolObjectInstance',
	 *     [consts.type]: 'object',
	 *     [consts.meta]: {},
	 *     [consts.inspected]: false,
	 *   }
	 * }
	 *
	 * The `consts` variables are Symbols, and as such are non-ennumerable.
	 * The front-end therefore needs to check for `consts.inspected` on received
	 * objects, and can thereby display object proxies and inspect them.
	 *
	 * Complex objects that are passed are expected to have a top-level `id`
	 * attribute, which is used for later lookup + inspection. Once it has been
	 * determined that an object is no longer needed, call `.forget(id)` to clean
	 * up.
	 */
	class Bridge {

	  constructor(wall) {
	    this._cbs = new Map();
	    this._inspectables = new Map();
	    this._cid = 0;
	    this._listeners = {};
	    this._buffer = [];
	    this._waiting = null;
	    this._lastTime = 5;
	    this._callers = {};
	    this._paused = false;
	    this._wall = wall;

	    wall.listen(this._handleMessage.bind(this));
	  }

	  inspect(id, path, cb) {
	    var _cid = this._cid++;
	    this._cbs.set(_cid, (data, cleaned, proto, protoclean) => {
	      if (cleaned.length) {
	        hydrate(data, cleaned);
	      }
	      if (proto && protoclean.length) {
	        hydrate(proto, protoclean);
	      }
	      if (proto) {
	        data[consts.proto] = proto;
	      }
	      cb(data);
	    });

	    this._wall.send({
	      type: 'inspect',
	      callback: _cid,
	      path,
	      id
	    });
	  }

	  call(name, args, cb) {
	    var _cid = this._cid++;
	    this._cbs.set(_cid, cb);

	    this._wall.send({
	      type: 'call',
	      callback: _cid,
	      args,
	      name
	    });
	  }

	  onCall(name, handler) {
	    if (this._callers[name]) {
	      throw new Error('only one call handler per call name allowed');
	    }
	    this._callers[name] = handler;
	  }

	  pause() {
	    this._wall.send({
	      type: 'pause'
	    });
	  }

	  resume() {
	    this._wall.send({
	      type: 'resume'
	    });
	  }

	  setInspectable(id, data) {
	    var prev = this._inspectables.get(id);
	    if (!prev) {
	      this._inspectables.set(id, data);
	      return;
	    }
	    this._inspectables.set(id, _extends({}, prev, data));
	  }

	  sendOne(evt, data) {
	    var cleaned = [];
	    var san = dehydrate(data, cleaned);
	    if (cleaned.length) {
	      this.setInspectable(data.id, data);
	    }
	    this._wall.send({ type: 'event', evt, data: san, cleaned });
	  }

	  send(evt, data) {
	    if (!this._waiting && !this._paused) {
	      this._buffer = [];
	      var nextTime = this._lastTime * 3;
	      if (nextTime > 500) {
	        // flush is taking an unexpected amount of time
	        nextTime = 500;
	      }
	      this._waiting = setTimeout(() => {
	        this.flush();
	        this._waiting = null;
	      }, nextTime);
	    }
	    this._buffer.push({ evt, data });
	  }

	  flush() {
	    var start = performanceNow();
	    var events = this._buffer.map(({ evt, data }) => {
	      var cleaned = [];
	      var san = dehydrate(data, cleaned);
	      if (cleaned.length) {
	        this.setInspectable(data.id, data);
	      }
	      return { type: 'event', evt, data: san, cleaned };
	    });
	    this._wall.send({ type: 'many-events', events });
	    this._buffer = [];
	    this._waiting = null;
	    this._lastTime = performanceNow() - start;
	  }

	  forget(id) {
	    this._inspectables.delete(id);
	  }

	  on(evt, fn) {
	    if (!this._listeners[evt]) {
	      this._listeners[evt] = [fn];
	    } else {
	      this._listeners[evt].push(fn);
	    }
	  }

	  off(evt, fn) {
	    if (!this._listeners[evt]) {
	      return;
	    }
	    var ix = this._listeners[evt].indexOf(fn);
	    if (ix !== -1) {
	      this._listeners[evt].splice(ix, 1);
	    }
	  }

	  once(evt, fn) {
	    var self = this;
	    var listener = function listener() {
	      fn.apply(this, arguments);
	      self.off(evt, listener);
	    };
	    this.on(evt, listener);
	  }

	  _handleMessage(payload) {
	    if (payload.type === 'resume') {
	      this._paused = false;
	      this._waiting = null;
	      this.flush();
	      return;
	    }

	    if (payload.type === 'pause') {
	      this._paused = true;
	      clearTimeout(this._waiting);
	      this._waiting = null;
	      return;
	    }

	    if (payload.type === 'callback') {
	      var callback = this._cbs.get(payload.id);
	      if (callback) {
	        callback(...payload.args);
	        this._cbs.delete(payload.id);
	      }
	      return;
	    }

	    if (payload.type === 'call') {
	      this._handleCall(payload.name, payload.args, payload.callback);
	      return;
	    }

	    if (payload.type === 'inspect') {
	      this._inspectResponse(payload.id, payload.path, payload.callback);
	      return;
	    }

	    if (payload.type === 'event') {
	      // console.log('[bridge<-]', payload.evt);
	      if (payload.cleaned) {
	        hydrate(payload.data, payload.cleaned);
	      }
	      var fns = this._listeners[payload.evt];
	      var data = payload.data;
	      if (fns) {
	        fns.forEach(fn => fn(data));
	      }
	    }

	    if (payload.type === 'many-events') {
	      payload.events.forEach(event => {
	        // console.log('[bridge<-]', payload.evt);
	        if (event.cleaned) {
	          hydrate(event.data, event.cleaned);
	        }
	        var handlers = this._listeners[event.evt];
	        if (handlers) {
	          handlers.forEach(fn => fn(event.data));
	        }
	      });
	    }
	  }

	  _handleCall(name, args, callback) {
	    if (!this._callers[name]) {
	      return;
	    }
	    args = !Array.isArray(args) ? [args] : args;
	    var result;
	    try {
	      result = this._callers[name].apply(null, args);
	    } catch (e) {
	      return undefined;
	    }
	    this._wall.send({
	      type: 'callback',
	      id: callback,
	      args: [result]
	    });
	  }

	  _inspectResponse(id, path, callback) {
	    var inspectable = this._inspectables.get(id);

	    var result = {};
	    var cleaned = [];
	    var proto = null;
	    var protoclean = [];
	    if (inspectable) {
	      var val = getIn(inspectable, path);
	      var protod = false;
	      var isFn = typeof val === 'function';
	      Object.getOwnPropertyNames(val).forEach(name => {
	        if (name === '__proto__') {
	          protod = true;
	        }
	        if (isFn && (name === 'arguments' || name === 'callee' || name === 'caller')) {
	          return;
	        }
	        result[name] = dehydrate(val[name], cleaned, [name]);
	      });

	      /* eslint-disable no-proto */
	      if (!protod && val.__proto__ && val.constructor.name !== 'Object') {
	        var newProto = {};
	        var pIsFn = typeof val.__proto__ === 'function';
	        Object.getOwnPropertyNames(val.__proto__).forEach(name => {
	          if (pIsFn && (name === 'arguments' || name === 'callee' || name === 'caller')) {
	            return;
	          }
	          newProto[name] = dehydrate(val.__proto__[name], protoclean, [name]);
	        });
	        proto = newProto;
	      }
	      /* eslint-enable no-proto */
	    }

	    this._wall.send({
	      type: 'callback',
	      id: callback,
	      args: [result, cleaned, proto, protoclean]
	    });
	  }
	}

	function getIn(base, path) {
	  return path.reduce((obj, attr) => {
	    return obj ? obj[attr] : null;
	  }, base);
	}

	module.exports = Bridge;

/***/ },
/* 23 */
/***/ function(module, exports) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	/**
	 * Strip out complex data (instances, functions, and data nested > 2 levels
	 * deep). The paths of the stripped out objects are appended to the `cleaned`
	 * list. On the other side of the barrier, the cleaned list is used to
	 * "re-hydrate" the cleaned representation into an object with symbols as
	 * attributes, so that a sanitized object can be distinguished from a normal
	 * object.
	 *
	 * Input: {"some": {"attr": fn()}, "other": AnInstance}
	 * Output: {
	 *   "some": {
	 *     "attr": {"name": the fn.name, type: "function"}
	 *   },
	 *   "other": {
	 *     "name": "AnInstance",
	 *     "type": "object",
	 *   },
	 * }
	 * and cleaned = [["some", "attr"], ["other"]]
	 */

	function dehydrate(data, cleaned, path, level) {
	  level = level || 0;
	  path = path || [];
	  if (typeof data === 'function') {
	    cleaned.push(path);
	    return {
	      name: data.name,
	      type: 'function'
	    };
	  }
	  if (!data || typeof data !== 'object') {
	    if (typeof data === 'string' && data.length > 500) {
	      return data.slice(0, 500) + '...';
	    }
	    // We have to do this assignment b/c Flow doesn't think "symbol" is
	    // something typeof would return. Error 'unexpected predicate "symbol"'
	    var type = typeof data;
	    if (type === 'symbol') {
	      cleaned.push(path);
	      return {
	        type: 'symbol',
	        name: data.toString()
	      };
	    }
	    return data;
	  }
	  if (data._reactFragment) {
	    // React Fragments error if you try to inspect them.
	    return 'A react fragment';
	  }
	  if (level > 2) {
	    cleaned.push(path);
	    return {
	      type: Array.isArray(data) ? 'array' : 'object',
	      name: !data.constructor || data.constructor.name === 'Object' ? '' : data.constructor.name,
	      meta: Array.isArray(data) ? {
	        length: data.length
	      } : null
	    };
	  }
	  if (Array.isArray(data)) {
	    // $FlowFixMe path is not undefined.
	    return data.map((item, i) => dehydrate(item, cleaned, path.concat([i]), level + 1));
	  }
	  // TODO when this is in the iframe window, we can just use Object
	  if (data.constructor && typeof data.constructor === 'function' && data.constructor.name !== 'Object') {
	    cleaned.push(path);
	    return {
	      name: data.constructor.name,
	      type: 'object'
	    };
	  }
	  var res = {};
	  for (var name in data) {
	    res[name] = dehydrate(data[name], cleaned, path.concat([name]), level + 1);
	  }
	  return res;
	}

	module.exports = dehydrate;

/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	var consts = __webpack_require__(5);

	function hydrate(data, cleaned) {
	  cleaned.forEach(path => {
	    var last = path.pop();
	    var obj = path.reduce((obj_, attr) => obj_ ? obj_[attr] : null, data);
	    if (!obj || !obj[last]) {
	      return;
	    }
	    var replace = {};
	    replace[consts.name] = obj[last].name;
	    replace[consts.type] = obj[last].type;
	    replace[consts.meta] = obj[last].meta;
	    replace[consts.inspected] = false;
	    obj[last] = replace;
	  });
	}

	module.exports = hydrate;

/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	var setupBackend = __webpack_require__(27);

	module.exports = function (hook, agent) {
	  var subs = [hook.sub('renderer-attached', ({ id, renderer, helpers }) => {
	    agent.setReactInternals(id, helpers);
	    helpers.walkTree(agent.onMounted.bind(agent, id), agent.addRoot.bind(agent, id));
	  }), hook.sub('root', ({ renderer, element }) => agent.addRoot(renderer, element)), hook.sub('mount', ({ renderer, element, data }) => agent.onMounted(renderer, element, data)), hook.sub('update', ({ renderer, element, data }) => agent.onUpdated(element, data)), hook.sub('unmount', ({ renderer, element }) => agent.onUnmounted(element))];

	  var success = setupBackend(hook);
	  if (!success) {
	    return;
	  }

	  hook.emit('react-devtools', agent);
	  hook.reactDevtoolsAgent = agent;
	  agent.on('shutdown', () => {
	    subs.forEach(fn => fn());
	    hook.reactDevtoolsAgent = null;
	  });
	};

/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	var getData = __webpack_require__(28);
	var getData012 = __webpack_require__(29);

	/**
	 * This takes care of patching the renderer to emit events on the global
	 * `Hook`. The returned object has a `.cleanup` method to un-patch everything.
	 */
	function attachRenderer(hook, rid, renderer) {
	  var rootNodeIDMap = new Map();
	  var extras = {};
	  // Before 0.13 there was no Reconciler, so we patch Component.Mixin
	  var isPre013 = !renderer.Reconciler;

	  // React Native
	  if (renderer.Mount.findNodeHandle && renderer.Mount.nativeTagToRootNodeID) {
	    extras.getNativeFromReactElement = function (component) {
	      return renderer.Mount.findNodeHandle(component);
	    };

	    extras.getReactElementFromNative = function (nativeTag) {
	      var id = renderer.Mount.nativeTagToRootNodeID(nativeTag);
	      return rootNodeIDMap.get(id);
	    };
	    // React DOM 15+
	  } else if (renderer.ComponentTree) {
	      extras.getNativeFromReactElement = function (component) {
	        return renderer.ComponentTree.getNodeFromInstance(component);
	      };

	      extras.getReactElementFromNative = function (node) {
	        return renderer.ComponentTree.getClosestInstanceFromNode(node);
	      };
	      // React DOM
	    } else if (renderer.Mount.getID && renderer.Mount.getNode) {
	        extras.getNativeFromReactElement = function (component) {
	          try {
	            return renderer.Mount.getNode(component._rootNodeID);
	          } catch (e) {}
	        };

	        extras.getReactElementFromNative = function (node) {
	          var id = renderer.Mount.getID(node);
	          while (node && node.parentNode && !id) {
	            node = node.parentNode;
	            id = renderer.Mount.getID(node);
	          }
	          return rootNodeIDMap.get(id);
	        };
	      } else {}

	  var oldMethods;
	  var oldRenderComponent;
	  var oldRenderRoot;

	  // React DOM
	  if (renderer.Mount._renderNewRootComponent) {
	    oldRenderRoot = decorateResult(renderer.Mount, '_renderNewRootComponent', element => {
	      hook.emit('root', { renderer: rid, element });
	    });
	    // React Native
	  } else if (renderer.Mount.renderComponent) {
	      oldRenderComponent = decorateResult(renderer.Mount, 'renderComponent', element => {
	        hook.emit('root', { renderer: rid, element: element._reactInternalInstance });
	      });
	    }

	  if (renderer.Component) {
	    // 0.11 - 0.12
	    // $FlowFixMe renderer.Component is not "possibly undefined"
	    oldMethods = decorateMany(renderer.Component.Mixin, {
	      mountComponent() {
	        rootNodeIDMap.set(this._rootNodeID, this);
	        // FIXME DOMComponent calls Component.Mixin, and sets up the
	        // `children` *after* that call, meaning we don't have access to the
	        // children at this point. Maybe we should find something else to shim
	        // (do we have access to DOMComponent here?) so that we don't have to
	        // setTimeout.
	        setTimeout(() => {
	          hook.emit('mount', { element: this, data: getData012(this), renderer: rid });
	        }, 0);
	      },
	      updateComponent() {
	        setTimeout(() => {
	          hook.emit('update', { element: this, data: getData012(this), renderer: rid });
	        }, 0);
	      },
	      unmountComponent() {
	        hook.emit('unmount', { element: this, renderer: rid });
	        rootNodeIDMap.delete(this._rootNodeID, this);
	      }
	    });
	  } else if (renderer.Reconciler) {
	    oldMethods = decorateMany(renderer.Reconciler, {
	      mountComponent(element, rootID, transaction, context) {
	        var data = getData(element);
	        rootNodeIDMap.set(element._rootNodeID, element);
	        hook.emit('mount', { element, data, renderer: rid });
	      },
	      performUpdateIfNecessary(element, nextChild, transaction, context) {
	        hook.emit('update', { element, data: getData(element), renderer: rid });
	      },
	      receiveComponent(element, nextChild, transaction, context) {
	        hook.emit('update', { element, data: getData(element), renderer: rid });
	      },
	      unmountComponent(element) {
	        hook.emit('unmount', { element, renderer: rid });
	        rootNodeIDMap.delete(element._rootNodeID, element);
	      }
	    });
	  }

	  extras.walkTree = function (visit, visitRoot) {
	    var onMount = (component, data) => {
	      rootNodeIDMap.set(component._rootNodeID, component);
	      visit(component, data);
	    };
	    walkRoots(renderer.Mount._instancesByReactRootID || renderer.Mount._instancesByContainerID, onMount, visitRoot, isPre013);
	  };

	  extras.cleanup = function () {
	    if (oldMethods) {
	      if (renderer.Component) {
	        restoreMany(renderer.Component.Mixin, oldMethods);
	      } else {
	        restoreMany(renderer.Reconciler, oldMethods);
	      }
	    }
	    if (oldRenderRoot) {
	      renderer.Mount._renderNewRootComponent = oldRenderRoot;
	    }
	    if (oldRenderComponent) {
	      renderer.Mount.renderComponent = oldRenderComponent;
	    }
	    oldMethods = null;
	    oldRenderRoot = null;
	    oldRenderComponent = null;
	  };

	  return extras;
	}

	function walkRoots(roots, onMount, onRoot, isPre013) {
	  for (var name in roots) {
	    walkNode(roots[name], onMount, isPre013);
	    onRoot(roots[name]);
	  }
	}

	function walkNode(element, onMount, isPre013) {
	  var data = isPre013 ? getData012(element) : getData(element);
	  if (data.children && Array.isArray(data.children)) {
	    data.children.forEach(child => walkNode(child, onMount, isPre013));
	  }
	  onMount(element, data);
	}

	function decorateResult(obj, attr, fn) {
	  var old = obj[attr];
	  obj[attr] = function (instance) {
	    var res = old.apply(this, arguments);
	    fn(res);
	    return res;
	  };
	  return old;
	}

	function decorate(obj, attr, fn) {
	  var old = obj[attr];
	  obj[attr] = function (instance) {
	    var res = old.apply(this, arguments);
	    fn.apply(this, arguments);
	    return res;
	  };
	  return old;
	}

	function decorateMany(source, fns) {
	  var olds = {};
	  for (var name in fns) {
	    olds[name] = decorate(source, name, fns[name]);
	  }
	  return olds;
	}

	function restoreMany(source, olds) {
	  for (var name in olds) {
	    source[name] = olds[name];
	  }
	}

	module.exports = attachRenderer;

/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 *
	 * This is the chrome devtools
	 *
	 * 1. Devtools sets the __REACT_DEVTOOLS_GLOBAL_HOOK__ global.
	 * 2. React (if present) calls .inject() with the internal renderer
	 * 3. Devtools sees the renderer, and then adds this backend, along with the Agent
	 *    and whatever else is needed.
	 * 4. The agend then calls `.emit('react-devtools', agent)`
	 *
	 * Now things are hooked up.
	 *
	 * When devtools closes, it calls `cleanup()` to remove the listeners
	 * and any overhead caused by the backend.
	 */
	'use strict';

	var attachRenderer = __webpack_require__(26);

	module.exports = function setupBackend(hook) {
	  var oldReact = window.React && window.React.__internals;
	  if (oldReact && Object.keys(hook._renderers).length === 0) {
	    hook.inject(oldReact);
	  }

	  for (var rid in hook._renderers) {
	    hook.helpers[rid] = attachRenderer(hook, rid, hook._renderers[rid]);
	    hook.emit('renderer-attached', { id: rid, renderer: hook._renderers[rid], helpers: hook.helpers[rid] });
	  }

	  hook.on('renderer', ({ id, renderer }) => {
	    hook.helpers[id] = attachRenderer(hook, id, renderer);
	    hook.emit('renderer-attached', { id, renderer, helpers: hook.helpers[id] });
	  });

	  var shutdown = () => {
	    for (var id in hook.helpers) {
	      hook.helpers[id].cleanup();
	    }
	    hook.off('shutdown', shutdown);
	  };
	  hook.on('shutdown', shutdown);

	  return true;
	};

/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var copyWithSet = __webpack_require__(6);

	/**
	 * Convert a react internal instance to a sanitized data object.
	 */
	function getData(element) {
	  var children = null;
	  var props = null;
	  var state = null;
	  var context = null;
	  var updater = null;
	  var name = null;
	  var type = null;
	  var text = null;
	  var publicInstance = null;
	  var nodeType = 'Native';
	  // If the parent is a native node without rendered children, but with
	  // multiple string children, then the `element` that gets passed in here is
	  // a plain value -- a string or number.
	  if (typeof element !== 'object') {
	    nodeType = 'Text';
	    text = element + '';
	  } else if (element._currentElement === null || element._currentElement === false) {
	    nodeType = 'Empty';
	  } else if (element._renderedComponent) {
	    nodeType = 'NativeWrapper';
	    children = [element._renderedComponent];
	    props = element._instance.props;
	    state = element._instance.state;
	    context = element._instance.context;
	    if (context && Object.keys(context).length === 0) {
	      context = null;
	    }
	  } else if (element._renderedChildren) {
	    children = childrenList(element._renderedChildren);
	  } else if (element._currentElement && element._currentElement.props) {
	    // This is a native node without rendered children -- meaning the children
	    // prop is just a string or (in the case of the <option>) a list of
	    // strings & numbers.
	    children = element._currentElement.props.children;
	  }

	  if (!props && element._currentElement && element._currentElement.props) {
	    props = element._currentElement.props;
	  }

	  // != used deliberately here to catch undefined and null
	  if (element._currentElement != null) {
	    type = element._currentElement.type;
	    if (typeof type === 'string') {
	      name = type;
	    } else if (element.getName) {
	      nodeType = 'Composite';
	      name = element.getName();
	      // 0.14 top-level wrapper
	      // TODO(jared): The backend should just act as if these don't exist.
	      if (element._renderedComponent && element._currentElement.props === element._renderedComponent._currentElement) {
	        nodeType = 'Wrapper';
	      }
	      if (name === null) {
	        name = 'No display name';
	      }
	    } else if (typeof element._stringText === 'string') {
	      nodeType = 'Text';
	      text = element._stringText;
	    } else {
	      name = type.displayName || type.name || 'Unknown';
	    }
	  }

	  if (element._instance) {
	    var inst = element._instance;
	    updater = {
	      setState: inst.setState && inst.setState.bind(inst),
	      forceUpdate: inst.forceUpdate && inst.forceUpdate.bind(inst),
	      setInProps: inst.forceUpdate && setInProps.bind(null, element),
	      setInState: inst.forceUpdate && setInState.bind(null, inst),
	      setInContext: inst.forceUpdate && setInContext.bind(null, inst)
	    };
	    publicInstance = inst;

	    // TODO: React ART currently falls in this bucket, but this doesn't
	    // actually make sense and we should clean this up after stabilizing our
	    // API for backends
	    if (inst._renderedChildren) {
	      children = childrenList(inst._renderedChildren);
	    }
	  }

	  return {
	    nodeType,
	    type,
	    name,
	    props,
	    state,
	    context,
	    children,
	    text,
	    updater,
	    publicInstance
	  };
	}

	function setInProps(internalInst, path, value) {
	  var element = internalInst._currentElement;
	  internalInst._currentElement = _extends({}, element, {
	    props: copyWithSet(element.props, path, value)
	  });
	  internalInst._instance.forceUpdate();
	}

	function setInState(inst, path, value) {
	  setIn(inst.state, path, value);
	  inst.forceUpdate();
	}

	function setInContext(inst, path, value) {
	  setIn(inst.context, path, value);
	  inst.forceUpdate();
	}

	function setIn(obj, path, value) {
	  var last = path.pop();
	  var parent = path.reduce((obj_, attr) => obj_ ? obj_[attr] : null, obj);
	  if (parent) {
	    parent[last] = value;
	  }
	}

	function childrenList(children) {
	  var res = [];
	  for (var name in children) {
	    res.push(children[name]);
	  }
	  return res;
	}

	module.exports = getData;

/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	var copyWithSet = __webpack_require__(6);

	function getData012(element) {
	  var children = null;
	  var props = element.props;
	  var state = element.state;
	  var context = element.context;
	  var updater = null;
	  var name = null;
	  var type = null;
	  var text = null;
	  var publicInstance = null;
	  var nodeType = 'Native';
	  if (element._renderedComponent) {
	    nodeType = 'Wrapper';
	    children = [element._renderedComponent];
	    if (context && Object.keys(context).length === 0) {
	      context = null;
	    }
	  } else if (element._renderedChildren) {
	    name = element.constructor.displayName;
	    children = childrenList(element._renderedChildren);
	  } else if (typeof props.children === 'string') {
	    // string children
	    name = element.constructor.displayName;
	    children = props.children;
	    nodeType = 'Native';
	  }

	  if (!props && element._currentElement && element._currentElement.props) {
	    props = element._currentElement.props;
	  }

	  if (element._currentElement) {
	    type = element._currentElement.type;
	    if (typeof type === 'string') {
	      name = type;
	    } else {
	      nodeType = 'Composite';
	      name = type.displayName;
	      if (!name) {
	        name = 'No display name';
	      }
	    }
	  }

	  if (!name) {
	    name = element.constructor.displayName || 'No display name';
	    nodeType = 'Composite';
	  }

	  if (typeof props === 'string') {
	    nodeType = 'Text';
	    text = props;
	    props = null;
	    name = null;
	  }

	  if (element.forceUpdate) {
	    updater = {
	      setState: element.setState.bind(element),
	      forceUpdate: element.forceUpdate.bind(element),
	      setInProps: element.forceUpdate && setInProps.bind(null, element),
	      setInState: element.forceUpdate && setInState.bind(null, element),
	      setInContext: element.forceUpdate && setInContext.bind(null, element)
	    };
	    publicInstance = element;
	  }

	  return {
	    nodeType,
	    type,
	    name,
	    props,
	    state,
	    context,
	    children,
	    text,
	    updater,
	    publicInstance
	  };
	}

	function setInProps(inst, path, value) {
	  inst.props = copyWithSet(inst.props, path, value);
	  inst.forceUpdate();
	}

	function setInState(inst, path, value) {
	  setIn(inst.state, path, value);
	  inst.forceUpdate();
	}

	function setInContext(inst, path, value) {
	  setIn(inst.context, path, value);
	  inst.forceUpdate();
	}

	function setIn(obj, path, value) {
	  var last = path.pop();
	  var parent = path.reduce((obj_, attr) => obj_ ? obj_[attr] : null, obj);
	  if (parent) {
	    parent[last] = value;
	  }
	}

	function childrenList(children) {
	  var res = [];
	  for (var name in children) {
	    res.push(children[name]);
	  }
	  return res;
	}

	module.exports = getData012;

/***/ },
/* 30 */,
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	var Overlay = __webpack_require__(33);
	var MultiOverlay = __webpack_require__(32);

	/**
	 * Manages the highlighting of items on an html page, as well as
	 * hover-to-inspect.
	 */
	class Highlighter {

	  constructor(win, onSelect) {
	    this._win = win;
	    this._onSelect = onSelect;
	    this._overlay = null;
	    this._multiOverlay = null;
	    this._subs = [];
	  }

	  startInspecting() {
	    this._inspecting = true;
	    this._subs = [captureSubscription(this._win, 'mouseover', this.onHover.bind(this)), captureSubscription(this._win, 'mousedown', this.onMouseDown.bind(this)), captureSubscription(this._win, 'click', this.onClick.bind(this))];
	  }

	  stopInspecting() {
	    this._subs.forEach(unsub => unsub());
	    this.hideHighlight();
	  }

	  remove() {
	    this.stopInspecting();
	    if (this._button && this._button.parentNode) {
	      this._button.parentNode.removeChild(this._button);
	    }
	  }

	  highlight(node, name) {
	    this.removeMultiOverlay();
	    if (!this._overlay) {
	      this._overlay = new Overlay(this._win);
	    }
	    this._overlay.inspect(node, name);
	  }

	  highlightMany(nodes) {
	    this.removeOverlay();
	    if (!this._multiOverlay) {
	      this._multiOverlay = new MultiOverlay(this._win);
	    }
	    this._multiOverlay.highlightMany(nodes);
	  }

	  hideHighlight() {
	    this._inspecting = false;
	    this.removeOverlay();
	    this.removeMultiOverlay();
	  }

	  removeOverlay() {
	    if (!this._overlay) {
	      return;
	    }
	    this._overlay.remove();
	    this._overlay = null;
	  }

	  removeMultiOverlay() {
	    if (!this._multiOverlay) {
	      return;
	    }
	    this._multiOverlay.remove();
	    this._multiOverlay = null;
	  }

	  onMouseDown(evt) {
	    if (!this._inspecting) {
	      return;
	    }
	    evt.preventDefault();
	    evt.stopPropagation();
	    evt.cancelBubble = true;
	    this._onSelect(evt.target);
	    return;
	  }

	  onClick(evt) {
	    if (!this._inspecting) {
	      return;
	    }
	    this._subs.forEach(unsub => unsub());
	    evt.preventDefault();
	    evt.stopPropagation();
	    evt.cancelBubble = true;
	    this.hideHighlight();
	  }

	  onHover(evt) {
	    if (!this._inspecting) {
	      return;
	    }
	    evt.preventDefault();
	    evt.stopPropagation();
	    evt.cancelBubble = true;
	    this.highlight(evt.target);
	  }

	  injectButton() {
	    this._button = makeMagnifier();
	    this._button.onclick = this.startInspecting.bind(this);
	    this._win.document.body.appendChild(this._button);
	  }
	}

	function captureSubscription(obj, evt, cb) {
	  obj.addEventListener(evt, cb, true);
	  return () => obj.removeEventListener(evt, cb, true);
	}

	function makeMagnifier() {
	  var button = window.document.createElement('button');
	  button.innerHTML = '&#128269;';
	  button.style.backgroundColor = 'transparent';
	  button.style.border = 'none';
	  button.style.outline = 'none';
	  button.style.cursor = 'pointer';
	  button.style.position = 'fixed';
	  button.style.bottom = '10px';
	  button.style.right = '10px';
	  button.style.fontSize = '30px';
	  button.style.zIndex = 10000000;
	  return button;
	}

	module.exports = Highlighter;

/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	var assign = __webpack_require__(4);


	class MultiOverlay {

	  constructor(window) {
	    this.win = window;
	    var doc = window.document;
	    this.container = doc.createElement('div');
	    doc.body.appendChild(this.container);
	  }

	  highlightMany(nodes) {
	    this.container.innerHTML = '';
	    nodes.forEach(node => {
	      var div = this.win.document.createElement('div');
	      var box = node.getBoundingClientRect();
	      assign(div.style, {
	        top: box.top + 'px',
	        left: box.left + 'px',
	        width: box.width + 'px',
	        height: box.height + 'px',
	        border: '2px dotted rgba(200, 100, 100, .8)',
	        boxSizing: 'border-box',
	        backgroundColor: 'rgba(200, 100, 100, .2)',
	        position: 'fixed',
	        zIndex: 10000000,
	        pointerEvents: 'none'
	      });
	      this.container.appendChild(div);
	    });
	  }

	  remove() {
	    if (this.container.parentNode) {
	      this.container.parentNode.removeChild(this.container);
	    }
	  }
	}

	module.exports = MultiOverlay;

/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	var assign = __webpack_require__(4);


	class Overlay {

	  constructor(window) {
	    var doc = window.document;
	    this.win = window;
	    this.container = doc.createElement('div');
	    this.node = doc.createElement('div');
	    this.border = doc.createElement('div');
	    this.padding = doc.createElement('div');
	    this.content = doc.createElement('div');

	    this.border.style.borderColor = overlayStyles.border;
	    this.padding.style.borderColor = overlayStyles.padding;
	    this.content.style.backgroundColor = overlayStyles.background;

	    assign(this.node.style, {
	      borderColor: overlayStyles.margin,
	      pointerEvents: 'none',
	      position: 'fixed'
	    });

	    this.tip = doc.createElement('div');
	    assign(this.tip.style, {
	      border: '1px solid #aaa',
	      backgroundColor: 'rgb(255, 255, 178)',
	      fontFamily: 'sans-serif',
	      color: 'orange',
	      padding: '3px 5px',
	      position: 'fixed',
	      fontSize: '10px'
	    });

	    this.nameSpan = doc.createElement('span');
	    this.tip.appendChild(this.nameSpan);
	    assign(this.nameSpan.style, {
	      color: 'rgb(136, 18, 128)',
	      marginRight: '5px'
	    });
	    this.dimSpan = doc.createElement('span');
	    this.tip.appendChild(this.dimSpan);
	    assign(this.dimSpan.style, {
	      color: '#888'
	    });

	    this.container.style.zIndex = 10000000;
	    this.node.style.zIndex = 10000000;
	    this.tip.style.zIndex = 10000000;
	    this.container.appendChild(this.node);
	    this.container.appendChild(this.tip);
	    this.node.appendChild(this.border);
	    this.border.appendChild(this.padding);
	    this.padding.appendChild(this.content);
	    doc.body.appendChild(this.container);
	  }

	  remove() {
	    if (this.container.parentNode) {
	      this.container.parentNode.removeChild(this.container);
	    }
	  }

	  inspect(node, name) {
	    // We can't get the size of text nodes or comment nodes. React as of v15
	    // heavily uses comment nodes to delimit text.
	    if (node.nodeType !== Node.ELEMENT_NODE) {
	      return;
	    }
	    var box = node.getBoundingClientRect();
	    var dims = getElementDimensions(node);

	    boxWrap(dims, 'margin', this.node);
	    boxWrap(dims, 'border', this.border);
	    boxWrap(dims, 'padding', this.padding);

	    assign(this.content.style, {
	      height: box.height - dims.borderTop - dims.borderBottom - dims.paddingTop - dims.paddingBottom + 'px',
	      width: box.width - dims.borderLeft - dims.borderRight - dims.paddingLeft - dims.paddingRight + 'px'
	    });

	    assign(this.node.style, {
	      top: box.top - dims.marginTop + 'px',
	      left: box.left - dims.marginLeft + 'px'
	    });

	    this.nameSpan.textContent = name || node.nodeName.toLowerCase();
	    this.dimSpan.textContent = box.width + 'px × ' + box.height + 'px';

	    var tipPos = findTipPos({
	      top: box.top - dims.marginTop,
	      left: box.left - dims.marginLeft,
	      height: box.height + dims.marginTop + dims.marginBottom,
	      width: box.width + dims.marginLeft + dims.marginRight
	    }, this.win);
	    assign(this.tip.style, tipPos);
	  }
	}

	function findTipPos(dims, win) {
	  var tipHeight = 20;
	  var margin = 5;
	  var top;
	  if (dims.top + dims.height + tipHeight <= win.innerHeight) {
	    if (dims.top + dims.height < 0) {
	      top = margin;
	    } else {
	      top = dims.top + dims.height + margin;
	    }
	  } else if (dims.top - tipHeight <= win.innerHeight) {
	    if (dims.top - tipHeight - margin < margin) {
	      top = margin;
	    } else {
	      top = dims.top - tipHeight - margin;
	    }
	  } else {
	    top = win.innerHeight - tipHeight - margin;
	  }

	  top += 'px';

	  if (dims.left < 0) {
	    return { top, left: margin };
	  }
	  if (dims.left + 200 > win.innerWidth) {
	    return { top, right: margin };
	  }
	  return { top, left: dims.left + margin + 'px' };
	}

	function getElementDimensions(element) {
	  var calculatedStyle = window.getComputedStyle(element);

	  return {
	    borderLeft: +calculatedStyle.borderLeftWidth.match(/[0-9]*/)[0],
	    borderRight: +calculatedStyle.borderRightWidth.match(/[0-9]*/)[0],
	    borderTop: +calculatedStyle.borderTopWidth.match(/[0-9]*/)[0],
	    borderBottom: +calculatedStyle.borderBottomWidth.match(/[0-9]*/)[0],
	    marginLeft: +calculatedStyle.marginLeft.match(/[0-9]*/)[0],
	    marginRight: +calculatedStyle.marginRight.match(/[0-9]*/)[0],
	    marginTop: +calculatedStyle.marginTop.match(/[0-9]*/)[0],
	    marginBottom: +calculatedStyle.marginBottom.match(/[0-9]*/)[0],
	    paddingLeft: +calculatedStyle.paddingLeft.match(/[0-9]*/)[0],
	    paddingRight: +calculatedStyle.paddingRight.match(/[0-9]*/)[0],
	    paddingTop: +calculatedStyle.paddingTop.match(/[0-9]*/)[0],
	    paddingBottom: +calculatedStyle.paddingBottom.match(/[0-9]*/)[0]
	  };
	}

	function boxWrap(dims, what, node) {
	  assign(node.style, {
	    borderTopWidth: dims[what + 'Top'] + 'px',
	    borderLeftWidth: dims[what + 'Left'] + 'px',
	    borderRightWidth: dims[what + 'Right'] + 'px',
	    borderBottomWidth: dims[what + 'Bottom'] + 'px',
	    borderStyle: 'solid'
	  });
	}

	var overlayStyles = {
	  background: 'rgba(120, 170, 210, 0.7)',
	  padding: 'rgba(77, 200, 0, 0.3)',
	  margin: 'rgba(255, 155, 0, 0.3)',
	  border: 'rgba(255, 200, 50, 0.3)'
	};

	module.exports = Overlay;

/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	var Highlighter = __webpack_require__(31);

	module.exports = function setup(agent) {
	  var hl = new Highlighter(window, node => {
	    agent.selectFromDOMNode(node);
	  });
	  agent.on('highlight', data => hl.highlight(data.node, data.name));
	  agent.on('highlightMany', nodes => hl.highlightMany(nodes));
	  agent.on('hideHighlight', () => hl.hideHighlight());
	  agent.on('startInspecting', () => hl.startInspecting());
	  agent.on('stopInspecting', () => hl.stopInspecting());
	  agent.on('shutdown', () => {
	    hl.remove();
	  });
	};

/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */

	'use strict';

	const BananaSlugAbstractNodeMeasurer = __webpack_require__(7);
	const BananaSlugAbstractNodePresenter = __webpack_require__(8);
	const BananaSlugWebNodeMeasurer = __webpack_require__(36);
	const BananaSlugWebNodePresenter = __webpack_require__(37);

	const NODE_TYPE_COMPOSITE = 'Composite';

	class BananaSlugBackendManager {

	  constructor(agent) {
	    this._onMeasureNode = this._onMeasureNode.bind(this);

	    var useDOM = agent.capabilities.dom;

	    this._measurer = useDOM ? new BananaSlugWebNodeMeasurer() : new BananaSlugAbstractNodeMeasurer();

	    this._presenter = useDOM ? new BananaSlugWebNodePresenter() : new BananaSlugAbstractNodePresenter();

	    this._isActive = false;
	    agent.on('bananaslugchange', this._onBananaSlugChange.bind(this));
	    agent.on('update', this._onUpdate.bind(this, agent));
	    agent.on('shutdown', this._shutdown.bind(this));
	  }

	  _onUpdate(agent, obj) {
	    if (!obj.publicInstance || !obj.id || obj.nodeType !== NODE_TYPE_COMPOSITE) {
	      return;
	    }

	    var node = agent.getNodeForID(obj.id);
	    if (!node) {
	      return;
	    }

	    this._measurer.request(node, this._onMeasureNode);
	  }

	  _onMeasureNode(measurement) {
	    this._presenter.present(measurement);
	  }

	  _onBananaSlugChange(state) {
	    this._presenter.setEnabled(state.enabled);
	  }

	  _shutdown() {
	    this._presenter.setEnabled(false);
	  }
	}

	function init(agent) {
	  return new BananaSlugBackendManager(agent);
	}

	module.exports = {
	  init
	};

/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */

	'use strict';

	const BananaSlugAbstractNodeMeasurer = __webpack_require__(7);

	const DUMMY = {
	  bottom: 0,
	  expiration: 0,
	  height: 0,
	  id: '',
	  left: 0,
	  right: 0,
	  scrollX: 0,
	  scrollY: 0,
	  top: 0,
	  width: 0
	};

	class BananaSlugWebNodeMeasurer extends BananaSlugAbstractNodeMeasurer {
	  measureImpl(node) {
	    if (!node || typeof node.getBoundingClientRect !== 'function') {
	      return DUMMY;
	    }

	    var rect = node.getBoundingClientRect();
	    var scrollX = Math.max(document.body ? document.body.scrollLeft : 0, document.documentElement.scrollLeft, window.pageXOffset || 0, window.scrollX || 0);

	    var scrollY = Math.max(document.body ? document.body.scrollTop : 0, document.documentElement.scrollTop, window.pageYOffset || 0, window.scrollY || 0);

	    return {
	      bottom: rect.bottom,
	      expiration: 0,
	      height: rect.height,
	      id: '',
	      left: rect.left,
	      right: rect.right,
	      scrollX,
	      scrollY,
	      top: rect.top,
	      width: rect.width
	    };
	  }
	}

	module.exports = BananaSlugWebNodeMeasurer;

/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */

	'use strict';

	const BananaSlugAbstractNodePresenter = __webpack_require__(8);

	const OUTLINE_COLOR = '#f0f0f0';

	const COLORS = [
	// coolest
	'#55cef6', '#55f67b', '#a5f655', '#f4f655', '#f6a555', '#f66855',
	// hottest
	'#ff0000'];

	const HOTTEST_COLOR = COLORS[COLORS.length - 1];

	function drawBorder(ctx, measurement, borderWidth, borderColor) {
	  // outline
	  ctx.lineWidth = 1;
	  ctx.strokeStyle = OUTLINE_COLOR;

	  ctx.strokeRect(measurement.left - 1, measurement.top - 1, measurement.width + 2, measurement.height + 2);

	  // inset
	  ctx.lineWidth = 1;
	  ctx.strokeStyle = OUTLINE_COLOR;
	  ctx.strokeRect(measurement.left + borderWidth, measurement.top + borderWidth, measurement.width - borderWidth, measurement.height - borderWidth);
	  ctx.strokeStyle = borderColor;

	  if (measurement.should_update) {
	    ctx.setLineDash([2]);
	  } else {
	    ctx.setLineDash([0]);
	  }

	  // border
	  ctx.lineWidth = '' + borderWidth;
	  ctx.strokeRect(measurement.left + Math.floor(borderWidth / 2), measurement.top + Math.floor(borderWidth / 2), measurement.width - borderWidth, measurement.height - borderWidth);

	  ctx.setLineDash([0]);
	}

	const CANVAS_NODE_ID = 'BananaSlugWebNodePresenter';

	class BananaSlugWebNodePresenter extends BananaSlugAbstractNodePresenter {

	  constructor() {
	    super();
	    this._canvas = null;
	  }

	  drawImpl(pool) {
	    this._ensureCanvas();
	    var canvas = this._canvas;
	    var ctx = canvas.getContext('2d');
	    ctx.clearRect(0, 0, canvas.width, canvas.height);
	    for (const [measurement, data] of pool.entries()) {
	      const color = COLORS[data.hit - 1] || HOTTEST_COLOR;
	      drawBorder(ctx, measurement, 1, color);
	    }
	  }

	  clearImpl() {
	    var canvas = this._canvas;
	    if (canvas === null) {
	      return;
	    }

	    if (!canvas.parentNode) {
	      return;
	    }

	    var ctx = canvas.getContext('2d');
	    ctx.clearRect(0, 0, canvas.width, canvas.height);

	    canvas.parentNode.removeChild(canvas);
	    this._canvas = null;
	  }

	  _ensureCanvas() {
	    var canvas = this._canvas;
	    if (canvas === null) {
	      canvas = window.document.getElementById(CANVAS_NODE_ID) || window.document.createElement('canvas');

	      canvas.id = CANVAS_NODE_ID;
	      canvas.width = window.screen.availWidth;
	      canvas.height = window.screen.availHeight;
	      canvas.style.cssText = `
	        xx-background-color: red;
	        xx-opacity: 0.5;
	        bottom: 0;
	        left: 0;
	        pointer-events: none;
	        position: fixed;
	        right: 0;
	        top: 0;
	        z-index: 1000000000;
	      `;
	    }

	    if (!canvas.parentNode) {
	      var root = window.document.documentElement;
	      root.insertBefore(canvas, root.firstChild);
	    }
	    this._canvas = canvas;
	  }
	}

	module.exports = BananaSlugWebNodePresenter;

/***/ },
/* 38 */
/***/ function(module, exports) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	module.exports = function setupRNStyle(bridge, agent, resolveRNStyle) {
	  bridge.onCall('rn-style:get', id => {
	    var node = agent.elementData.get(id);
	    if (!node || !node.props) {
	      return null;
	    }
	    return resolveRNStyle(node.props.style);
	  });

	  bridge.on('rn-style:rename', ({ id, oldName, newName, val }) => {
	    renameStyle(agent, id, oldName, newName, val);
	  });

	  bridge.on('rn-style:set', ({ id, attr, val }) => {
	    setStyle(agent, id, attr, val);
	  });
	};

	function shallowClone(obj) {
	  var nobj = {};
	  for (var n in obj) {
	    nobj[n] = obj[n];
	  }
	  return nobj;
	}

	function renameStyle(agent, id, oldName, newName, val) {
	  var data = agent.elementData.get(id);
	  var newStyle = { [newName]: val };
	  if (!data || !data.updater || !data.updater.setInProps) {
	    var el = agent.reactElements.get(id);
	    if (el && el.setNativeProps) {
	      el.setNativeProps(newStyle);
	    } else {}
	    return;
	  }
	  var style = data && data.props && data.props.style;
	  var customStyle;
	  if (Array.isArray(style)) {
	    if (typeof style[style.length - 1] === 'object' && !Array.isArray(style[style.length - 1])) {
	      customStyle = shallowClone(style[style.length - 1]);
	      delete customStyle[oldName];
	      customStyle[newName] = val;
	      // $FlowFixMe we know that updater is not null here
	      data.updater.setInProps(['style', style.length - 1], customStyle);
	    } else {
	      style = style.concat([newStyle]);
	      // $FlowFixMe we know that updater is not null here
	      data.updater.setInProps(['style'], style);
	    }
	  } else {
	    if (typeof style === 'object') {
	      customStyle = shallowClone(style);
	      delete customStyle[oldName];
	      customStyle[newName] = val;
	      // $FlowFixMe we know that updater is not null here
	      data.updater.setInProps(['style'], customStyle);
	    } else {
	      style = [style, newStyle];
	      data.updater.setInProps(['style'], style);
	    }
	  }
	  agent.emit('hideHighlight');
	}

	function setStyle(agent, id, attr, val) {
	  var data = agent.elementData.get(id);
	  var newStyle = { [attr]: val };
	  if (!data || !data.updater || !data.updater.setInProps) {
	    var el = agent.reactElements.get(id);
	    if (el && el.setNativeProps) {
	      el.setNativeProps(newStyle);
	    } else {}
	    return;
	  }
	  var style = data.props && data.props.style;
	  if (Array.isArray(style)) {
	    if (typeof style[style.length - 1] === 'object' && !Array.isArray(style[style.length - 1])) {
	      // $FlowFixMe we know that updater is not null here
	      data.updater.setInProps(['style', style.length - 1, attr], val);
	    } else {
	      style = style.concat([newStyle]);
	      // $FlowFixMe we know that updater is not null here
	      data.updater.setInProps(['style'], style);
	    }
	  } else {
	    style = [style, newStyle];
	    data.updater.setInProps(['style'], style);
	  }
	  agent.emit('hideHighlight');
	}

/***/ },
/* 39 */
/***/ function(module, exports) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	function decorate(obj, attr, fn) {
	  var old = obj[attr];
	  obj[attr] = function () {
	    var res = old.apply(this, arguments);
	    fn.apply(this, arguments);
	    return res;
	  };
	  return () => {
	    obj[attr] = old;
	  };
	}

	let subscriptionEnabled = false;

	module.exports = (bridge, agent, hook) => {
	  var shouldEnable = !!hook._relayInternals;

	  bridge.onCall('relay:check', () => shouldEnable);
	  if (!shouldEnable) {
	    return;
	  }
	  var {
	    DefaultStoreData,
	    setRequestListener
	  } = hook._relayInternals;

	  function sendStoreData() {
	    if (subscriptionEnabled) {
	      bridge.send('relay:store', {
	        id: 'relay:store',
	        nodes: DefaultStoreData.getNodeData()
	      });
	    }
	  }

	  bridge.onCall('relay:store:enable', () => {
	    subscriptionEnabled = true;
	    sendStoreData();
	  });

	  bridge.onCall('relay:store:disable', () => {
	    subscriptionEnabled = false;
	  });

	  sendStoreData();
	  decorate(DefaultStoreData, 'handleUpdatePayload', sendStoreData);
	  decorate(DefaultStoreData, 'handleQueryPayload', sendStoreData);

	  var removeListener = setRequestListener((event, data) => {
	    bridge.send(event, data);
	  });
	  hook.on('shutdown', removeListener);
	};

/***/ },
/* 40 */,
/* 41 */
/***/ function(module, exports) {

	/**
	 * Copyright (c) 2015-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * 
	 */
	'use strict';

	function guid() {
	  return 'g' + Math.random().toString(16).substr(2);
	}

	module.exports = guid;

/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var assign        = __webpack_require__(43)
	  , normalizeOpts = __webpack_require__(50)
	  , isCallable    = __webpack_require__(46)
	  , contains      = __webpack_require__(52)

	  , d;

	d = module.exports = function (dscr, value/*, options*/) {
		var c, e, w, options, desc;
		if ((arguments.length < 2) || (typeof dscr !== 'string')) {
			options = value;
			value = dscr;
			dscr = null;
		} else {
			options = arguments[2];
		}
		if (dscr == null) {
			c = w = true;
			e = false;
		} else {
			c = contains.call(dscr, 'c');
			e = contains.call(dscr, 'e');
			w = contains.call(dscr, 'w');
		}

		desc = { value: value, configurable: c, enumerable: e, writable: w };
		return !options ? desc : assign(normalizeOpts(options), desc);
	};

	d.gs = function (dscr, get, set/*, options*/) {
		var c, e, options, desc;
		if (typeof dscr !== 'string') {
			options = set;
			set = get;
			get = dscr;
			dscr = null;
		} else {
			options = arguments[3];
		}
		if (get == null) {
			get = undefined;
		} else if (!isCallable(get)) {
			options = get;
			get = set = undefined;
		} else if (set == null) {
			set = undefined;
		} else if (!isCallable(set)) {
			options = set;
			set = undefined;
		}
		if (dscr == null) {
			c = true;
			e = false;
		} else {
			c = contains.call(dscr, 'c');
			e = contains.call(dscr, 'e');
		}

		desc = { get: get, set: set, configurable: c, enumerable: e };
		return !options ? desc : assign(normalizeOpts(options), desc);
	};


/***/ },
/* 43 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(44)()
		? Object.assign
		: __webpack_require__(45);


/***/ },
/* 44 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function () {
		var assign = Object.assign, obj;
		if (typeof assign !== 'function') return false;
		obj = { foo: 'raz' };
		assign(obj, { bar: 'dwa' }, { trzy: 'trzy' });
		return (obj.foo + obj.bar + obj.trzy) === 'razdwatrzy';
	};


/***/ },
/* 45 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var keys  = __webpack_require__(47)
	  , value = __webpack_require__(51)

	  , max = Math.max;

	module.exports = function (dest, src/*, …srcn*/) {
		var error, i, l = max(arguments.length, 2), assign;
		dest = Object(value(dest));
		assign = function (key) {
			try { dest[key] = src[key]; } catch (e) {
				if (!error) error = e;
			}
		};
		for (i = 1; i < l; ++i) {
			src = arguments[i];
			keys(src).forEach(assign);
		}
		if (error !== undefined) throw error;
		return dest;
	};


/***/ },
/* 46 */
/***/ function(module, exports) {

	// Deprecated

	'use strict';

	module.exports = function (obj) { return typeof obj === 'function'; };


/***/ },
/* 47 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(48)()
		? Object.keys
		: __webpack_require__(49);


/***/ },
/* 48 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function () {
		try {
			Object.keys('primitive');
			return true;
		} catch (e) { return false; }
	};


/***/ },
/* 49 */
/***/ function(module, exports) {

	'use strict';

	var keys = Object.keys;

	module.exports = function (object) {
		return keys(object == null ? object : Object(object));
	};


/***/ },
/* 50 */
/***/ function(module, exports) {

	'use strict';

	var forEach = Array.prototype.forEach, create = Object.create;

	var process = function (src, obj) {
		var key;
		for (key in src) obj[key] = src[key];
	};

	module.exports = function (options/*, …options*/) {
		var result = create(null);
		forEach.call(arguments, function (options) {
			if (options == null) return;
			process(Object(options), result);
		});
		return result;
	};


/***/ },
/* 51 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function (value) {
		if (value == null) throw new TypeError("Cannot use null or undefined");
		return value;
	};


/***/ },
/* 52 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(53)()
		? String.prototype.contains
		: __webpack_require__(54);


/***/ },
/* 53 */
/***/ function(module, exports) {

	'use strict';

	var str = 'razdwatrzy';

	module.exports = function () {
		if (typeof str.contains !== 'function') return false;
		return ((str.contains('dwa') === true) && (str.contains('foo') === false));
	};


/***/ },
/* 54 */
/***/ function(module, exports) {

	'use strict';

	var indexOf = String.prototype.indexOf;

	module.exports = function (searchString/*, position*/) {
		return indexOf.call(this, searchString, arguments[1]) > -1;
	};


/***/ },
/* 55 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(56)() ? Symbol : __webpack_require__(58);


/***/ },
/* 56 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function () {
		var symbol;
		if (typeof Symbol !== 'function') return false;
		symbol = Symbol('test symbol');
		try { String(symbol); } catch (e) { return false; }
		if (typeof Symbol.iterator === 'symbol') return true;

		// Return 'true' for polyfills
		if (typeof Symbol.isConcatSpreadable !== 'object') return false;
		if (typeof Symbol.iterator !== 'object') return false;
		if (typeof Symbol.toPrimitive !== 'object') return false;
		if (typeof Symbol.toStringTag !== 'object') return false;
		if (typeof Symbol.unscopables !== 'object') return false;

		return true;
	};


/***/ },
/* 57 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function (x) {
		return (x && ((typeof x === 'symbol') || (x['@@toStringTag'] === 'Symbol'))) || false;
	};


/***/ },
/* 58 */
/***/ function(module, exports, __webpack_require__) {

	// ES2015 Symbol polyfill for environments that do not support it (or partially support it_

	'use strict';

	var d              = __webpack_require__(42)
	  , validateSymbol = __webpack_require__(59)

	  , create = Object.create, defineProperties = Object.defineProperties
	  , defineProperty = Object.defineProperty, objPrototype = Object.prototype
	  , NativeSymbol, SymbolPolyfill, HiddenSymbol, globalSymbols = create(null);

	if (typeof Symbol === 'function') NativeSymbol = Symbol;

	var generateName = (function () {
		var created = create(null);
		return function (desc) {
			var postfix = 0, name, ie11BugWorkaround;
			while (created[desc + (postfix || '')]) ++postfix;
			desc += (postfix || '');
			created[desc] = true;
			name = '@@' + desc;
			defineProperty(objPrototype, name, d.gs(null, function (value) {
				// For IE11 issue see:
				// https://connect.microsoft.com/IE/feedbackdetail/view/1928508/
				//    ie11-broken-getters-on-dom-objects
				// https://github.com/medikoo/es6-symbol/issues/12
				if (ie11BugWorkaround) return;
				ie11BugWorkaround = true;
				defineProperty(this, name, d(value));
				ie11BugWorkaround = false;
			}));
			return name;
		};
	}());

	// Internal constructor (not one exposed) for creating Symbol instances.
	// This one is used to ensure that `someSymbol instanceof Symbol` always return false
	HiddenSymbol = function Symbol(description) {
		if (this instanceof HiddenSymbol) throw new TypeError('TypeError: Symbol is not a constructor');
		return SymbolPolyfill(description);
	};

	// Exposed `Symbol` constructor
	// (returns instances of HiddenSymbol)
	module.exports = SymbolPolyfill = function Symbol(description) {
		var symbol;
		if (this instanceof Symbol) throw new TypeError('TypeError: Symbol is not a constructor');
		symbol = create(HiddenSymbol.prototype);
		description = (description === undefined ? '' : String(description));
		return defineProperties(symbol, {
			__description__: d('', description),
			__name__: d('', generateName(description))
		});
	};
	defineProperties(SymbolPolyfill, {
		for: d(function (key) {
			if (globalSymbols[key]) return globalSymbols[key];
			return (globalSymbols[key] = SymbolPolyfill(String(key)));
		}),
		keyFor: d(function (s) {
			var key;
			validateSymbol(s);
			for (key in globalSymbols) if (globalSymbols[key] === s) return key;
		}),

		// If there's native implementation of given symbol, let's fallback to it
		// to ensure proper interoperability with other native functions e.g. Array.from
		hasInstance: d('', (NativeSymbol && NativeSymbol.hasInstance) || SymbolPolyfill('hasInstance')),
		isConcatSpreadable: d('', (NativeSymbol && NativeSymbol.isConcatSpreadable) ||
			SymbolPolyfill('isConcatSpreadable')),
		iterator: d('', (NativeSymbol && NativeSymbol.iterator) || SymbolPolyfill('iterator')),
		match: d('', (NativeSymbol && NativeSymbol.match) || SymbolPolyfill('match')),
		replace: d('', (NativeSymbol && NativeSymbol.replace) || SymbolPolyfill('replace')),
		search: d('', (NativeSymbol && NativeSymbol.search) || SymbolPolyfill('search')),
		species: d('', (NativeSymbol && NativeSymbol.species) || SymbolPolyfill('species')),
		split: d('', (NativeSymbol && NativeSymbol.split) || SymbolPolyfill('split')),
		toPrimitive: d('', (NativeSymbol && NativeSymbol.toPrimitive) || SymbolPolyfill('toPrimitive')),
		toStringTag: d('', (NativeSymbol && NativeSymbol.toStringTag) || SymbolPolyfill('toStringTag')),
		unscopables: d('', (NativeSymbol && NativeSymbol.unscopables) || SymbolPolyfill('unscopables'))
	});

	// Internal tweaks for real symbol producer
	defineProperties(HiddenSymbol.prototype, {
		constructor: d(SymbolPolyfill),
		toString: d('', function () { return this.__name__; })
	});

	// Proper implementation of methods exposed on Symbol.prototype
	// They won't be accessible on produced symbol instances as they derive from HiddenSymbol.prototype
	defineProperties(SymbolPolyfill.prototype, {
		toString: d(function () { return 'Symbol (' + validateSymbol(this).__description__ + ')'; }),
		valueOf: d(function () { return validateSymbol(this); })
	});
	defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toPrimitive, d('',
		function () { return validateSymbol(this); }));
	defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toStringTag, d('c', 'Symbol'));

	// Proper implementaton of toPrimitive and toStringTag for returned symbol instances
	defineProperty(HiddenSymbol.prototype, SymbolPolyfill.toStringTag,
		d('c', SymbolPolyfill.prototype[SymbolPolyfill.toStringTag]));

	// Note: It's important to define `toPrimitive` as last one, as some implementations
	// implement `toPrimitive` natively without implementing `toStringTag` (or other specified symbols)
	// And that may invoke error in definition flow:
	// See: https://github.com/medikoo/es6-symbol/issues/13#issuecomment-164146149
	defineProperty(HiddenSymbol.prototype, SymbolPolyfill.toPrimitive,
		d('c', SymbolPolyfill.prototype[SymbolPolyfill.toPrimitive]));


/***/ },
/* 59 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var isSymbol = __webpack_require__(57);

	module.exports = function (value) {
		if (!isSymbol(value)) throw new TypeError(value + " is not a symbol");
		return value;
	};


/***/ },
/* 60 */
/***/ function(module, exports) {

	/**
	 * Copyright (c) 2013-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 */

	'use strict';

	var canUseDOM = !!(typeof window !== 'undefined' && window.document && window.document.createElement);

	/**
	 * Simple, lightweight module assisting with the detection and context of
	 * Worker. Helps avoid circular dependencies and allows code to reason about
	 * whether or not they are in a Worker, even if they never include the main
	 * `ReactWorker` dependency.
	 */
	var ExecutionEnvironment = {

	  canUseDOM: canUseDOM,

	  canUseWorkers: typeof Worker !== 'undefined',

	  canUseEventListeners: canUseDOM && !!(window.addEventListener || window.attachEvent),

	  canUseViewport: canUseDOM && !!window.screen,

	  isInWorker: !canUseDOM // For now, this is true - might change in the future.

	};

	module.exports = ExecutionEnvironment;

/***/ },
/* 61 */
/***/ function(module, exports) {

	"use strict";

	/**
	 * Copyright (c) 2013-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 */

	function makeEmptyFunction(arg) {
	  return function () {
	    return arg;
	  };
	}

	/**
	 * This function accepts and discards inputs; it has no side effects. This is
	 * primarily useful idiomatically for overridable function endpoints which
	 * always need to be callable, since JS lacks a null-call idiom ala Cocoa.
	 */
	function emptyFunction() {}

	emptyFunction.thatReturns = makeEmptyFunction;
	emptyFunction.thatReturnsFalse = makeEmptyFunction(false);
	emptyFunction.thatReturnsTrue = makeEmptyFunction(true);
	emptyFunction.thatReturnsNull = makeEmptyFunction(null);
	emptyFunction.thatReturnsThis = function () {
	  return this;
	};
	emptyFunction.thatReturnsArgument = function (arg) {
	  return arg;
	};

	module.exports = emptyFunction;

/***/ },
/* 62 */
/***/ function(module, exports) {

	"use strict";

	/**
	 * Copyright (c) 2013-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 */

	var nativeRequestAnimationFrame = global.requestAnimationFrame || global.webkitRequestAnimationFrame || global.mozRequestAnimationFrame || global.oRequestAnimationFrame || global.msRequestAnimationFrame;

	module.exports = nativeRequestAnimationFrame;

/***/ },
/* 63 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2013-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @typechecks
	 */

	'use strict';

	var ExecutionEnvironment = __webpack_require__(60);

	var performance;

	if (ExecutionEnvironment.canUseDOM) {
	  performance = window.performance || window.msPerformance || window.webkitPerformance;
	}

	module.exports = performance || {};

/***/ },
/* 64 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * Copyright (c) 2013-present, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @typechecks
	 */

	var performance = __webpack_require__(63);

	var performanceNow;

	/**
	 * Detect if we can use `window.performance.now()` and gracefully fallback to
	 * `Date.now()` if it doesn't exist. We need to support Firefox < 15 for now
	 * because of Facebook's testing infrastructure.
	 */
	if (performance.now) {
	  performanceNow = function () {
	    return performance.now();
	  };
	} else {
	  performanceNow = function () {
	    return Date.now();
	  };
	}

	module.exports = performanceNow;

/***/ },
/* 65 */
/***/ function(module, exports) {

	'use strict';

	var has = Object.prototype.hasOwnProperty;

	/**
	 * An auto incrementing id which we can use to create "unique" Ultron instances
	 * so we can track the event emitters that are added through the Ultron
	 * interface.
	 *
	 * @type {Number}
	 * @private
	 */
	var id = 0;

	/**
	 * Ultron is high-intelligence robot. It gathers intelligence so it can start improving
	 * upon his rudimentary design. It will learn from your EventEmitting patterns
	 * and exterminate them.
	 *
	 * @constructor
	 * @param {EventEmitter} ee EventEmitter instance we need to wrap.
	 * @api public
	 */
	function Ultron(ee) {
	  if (!(this instanceof Ultron)) return new Ultron(ee);

	  this.id = id++;
	  this.ee = ee;
	}

	/**
	 * Register a new EventListener for the given event.
	 *
	 * @param {String} event Name of the event.
	 * @param {Functon} fn Callback function.
	 * @param {Mixed} context The context of the function.
	 * @returns {Ultron}
	 * @api public
	 */
	Ultron.prototype.on = function on(event, fn, context) {
	  fn.__ultron = this.id;
	  this.ee.on(event, fn, context);

	  return this;
	};
	/**
	 * Add an EventListener that's only called once.
	 *
	 * @param {String} event Name of the event.
	 * @param {Function} fn Callback function.
	 * @param {Mixed} context The context of the function.
	 * @returns {Ultron}
	 * @api public
	 */
	Ultron.prototype.once = function once(event, fn, context) {
	  fn.__ultron = this.id;
	  this.ee.once(event, fn, context);

	  return this;
	};

	/**
	 * Remove the listeners we assigned for the given event.
	 *
	 * @returns {Ultron}
	 * @api public
	 */
	Ultron.prototype.remove = function remove() {
	  var args = arguments
	    , event;

	  //
	  // When no event names are provided we assume that we need to clear all the
	  // events that were assigned through us.
	  //
	  if (args.length === 1 && 'string' === typeof args[0]) {
	    args = args[0].split(/[, ]+/);
	  } else if (!args.length) {
	    args = [];

	    for (event in this.ee._events) {
	      if (has.call(this.ee._events, event)) args.push(event);
	    }
	  }

	  for (var i = 0; i < args.length; i++) {
	    var listeners = this.ee.listeners(args[i]);

	    for (var j = 0; j < listeners.length; j++) {
	      event = listeners[j];

	      //
	      // Once listeners have a `listener` property that stores the real listener
	      // in the EventEmitter that ships with Node.js.
	      //
	      if (event.listener) {
	        if (event.listener.__ultron !== this.id) continue;
	        delete event.listener.__ultron;
	      } else {
	        if (event.__ultron !== this.id) continue;
	        delete event.__ultron;
	      }

	      this.ee.removeListener(args[i], event);
	    }
	  }

	  return this;
	};

	/**
	 * Destroy the Ultron instance, remove all listeners and release all references.
	 *
	 * @returns {Boolean}
	 * @api public
	 */
	Ultron.prototype.destroy = function destroy() {
	  if (!this.ee) return false;

	  this.remove();
	  this.ee = null;

	  return true;
	};

	//
	// Expose the module.
	//
	module.exports = Ultron;


/***/ },
/* 66 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/*!
	 * ws: a node.js websocket client
	 * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
	 * MIT Licensed
	 */

	var WS = module.exports = __webpack_require__(17);

	WS.Server = __webpack_require__(73);
	WS.Sender = __webpack_require__(16);
	WS.Receiver = __webpack_require__(15);

	/**
	 * Create a new WebSocket server.
	 *
	 * @param {Object} options Server options
	 * @param {Function} fn Optional connection listener.
	 * @returns {WS.Server}
	 * @api public
	 */
	WS.createServer = function createServer(options, fn) {
	  var server = new WS.Server(options);

	  if (typeof fn === 'function') {
	    server.on('connection', fn);
	  }

	  return server;
	};

	/**
	 * Create a new WebSocket connection.
	 *
	 * @param {String} address The URL/address we need to connect to.
	 * @param {Function} fn Open listener.
	 * @returns {WS}
	 * @api public
	 */
	WS.connect = WS.createConnection = function connect(address, fn) {
	  var client = new WS(address);

	  if (typeof fn === 'function') {
	    client.on('open', fn);
	  }

	  return client;
	};


/***/ },
/* 67 */
/***/ function(module, exports, __webpack_require__) {

	/*!
	 * ws: a node.js websocket client
	 * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
	 * MIT Licensed
	 */

	var util = __webpack_require__(1);

	function BufferPool(initialSize, growStrategy, shrinkStrategy) {
	  if (this instanceof BufferPool === false) {
	    throw new TypeError("Classes can't be function-called");
	  }

	  if (typeof initialSize === 'function') {
	    shrinkStrategy = growStrategy;
	    growStrategy = initialSize;
	    initialSize = 0;
	  }
	  else if (typeof initialSize === 'undefined') {
	    initialSize = 0;
	  }
	  this._growStrategy = (growStrategy || function(db, size) {
	    return db.used + size;
	  }).bind(null, this);
	  this._shrinkStrategy = (shrinkStrategy || function(db) {
	    return initialSize;
	  }).bind(null, this);
	  this._buffer = initialSize ? new Buffer(initialSize) : null;
	  this._offset = 0;
	  this._used = 0;
	  this._changeFactor = 0;
	  this.__defineGetter__('size', function(){
	    return this._buffer == null ? 0 : this._buffer.length;
	  });
	  this.__defineGetter__('used', function(){
	    return this._used;
	  });
	}

	BufferPool.prototype.get = function(length) {
	  if (this._buffer == null || this._offset + length > this._buffer.length) {
	    var newBuf = new Buffer(this._growStrategy(length));
	    this._buffer = newBuf;
	    this._offset = 0;
	  }
	  this._used += length;
	  var buf = this._buffer.slice(this._offset, this._offset + length);
	  this._offset += length;
	  return buf;
	}

	BufferPool.prototype.reset = function(forceNewBuffer) {
	  var len = this._shrinkStrategy();
	  if (len < this.size) this._changeFactor -= 1;
	  if (forceNewBuffer || this._changeFactor < -2) {
	    this._changeFactor = 0;
	    this._buffer = len ? new Buffer(len) : null;
	  }
	  this._offset = 0;
	  this._used = 0;
	}

	module.exports = BufferPool;


/***/ },
/* 68 */
/***/ function(module, exports) {

	/*!
	 * ws: a node.js websocket client
	 * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
	 * MIT Licensed
	 */

	exports.BufferUtil = {
	  merge: function(mergedBuffer, buffers) {
	    var offset = 0;
	    for (var i = 0, l = buffers.length; i < l; ++i) {
	      var buf = buffers[i];
	      buf.copy(mergedBuffer, offset);
	      offset += buf.length;
	    }
	  },
	  mask: function(source, mask, output, offset, length) {
	    var maskNum = mask.readUInt32LE(0, true);
	    var i = 0;
	    for (; i < length - 3; i += 4) {
	      var num = maskNum ^ source.readUInt32LE(i, true);
	      if (num < 0) num = 4294967296 + num;
	      output.writeUInt32LE(num, offset + i, true);
	    }
	    switch (length % 4) {
	      case 3: output[offset + i + 2] = source[i + 2] ^ mask[2];
	      case 2: output[offset + i + 1] = source[i + 1] ^ mask[1];
	      case 1: output[offset + i] = source[i] ^ mask[0];
	      case 0:;
	    }
	  },
	  unmask: function(data, mask) {
	    var maskNum = mask.readUInt32LE(0, true);
	    var length = data.length;
	    var i = 0;
	    for (; i < length - 3; i += 4) {
	      var num = maskNum ^ data.readUInt32LE(i, true);
	      if (num < 0) num = 4294967296 + num;
	      data.writeUInt32LE(num, i, true);
	    }
	    switch (length % 4) {
	      case 3: data[i + 2] = data[i + 2] ^ mask[2];
	      case 2: data[i + 1] = data[i + 1] ^ mask[1];
	      case 1: data[i] = data[i] ^ mask[0];
	      case 0:;
	    }
	  }
	}


/***/ },
/* 69 */
/***/ function(module, exports, __webpack_require__) {

	/*!
	 * ws: a node.js websocket client
	 * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
	 * MIT Licensed
	 */

	var util = __webpack_require__(1);

	/**
	 * State constants
	 */

	var EMPTY = 0
	  , BODY = 1;
	var BINARYLENGTH = 2
	  , BINARYBODY = 3;

	/**
	 * Hixie Receiver implementation
	 */

	function Receiver () {
	  if (this instanceof Receiver === false) {
	    throw new TypeError("Classes can't be function-called");
	  }

	  this.state = EMPTY;
	  this.buffers = [];
	  this.messageEnd = -1;
	  this.spanLength = 0;
	  this.dead = false;

	  this.onerror = function() {};
	  this.ontext = function() {};
	  this.onbinary = function() {};
	  this.onclose = function() {};
	  this.onping = function() {};
	  this.onpong = function() {};
	}

	module.exports = Receiver;

	/**
	 * Add new data to the parser.
	 *
	 * @api public
	 */

	Receiver.prototype.add = function(data) {
	  if (this.dead) return;
	  var self = this;
	  function doAdd() {
	    if (self.state === EMPTY) {
	      if (data.length == 2 && data[0] == 0xFF && data[1] == 0x00) {
	        self.reset();
	        self.onclose();
	        return;
	      }
	      if (data[0] === 0x80) {
	        self.messageEnd = 0;
	        self.state = BINARYLENGTH;
	        data = data.slice(1);
	      } else {

	      if (data[0] !== 0x00) {
	        self.error('payload must start with 0x00 byte', true);
	        return;
	      }
	      data = data.slice(1);
	      self.state = BODY;

	      }
	    }
	    if (self.state === BINARYLENGTH) {
	      var i = 0;
	      while ((i < data.length) && (data[i] & 0x80)) {
	        self.messageEnd = 128 * self.messageEnd + (data[i] & 0x7f);
	        ++i;
	      }
	      if (i < data.length) {
	        self.messageEnd = 128 * self.messageEnd + (data[i] & 0x7f);
	        self.state = BINARYBODY;
	        ++i;
	      }
	      if (i > 0)
	        data = data.slice(i);
	    }
	    if (self.state === BINARYBODY) {
	      var dataleft = self.messageEnd - self.spanLength;
	      if (data.length >= dataleft) {
	        // consume the whole buffer to finish the frame
	        self.buffers.push(data);
	        self.spanLength += dataleft;
	        self.messageEnd = dataleft;
	        return self.parse();
	      }
	      // frame's not done even if we consume it all
	      self.buffers.push(data);
	      self.spanLength += data.length;
	      return;
	    }
	    self.buffers.push(data);
	    if ((self.messageEnd = bufferIndex(data, 0xFF)) != -1) {
	      self.spanLength += self.messageEnd;
	      return self.parse();
	    }
	    else self.spanLength += data.length;
	  }
	  while(data) data = doAdd();
	};

	/**
	 * Releases all resources used by the receiver.
	 *
	 * @api public
	 */

	Receiver.prototype.cleanup = function() {
	  this.dead = true;
	  this.state = EMPTY;
	  this.buffers = [];
	};

	/**
	 * Process buffered data.
	 *
	 * @api public
	 */

	Receiver.prototype.parse = function() {
	  var output = new Buffer(this.spanLength);
	  var outputIndex = 0;
	  for (var bi = 0, bl = this.buffers.length; bi < bl - 1; ++bi) {
	    var buffer = this.buffers[bi];
	    buffer.copy(output, outputIndex);
	    outputIndex += buffer.length;
	  }
	  var lastBuffer = this.buffers[this.buffers.length - 1];
	  if (this.messageEnd > 0) lastBuffer.copy(output, outputIndex, 0, this.messageEnd);
	  if (this.state !== BODY) --this.messageEnd;
	  var tail = null;
	  if (this.messageEnd < lastBuffer.length - 1) {
	    tail = lastBuffer.slice(this.messageEnd + 1);
	  }
	  this.reset();
	  this.ontext(output.toString('utf8'));
	  return tail;
	};

	/**
	 * Handles an error
	 *
	 * @api private
	 */

	Receiver.prototype.error = function (reason, terminate) {
	  if (this.dead) return;
	  this.reset();
	  if(typeof reason == 'string'){
	    this.onerror(new Error(reason), terminate);
	  }
	  else if(reason.constructor == Error){
	    this.onerror(reason, terminate);
	  }
	  else{
	    this.onerror(new Error("An error occured"),terminate);
	  }
	  return this;
	};

	/**
	 * Reset parser state
	 *
	 * @api private
	 */

	Receiver.prototype.reset = function (reason) {
	  if (this.dead) return;
	  this.state = EMPTY;
	  this.buffers = [];
	  this.messageEnd = -1;
	  this.spanLength = 0;
	};

	/**
	 * Internal api
	 */

	function bufferIndex(buffer, byte) {
	  for (var i = 0, l = buffer.length; i < l; ++i) {
	    if (buffer[i] === byte) return i;
	  }
	  return -1;
	}


/***/ },
/* 70 */
/***/ function(module, exports, __webpack_require__) {

	/*!
	 * ws: a node.js websocket client
	 * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
	 * MIT Licensed
	 */

	var events = __webpack_require__(2)
	  , util = __webpack_require__(1)
	  , EventEmitter = events.EventEmitter;

	/**
	 * Hixie Sender implementation
	 */

	function Sender(socket) {
	  if (this instanceof Sender === false) {
	    throw new TypeError("Classes can't be function-called");
	  }

	  events.EventEmitter.call(this);

	  this.socket = socket;
	  this.continuationFrame = false;
	  this.isClosed = false;
	}

	module.exports = Sender;

	/**
	 * Inherits from EventEmitter.
	 */

	util.inherits(Sender, events.EventEmitter);

	/**
	 * Frames and writes data.
	 *
	 * @api public
	 */

	Sender.prototype.send = function(data, options, cb) {
	  if (this.isClosed) return;

	  var isString = typeof data == 'string'
	    , length = isString ? Buffer.byteLength(data) : data.length
	    , lengthbytes = (length > 127) ? 2 : 1 // assume less than 2**14 bytes
	    , writeStartMarker = this.continuationFrame == false
	    , writeEndMarker = !options || !(typeof options.fin != 'undefined' && !options.fin)
	    , buffer = new Buffer((writeStartMarker ? ((options && options.binary) ? (1 + lengthbytes) : 1) : 0) + length + ((writeEndMarker && !(options && options.binary)) ? 1 : 0))
	    , offset = writeStartMarker ? 1 : 0;

	  if (writeStartMarker) {
	    if (options && options.binary) {
	      buffer.write('\x80', 'binary');
	      // assume length less than 2**14 bytes
	      if (lengthbytes > 1)
	        buffer.write(String.fromCharCode(128+length/128), offset++, 'binary');
	      buffer.write(String.fromCharCode(length&0x7f), offset++, 'binary');
	    } else
	      buffer.write('\x00', 'binary');
	  }

	  if (isString) buffer.write(data, offset, 'utf8');
	  else data.copy(buffer, offset, 0);

	  if (writeEndMarker) {
	    if (options && options.binary) {
	      // sending binary, not writing end marker
	    } else
	      buffer.write('\xff', offset + length, 'binary');
	    this.continuationFrame = false;
	  }
	  else this.continuationFrame = true;

	  try {
	    this.socket.write(buffer, 'binary', cb);
	  } catch (e) {
	    this.error(e.toString());
	  }
	};

	/**
	 * Sends a close instruction to the remote party.
	 *
	 * @api public
	 */

	Sender.prototype.close = function(code, data, mask, cb) {
	  if (this.isClosed) return;
	  this.isClosed = true;
	  try {
	    if (this.continuationFrame) this.socket.write(new Buffer([0xff], 'binary'));
	    this.socket.write(new Buffer([0xff, 0x00]), 'binary', cb);
	  } catch (e) {
	    this.error(e.toString());
	  }
	};

	/**
	 * Sends a ping message to the remote party. Not available for hixie.
	 *
	 * @api public
	 */

	Sender.prototype.ping = function(data, options) {};

	/**
	 * Sends a pong message to the remote party. Not available for hixie.
	 *
	 * @api public
	 */

	Sender.prototype.pong = function(data, options) {};

	/**
	 * Handles an error
	 *
	 * @api private
	 */

	Sender.prototype.error = function (reason) {
	  this.emit('error', reason);
	  return this;
	};


/***/ },
/* 71 */
/***/ function(module, exports) {

	/*!
	 * ws: a node.js websocket client
	 * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
	 * MIT Licensed
	 */

	exports.Validation = {
	  isValidUTF8: function(buffer) {
	    return true;
	  }
	};


/***/ },
/* 72 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/*!
	 * ws: a node.js websocket client
	 * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
	 * MIT Licensed
	 */

	try {
	  module.exports = __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"utf-8-validate\""); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
	} catch (e) {
	  module.exports = __webpack_require__(71);
	}


/***/ },
/* 73 */
/***/ function(module, exports, __webpack_require__) {

	/*!
	 * ws: a node.js websocket client
	 * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
	 * MIT Licensed
	 */

	var util = __webpack_require__(1)
	  , events = __webpack_require__(2)
	  , http = __webpack_require__(19)
	  , crypto = __webpack_require__(18)
	  , Options = __webpack_require__(11)
	  , WebSocket = __webpack_require__(17)
	  , Extensions = __webpack_require__(14)
	  , PerMessageDeflate = __webpack_require__(3)
	  , tls = __webpack_require__(77)
	  , url = __webpack_require__(20);

	/**
	 * WebSocket Server implementation
	 */

	function WebSocketServer(options, callback) {
	  if (this instanceof WebSocketServer === false) {
	    return new WebSocketServer(options, callback);
	  }

	  events.EventEmitter.call(this);

	  options = new Options({
	    host: '0.0.0.0',
	    port: null,
	    server: null,
	    verifyClient: null,
	    handleProtocols: null,
	    path: null,
	    noServer: false,
	    disableHixie: false,
	    clientTracking: true,
	    perMessageDeflate: true,
	    maxPayload: null
	  }).merge(options);

	  if (!options.isDefinedAndNonNull('port') && !options.isDefinedAndNonNull('server') && !options.value.noServer) {
	    throw new TypeError('`port` or a `server` must be provided');
	  }

	  var self = this;

	  if (options.isDefinedAndNonNull('port')) {
	    this._server = http.createServer(function (req, res) {
	      var body = http.STATUS_CODES[426];
	      res.writeHead(426, {
	        'Content-Length': body.length,
	        'Content-Type': 'text/plain'
	      });
	      res.end(body);
	    });
	    this._server.allowHalfOpen = false;
	    this._server.listen(options.value.port, options.value.host, callback);
	    this._closeServer = function() { if (self._server) self._server.close(); };
	  }
	  else if (options.value.server) {
	    this._server = options.value.server;
	    if (options.value.path) {
	      // take note of the path, to avoid collisions when multiple websocket servers are
	      // listening on the same http server
	      if (this._server._webSocketPaths && options.value.server._webSocketPaths[options.value.path]) {
	        throw new Error('two instances of WebSocketServer cannot listen on the same http server path');
	      }
	      if (typeof this._server._webSocketPaths !== 'object') {
	        this._server._webSocketPaths = {};
	      }
	      this._server._webSocketPaths[options.value.path] = 1;
	    }
	  }
	  if (this._server) {
	    this._onceServerListening = function() { self.emit('listening'); };
	    this._server.once('listening', this._onceServerListening);
	  }

	  if (typeof this._server != 'undefined') {
	    this._onServerError = function(error) { self.emit('error', error) };
	    this._server.on('error', this._onServerError);
	    this._onServerUpgrade = function(req, socket, upgradeHead) {
	      //copy upgradeHead to avoid retention of large slab buffers used in node core
	      var head = new Buffer(upgradeHead.length);
	      upgradeHead.copy(head);

	      self.handleUpgrade(req, socket, head, function(client) {
	        self.emit('connection'+req.url, client);
	        self.emit('connection', client);
	      });
	    };
	    this._server.on('upgrade', this._onServerUpgrade);
	  }

	  this.options = options.value;
	  this.path = options.value.path;
	  this.clients = [];
	}

	/**
	 * Inherits from EventEmitter.
	 */

	util.inherits(WebSocketServer, events.EventEmitter);

	/**
	 * Immediately shuts down the connection.
	 *
	 * @api public
	 */

	WebSocketServer.prototype.close = function(callback) {
	  // terminate all associated clients
	  var error = null;
	  try {
	    for (var i = 0, l = this.clients.length; i < l; ++i) {
	      this.clients[i].terminate();
	    }
	  }
	  catch (e) {
	    error = e;
	  }

	  // remove path descriptor, if any
	  if (this.path && this._server._webSocketPaths) {
	    delete this._server._webSocketPaths[this.path];
	    if (Object.keys(this._server._webSocketPaths).length == 0) {
	      delete this._server._webSocketPaths;
	    }
	  }

	  // close the http server if it was internally created
	  try {
	    if (typeof this._closeServer !== 'undefined') {
	      this._closeServer();
	    }
	  }
	  finally {
	    if (this._server) {
	      this._server.removeListener('listening', this._onceServerListening);
	      this._server.removeListener('error', this._onServerError);
	      this._server.removeListener('upgrade', this._onServerUpgrade);
	    }
	    delete this._server;
	  }
	  if(callback)
	    callback(error);
	  else if(error)
	    throw error;
	}

	/**
	 * Handle a HTTP Upgrade request.
	 *
	 * @api public
	 */

	WebSocketServer.prototype.handleUpgrade = function(req, socket, upgradeHead, cb) {
	  // check for wrong path
	  if (this.options.path) {
	    var u = url.parse(req.url);
	    if (u && u.pathname !== this.options.path) return;
	  }

	  if (typeof req.headers.upgrade === 'undefined' || req.headers.upgrade.toLowerCase() !== 'websocket') {
	    abortConnection(socket, 400, 'Bad Request');
	    return;
	  }

	  if (req.headers['sec-websocket-key1']) handleHixieUpgrade.apply(this, arguments);
	  else handleHybiUpgrade.apply(this, arguments);
	}

	module.exports = WebSocketServer;

	/**
	 * Entirely private apis,
	 * which may or may not be bound to a sepcific WebSocket instance.
	 */

	function handleHybiUpgrade(req, socket, upgradeHead, cb) {
	  // handle premature socket errors
	  var errorHandler = function() {
	    try { socket.destroy(); } catch (e) {}
	  }
	  socket.on('error', errorHandler);

	  // verify key presence
	  if (!req.headers['sec-websocket-key']) {
	    abortConnection(socket, 400, 'Bad Request');
	    return;
	  }

	  // verify version
	  var version = parseInt(req.headers['sec-websocket-version']);
	  if ([8, 13].indexOf(version) === -1) {
	    abortConnection(socket, 400, 'Bad Request');
	    return;
	  }

	  // verify protocol
	  var protocols = req.headers['sec-websocket-protocol'];

	  // verify client
	  var origin = version < 13 ?
	    req.headers['sec-websocket-origin'] :
	    req.headers['origin'];

	  // handle extensions offer
	  var extensionsOffer = Extensions.parse(req.headers['sec-websocket-extensions']);

	  // handler to call when the connection sequence completes
	  var self = this;
	  var completeHybiUpgrade2 = function(protocol) {

	    // calc key
	    var key = req.headers['sec-websocket-key'];
	    var shasum = crypto.createHash('sha1');
	    shasum.update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
	    key = shasum.digest('base64');

	    var headers = [
	        'HTTP/1.1 101 Switching Protocols'
	      , 'Upgrade: websocket'
	      , 'Connection: Upgrade'
	      , 'Sec-WebSocket-Accept: ' + key
	    ];

	    if (typeof protocol != 'undefined') {
	      headers.push('Sec-WebSocket-Protocol: ' + protocol);
	    }

	    var extensions = {};
	    try {
	      extensions = acceptExtensions.call(self, extensionsOffer);
	    } catch (err) {
	      abortConnection(socket, 400, 'Bad Request');
	      return;
	    }

	    if (Object.keys(extensions).length) {
	      var serverExtensions = {};
	      Object.keys(extensions).forEach(function(token) {
	        serverExtensions[token] = [extensions[token].params]
	      });
	      headers.push('Sec-WebSocket-Extensions: ' + Extensions.format(serverExtensions));
	    }

	    // allows external modification/inspection of handshake headers
	    self.emit('headers', headers);

	    socket.setTimeout(0);
	    socket.setNoDelay(true);
	    try {
	      socket.write(headers.concat('', '').join('\r\n'));
	    }
	    catch (e) {
	      // if the upgrade write fails, shut the connection down hard
	      try { socket.destroy(); } catch (e) {}
	      return;
	    }

	    var client = new WebSocket([req, socket, upgradeHead], {
	      protocolVersion: version,
	      protocol: protocol,
	      extensions: extensions,
	      maxPayload: self.options.maxPayload
	    });

	    if (self.options.clientTracking) {
	      self.clients.push(client);
	      client.on('close', function() {
	        var index = self.clients.indexOf(client);
	        if (index != -1) {
	          self.clients.splice(index, 1);
	        }
	      });
	    }

	    // signal upgrade complete
	    socket.removeListener('error', errorHandler);
	    cb(client);
	  }

	  // optionally call external protocol selection handler before
	  // calling completeHybiUpgrade2
	  var completeHybiUpgrade1 = function() {
	    // choose from the sub-protocols
	    if (typeof self.options.handleProtocols == 'function') {
	        var protList = (protocols || "").split(/, */);
	        var callbackCalled = false;
	        var res = self.options.handleProtocols(protList, function(result, protocol) {
	          callbackCalled = true;
	          if (!result) abortConnection(socket, 401, 'Unauthorized');
	          else completeHybiUpgrade2(protocol);
	        });
	        if (!callbackCalled) {
	            // the handleProtocols handler never called our callback
	            abortConnection(socket, 501, 'Could not process protocols');
	        }
	        return;
	    } else {
	        if (typeof protocols !== 'undefined') {
	            completeHybiUpgrade2(protocols.split(/, */)[0]);
	        }
	        else {
	            completeHybiUpgrade2();
	        }
	    }
	  }

	  // optionally call external client verification handler
	  if (typeof this.options.verifyClient == 'function') {
	    var info = {
	      origin: origin,
	      secure: typeof req.connection.authorized !== 'undefined' || typeof req.connection.encrypted !== 'undefined',
	      req: req
	    };
	    if (this.options.verifyClient.length == 2) {
	      this.options.verifyClient(info, function(result, code, name) {
	        if (typeof code === 'undefined') code = 401;
	        if (typeof name === 'undefined') name = http.STATUS_CODES[code];

	        if (!result) abortConnection(socket, code, name);
	        else completeHybiUpgrade1();
	      });
	      return;
	    }
	    else if (!this.options.verifyClient(info)) {
	      abortConnection(socket, 401, 'Unauthorized');
	      return;
	    }
	  }

	  completeHybiUpgrade1();
	}

	function handleHixieUpgrade(req, socket, upgradeHead, cb) {
	  // handle premature socket errors
	  var errorHandler = function() {
	    try { socket.destroy(); } catch (e) {}
	  }
	  socket.on('error', errorHandler);

	  // bail if options prevent hixie
	  if (this.options.disableHixie) {
	    abortConnection(socket, 401, 'Hixie support disabled');
	    return;
	  }

	  // verify key presence
	  if (!req.headers['sec-websocket-key2']) {
	    abortConnection(socket, 400, 'Bad Request');
	    return;
	  }

	  var origin = req.headers['origin']
	    , self = this;

	  // setup handshake completion to run after client has been verified
	  var onClientVerified = function() {
	    var wshost;
	    if (!req.headers['x-forwarded-host'])
	        wshost = req.headers.host;
	    else
	        wshost = req.headers['x-forwarded-host'];
	    var location = ((req.headers['x-forwarded-proto'] === 'https' || socket.encrypted) ? 'wss' : 'ws') + '://' + wshost + req.url
	      , protocol = req.headers['sec-websocket-protocol'];

	    // build the response header and return a Buffer
	    var buildResponseHeader = function() {
	      var headers = [
	          'HTTP/1.1 101 Switching Protocols'
	        , 'Upgrade: WebSocket'
	        , 'Connection: Upgrade'
	        , 'Sec-WebSocket-Location: ' + location
	      ];
	      if (typeof protocol != 'undefined') headers.push('Sec-WebSocket-Protocol: ' + protocol);
	      if (typeof origin != 'undefined') headers.push('Sec-WebSocket-Origin: ' + origin);

	      return new Buffer(headers.concat('', '').join('\r\n'));
	    };

	    // send handshake response before receiving the nonce
	    var handshakeResponse = function() {

	      socket.setTimeout(0);
	      socket.setNoDelay(true);

	      var headerBuffer = buildResponseHeader();

	      try {
	        socket.write(headerBuffer, 'binary', function(err) {
	          // remove listener if there was an error
	          if (err) socket.removeListener('data', handler);
	          return;
	        });
	      } catch (e) {
	        try { socket.destroy(); } catch (e) {}
	        return;
	      };
	    };

	    // handshake completion code to run once nonce has been successfully retrieved
	    var completeHandshake = function(nonce, rest, headerBuffer) {
	      // calculate key
	      var k1 = req.headers['sec-websocket-key1']
	        , k2 = req.headers['sec-websocket-key2']
	        , md5 = crypto.createHash('md5');

	      [k1, k2].forEach(function (k) {
	        var n = parseInt(k.replace(/[^\d]/g, ''))
	          , spaces = k.replace(/[^ ]/g, '').length;
	        if (spaces === 0 || n % spaces !== 0){
	          abortConnection(socket, 400, 'Bad Request');
	          return;
	        }
	        n /= spaces;
	        md5.update(String.fromCharCode(
	          n >> 24 & 0xFF,
	          n >> 16 & 0xFF,
	          n >> 8  & 0xFF,
	          n       & 0xFF));
	      });
	      md5.update(nonce.toString('binary'));

	      socket.setTimeout(0);
	      socket.setNoDelay(true);

	      try {
	        var hashBuffer = new Buffer(md5.digest('binary'), 'binary');
	        var handshakeBuffer = new Buffer(headerBuffer.length + hashBuffer.length);
	        headerBuffer.copy(handshakeBuffer, 0);
	        hashBuffer.copy(handshakeBuffer, headerBuffer.length);

	        // do a single write, which - upon success - causes a new client websocket to be setup
	        socket.write(handshakeBuffer, 'binary', function(err) {
	          if (err) return; // do not create client if an error happens
	          var client = new WebSocket([req, socket, rest], {
	            protocolVersion: 'hixie-76',
	            protocol: protocol
	          });
	          if (self.options.clientTracking) {
	            self.clients.push(client);
	            client.on('close', function() {
	              var index = self.clients.indexOf(client);
	              if (index != -1) {
	                self.clients.splice(index, 1);
	              }
	            });
	          }

	          // signal upgrade complete
	          socket.removeListener('error', errorHandler);
	          cb(client);
	        });
	      }
	      catch (e) {
	        try { socket.destroy(); } catch (e) {}
	        return;
	      }
	    }

	    // retrieve nonce
	    var nonceLength = 8;
	    if (upgradeHead && upgradeHead.length >= nonceLength) {
	      var nonce = upgradeHead.slice(0, nonceLength);
	      var rest = upgradeHead.length > nonceLength ? upgradeHead.slice(nonceLength) : null;
	      completeHandshake.call(self, nonce, rest, buildResponseHeader());
	    }
	    else {
	      // nonce not present in upgradeHead
	      var nonce = new Buffer(nonceLength);
	      upgradeHead.copy(nonce, 0);
	      var received = upgradeHead.length;
	      var rest = null;
	      var handler = function (data) {
	        var toRead = Math.min(data.length, nonceLength - received);
	        if (toRead === 0) return;
	        data.copy(nonce, received, 0, toRead);
	        received += toRead;
	        if (received == nonceLength) {
	          socket.removeListener('data', handler);
	          if (toRead < data.length) rest = data.slice(toRead);

	          // complete the handshake but send empty buffer for headers since they have already been sent
	          completeHandshake.call(self, nonce, rest, new Buffer(0));
	        }
	      }

	      // handle additional data as we receive it
	      socket.on('data', handler);

	      // send header response before we have the nonce to fix haproxy buffering
	      handshakeResponse();
	    }
	  }

	  // verify client
	  if (typeof this.options.verifyClient == 'function') {
	    var info = {
	      origin: origin,
	      secure: typeof req.connection.authorized !== 'undefined' || typeof req.connection.encrypted !== 'undefined',
	      req: req
	    };
	    if (this.options.verifyClient.length == 2) {
	      var self = this;
	      this.options.verifyClient(info, function(result, code, name) {
	        if (typeof code === 'undefined') code = 401;
	        if (typeof name === 'undefined') name = http.STATUS_CODES[code];

	        if (!result) abortConnection(socket, code, name);
	        else onClientVerified.apply(self);
	      });
	      return;
	    }
	    else if (!this.options.verifyClient(info)) {
	      abortConnection(socket, 401, 'Unauthorized');
	      return;
	    }
	  }

	  // no client verification required
	  onClientVerified();
	}

	function acceptExtensions(offer) {
	  var extensions = {};
	  var options = this.options.perMessageDeflate;
	  var maxPayload = this.options.maxPayload;
	  if (options && offer[PerMessageDeflate.extensionName]) {
	    var perMessageDeflate = new PerMessageDeflate(options !== true ? options : {}, true, maxPayload);
	    perMessageDeflate.accept(offer[PerMessageDeflate.extensionName]);
	    extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
	  }
	  return extensions;
	}

	function abortConnection(socket, code, name) {
	  try {
	    var response = [
	      'HTTP/1.1 ' + code + ' ' + name,
	      'Content-type: text/html'
	    ];
	    socket.write(response.concat('', '').join('\r\n'));
	  }
	  catch (e) { /* ignore errors - we've aborted this connection */ }
	  finally {
	    // ensure that an early aborted connection is shut down completely
	    try { socket.destroy(); } catch (e) {}
	  }
	}


/***/ },
/* 74 */
/***/ function(module, exports) {

	module.exports = require("fs");

/***/ },
/* 75 */
/***/ function(module, exports) {

	module.exports = require("https");

/***/ },
/* 76 */
/***/ function(module, exports) {

	module.exports = require("stream");

/***/ },
/* 77 */
/***/ function(module, exports) {

	module.exports = require("tls");

/***/ },
/* 78 */
/***/ function(module, exports) {

	module.exports = require("zlib");

/***/ }
/******/ ]);