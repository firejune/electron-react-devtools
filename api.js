const electron = require('electron')

// devtools-extension install
exports.install = () => {
  if (!electron.remote) {
    throw new Error('React DevTools can only be installed from an renderer process.')
  }

  const extensions = electron.remote.BrowserWindow.getDevToolsExtensions()
  if (extensions && extensions['React Developer Tools']) return


  const path = electron.remote.BrowserWindow.addDevToolsExtension(__dirname)
  console.log(`Installing React DevTools from ${__dirname}`)

  return path
}

// devtools-extension uninstall
exports.uninstall = () => {
  if (!electron.remote) {
    throw new Error('React DevTools can only be uninstalled from an renderer process.')
  }
  return electron.remote.BrowserWindow.removeDevToolsExtension('React Developer Tools')
}
