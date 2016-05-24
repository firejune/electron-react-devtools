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

const webpack = require('webpack');
const __DEV__ = process.env.NODE_ENV !== 'production';

module.exports = {
  devtool: __DEV__ ? 'cheap-module-eval-source-map' : false,
  entry: {
    inject: './src/GlobalHook.js',
    backend: './src/backend.js',
  },

  target: 'node',

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
          'react',
          'stage-0'
        ],
        plugins: [
          'transform-es2015-modules-commonjs',
          'transform-es2015-function-name',
          'transform-remove-console'
        ]
      }
    }],
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env': {NODE_ENV: '"production"'}
    }),
    new webpack.optimize.OccurenceOrderPlugin()
  ]
};
