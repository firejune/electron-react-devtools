const electron = require('electron')

exports.install = () => {
  if (!electron.remote) {
    throw new Error('React DevTools cannot be installed from within the main process.')
  }
  console.log(`Installing React Devtron from ${__dirname}`)
  return electron.remote.BrowserWindow.addDevToolsExtension(__dirname)
}

exports.uninstall = () => {
  return electron.remote.BrowserWindow.removeDevToolsExtension('react-devtron')
}

exports.path = __dirname
