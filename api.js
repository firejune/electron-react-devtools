const electron = require('electron')

require('./build/inject');
global.__REACT_DEVTOOLS_GLOBAL_HOOK__.path = __dirname;

exports.install = () => {
  if (!electron.remote) {
    throw new Error('React DevTools cannot be installed from within the main process.')
  }

  console.log(`Installing React DevTools from ${__dirname}`)
  return electron.remote.BrowserWindow.addDevToolsExtension(__dirname)
}

exports.uninstall = () => {
  return electron.remote.BrowserWindow.removeDevToolsExtension('React Developer Tools')
}

exports.path = __dirname
