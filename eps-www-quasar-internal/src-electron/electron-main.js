import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

// needed in case process is undefined under Linux
const platform = process.platform || os.platform()

const currentDir = fileURLToPath(new URL('.', import.meta.url))

let mainWindow
let tray = null

// Set right before an intentional quit (the tray menu's "Quit", or the OS shutting every app
// down at logout/reboot) — lets the window's own 'close' handler below tell a plain click on the
// titlebar X (minimize to tray) apart from an actual quit (let it close for real).
app.isQuitting = false

async function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(currentDir, 'icons/icon.png'), // taskbar/dock icon
    width: 1280,
    height: 800,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(
        currentDir,
        path.join(process.env.QUASAR_ELECTRON_PRELOAD_FOLDER, 'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION)
      )
    }
  })

  if (process.env.DEV) {
    await mainWindow.loadURL(process.env.APP_URL)
  } else {
    await mainWindow.loadFile('index.html')
  }

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools()
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
  }

  // Clicking the titlebar's own close (X) button hides the window instead of quitting — the same
  // "keeps running in the background so desktop notifications keep arriving" idea Slack/Discord/
  // Teams use, and the whole point of this being a desktop app rather than just a browser tab.
  // The only way to actually quit is the tray menu's "Quit" (or the OS itself closing every app at
  // logout/reboot, which sets app.isQuitting via 'before-quit' below first).
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function showMainWindow () {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function createTray () {
  const trayIcon = nativeImage
    .createFromPath(path.resolve(currentDir, 'icons/icon.png'))
    .resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  tray.setToolTip('ePS Staff Desk')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open ePS Staff Desk', click: showMainWindow },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ]))
  // Windows/Linux convention — a plain left-click opens the window; the menu above only shows on
  // right-click there. macOS ignores this and always shows the menu on any click (its own
  // platform convention), so nothing extra is needed for that case.
  tray.on('click', showMainWindow)
}

app.whenReady().then(() => {
  createWindow()
  createTray()
})

app.on('before-quit', () => {
  app.isQuitting = true
})

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  } else {
    showMainWindow()
  }
})
