const electron = require('electron')

// load injection scripts menualy
exports.inject = () => {
  if (global.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== undefined) {
    return console.warn('React DevTools injection script is already loaded.')
  }

  require('./build/inject')
}

// devtools-extension install
exports.install = () => {
  if (!electron.remote) {
    throw new Error('React DevTools cannot be installed from within the main process.')
  }

  console.log(`Installing React DevTools from ${__dirname}`)
  exports.inject();

  return electron.remote.BrowserWindow.addDevToolsExtension(__dirname)
}

// devtools-extension uninstall
exports.uninstall = () => {
  return electron.remote.BrowserWindow.removeDevToolsExtension('React Developer Tools')
}
