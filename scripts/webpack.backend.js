/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 */
'use strict';

const fs = require('fs');
const webpack = require('webpack');
const __DEV__ = process.env.NODE_ENV !== 'production';

const nodeModules = {};
fs.readdirSync('node_modules').forEach(module => {
  if (module !== '.bin') {
    nodeModules[module] = true;
  }
});

const nodeModulesTransform = function(context, request, callback) {
  // search for a '/' indicating a nested module
  const slashIndex = request.indexOf('/');
  let rootModuleName;
  if (slashIndex === -1) {
    rootModuleName = request;
  } else {
    rootModuleName = request.substr(0, slashIndex);
  }

  // Match for root modules that are in our node_modules
  if (nodeModules.hasOwnProperty(rootModuleName)) {
    callback(null, `commonjs ${request}`);
  } else {
    callback();
  }
};

nodeModules.electron = 'commonjs electron';

module.exports = {
  devtool: __DEV__ ? 'cheap-module-eval-source-map' : false,

  target: 'node',

  entry: {
    inject: './src/GlobalHook.js'
  },

  output: {
    path: './build',
    filename: '[name].js',
  },

  module: {
    loaders: [{
      test: /\.js$/,
      loader:  'babel',
      exclude: /node_modules/,
      query: {
        babelrc: false,
        presets: [
          'es2015',
          'react',
          'stage-0'
        ],
        plugins: [
          'transform-remove-console'
        ]
      }
    }],
  },

  externals: nodeModulesTransform,

  plugins: [
    new webpack.DefinePlugin({
      'process.env': {NODE_ENV: '"production"'}
    }),
    new webpack.optimize.OccurenceOrderPlugin()
  ]
};
