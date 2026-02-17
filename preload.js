const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("launcherApi", {
  getGames: () => ipcRenderer.invoke("launcher:get-games"),
  getInstallRoot: () => ipcRenderer.invoke("launcher:get-install-root"),
  chooseInstallBaseDirectory: () => ipcRenderer.invoke("launcher:choose-install-base-directory"),
  installGame: (gameId) => ipcRenderer.invoke("launcher:install-game", gameId),
  uninstallGame: (gameId) => ipcRenderer.invoke("launcher:uninstall-game", gameId),
  playGame: (gameId) => ipcRenderer.invoke("launcher:play-game", gameId),
  closeGame: (gameId) => ipcRenderer.invoke("launcher:close-game", gameId),
  openDownloadsFolder: () => ipcRenderer.invoke("launcher:open-downloads-folder"),
  openGameInstallFolder: (gameId) => ipcRenderer.invoke("launcher:open-game-install-folder", gameId),
  openExternalUrl: (urlValue) => ipcRenderer.invoke("launcher:open-external-url", urlValue),
  authGetSession: () => ipcRenderer.invoke("launcher:auth-get-session"),
  authLoginDiscord: () => ipcRenderer.invoke("launcher:auth-login-discord"),
  authLogout: () => ipcRenderer.invoke("launcher:auth-logout"),
  autoUpdateGetState: () => ipcRenderer.invoke("launcher:auto-update-get-state"),
  autoUpdateCheck: () => ipcRenderer.invoke("launcher:auto-update-check"),
  autoUpdateCheckBackground: () => ipcRenderer.invoke("launcher:auto-update-check-background"),
  autoUpdateDownload: () => ipcRenderer.invoke("launcher:auto-update-download"),
  autoUpdateRestartAndInstall: () => ipcRenderer.invoke("launcher:auto-update-restart-and-install"),
  minimizeWindow: () => ipcRenderer.invoke("launcher:window-minimize"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("launcher:window-toggle-maximize"),
  isWindowMaximized: () => ipcRenderer.invoke("launcher:window-is-maximized"),
  closeWindow: () => ipcRenderer.invoke("launcher:window-close"),
  onInstallProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("launcher:install-progress", listener);
    return () => ipcRenderer.removeListener("launcher:install-progress", listener);
  },
  onWindowMaximized: (callback) => {
    const listener = (_event, isMaximized) => callback(Boolean(isMaximized));
    ipcRenderer.on("launcher:window-maximized", listener);
    return () => ipcRenderer.removeListener("launcher:window-maximized", listener);
  },
  onAutoUpdateState: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("launcher:auto-update-state", listener);
    return () => ipcRenderer.removeListener("launcher:auto-update-state", listener);
  }
});
