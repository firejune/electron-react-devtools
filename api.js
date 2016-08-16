const electron = require('electron')

// devtools-extension install
exports.install = () => {
  if (!electron.remote) {
    throw new Error('React DevTools cannot be installed from within the main process.')
  }

  console.log(`Installing React DevTools from ${__dirname}`)

  return electron.remote.BrowserWindow.addDevToolsExtension(__dirname)
}

// devtools-extension uninstall
exports.uninstall = () => {
  return electron.remote.BrowserWindow.removeDevToolsExtension('React Developer Tools')
}
