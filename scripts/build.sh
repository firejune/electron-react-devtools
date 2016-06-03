#!/bin/bash
set -ex

SHELL_DIR=$PWD

# GNU mktemp requires the XXXX placeholder
PACKAGE_TMP=$(mktemp -d -t devtools.XXXX)

mkdir "$PACKAGE_TMP/react-devtools-chrome/"
rsync -R \
  build/background.js \
  build/contentScript.js \
  build/inject.js \
  build/main.js \
  build/panel.js \
  icons/icon48.png \
  icons/icon128.png \
  main.html \
  manifest.json \
  panel.html \
  "$PACKAGE_TMP/react-devtools-chrome/"

pushd "$PACKAGE_TMP"
zip -r react-devtools-chrome.zip react-devtools-chrome/
popd

mv "$PACKAGE_TMP/react-devtools-chrome.zip" build/
rm -rf "$PACKAGE_TMP"
