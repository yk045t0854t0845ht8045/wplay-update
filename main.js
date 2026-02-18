const path = require("path");
const os = require("os");
const fs = require("fs");
const { spawn } = require("child_process");

const ELECTRON_NODE_ENV_KEY = "ELECTRON_RUN_AS_NODE";
const ELECTRON_NODE_RELAUNCH_GUARD_KEY = "WPLAY_ELECTRON_NODE_RELAUNCHED";
const EARLY_STARTUP_LOG_FILE_NAME = "launcher.startup.log";

function appendEarlyStartupLog(message) {
  try {
    const appDataDir = String(process.env.APPDATA || process.cwd() || "").trim() || process.cwd();
    const runtimeDir = path.join(appDataDir, "wplay");
    fs.mkdirSync(runtimeDir, { recursive: true });
    const logPath = path.join(runtimeDir, EARLY_STARTUP_LOG_FILE_NAME);
    const line = `[${new Date().toISOString()}] ${String(message || "").trim()}\n`;
    fs.appendFileSync(logPath, line, "utf8");
  } catch (_error) {
    // Ignore logging failures during early bootstrap.
  }
}

function relaunchWithoutElectronRunAsNode() {
  const relaunchEnv = { ...process.env };
  delete relaunchEnv[ELECTRON_NODE_ENV_KEY];
  relaunchEnv[ELECTRON_NODE_RELAUNCH_GUARD_KEY] = "1";

  const nextArgs = process.argv
    .slice(1)
    .filter((arg) => {
      const value = String(arg || "").trim();
      return /^wplay:\/\//i.test(value);
    });
  const child = spawn(process.execPath, nextArgs, {
    env: relaunchEnv,
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  child.unref();
}

const electronModule = require("electron");
const hasElectronMainApi = Boolean(
  electronModule &&
    typeof electronModule === "object" &&
    electronModule.app &&
    electronModule.BrowserWindow &&
    electronModule.ipcMain
);

if (!hasElectronMainApi) {
  const runAsNodeEnabled = String(process.env[ELECTRON_NODE_ENV_KEY] || "").trim() === "1";
  const alreadyRelaunched = String(process.env[ELECTRON_NODE_RELAUNCH_GUARD_KEY] || "").trim() === "1";

  appendEarlyStartupLog(
    `[BOOTSTRAP] electron main API indisponivel (runAsNode=${runAsNodeEnabled}, relaunched=${alreadyRelaunched}).`
  );

  if (runAsNodeEnabled && !alreadyRelaunched) {
    try {
      relaunchWithoutElectronRunAsNode();
      appendEarlyStartupLog("[BOOTSTRAP] relaunch solicitado sem ELECTRON_RUN_AS_NODE.");
      process.exit(0);
    } catch (error) {
      appendEarlyStartupLog(`[BOOTSTRAP] relaunch falhou: ${error?.message || error}`);
      process.exit(1);
    }
  }

  process.exit(1);
}

const { app, BrowserWindow, ipcMain, shell, dialog, safeStorage, session, screen, nativeImage, Tray, Menu } =
  electronModule;
const fsp = require("fs/promises");
const crypto = require("crypto");
const http = require("http");
const { pipeline } = require("stream/promises");
const axios = require("axios");
const { path7za } = require("7zip-bin");
let autoUpdater = null;
try {
  ({ autoUpdater } = require("electron-updater"));
} catch (_error) {
  autoUpdater = null;
}

const INSTALL_ROOT_NAME = "wyzer_games";
const TEMP_DIR_NAME = "_wyzer_temp";
const MANIFEST_FILE_NAME = ".wyzer_manifest.json";
const INSTALL_SESSION_STATE_FILE_NAME = "launcher.active-installs.json";
const RUNTIME_CONFIG_FILE_NAME = "launcher.runtime.json";
const AUTH_CONFIG_FILE_NAME = "auth.json";
const AUTH_CONFIG_EXAMPLE_FILE_NAME = "auth.example.json";
const UPDATER_CONFIG_FILE_NAME = "updater.json";
const UPDATER_CONFIG_EXAMPLE_FILE_NAME = "updater.example.json";
const INSTALL_PROGRESS_CHANNEL = "launcher:install-progress";
const AUTO_UPDATE_STATE_CHANNEL = "launcher:auto-update-state";
const MAX_SCAN_DEPTH = 6;
const MAX_SCAN_FILES = 7000;
const INSTALL_SIZE_CACHE_TTL_MS = 60 * 60 * 1000;
const AUTH_PROTOCOL_SCHEME = "wplay";
const AUTH_CALLBACK_URL_DEFAULT = `${AUTH_PROTOCOL_SCHEME}://auth/callback`;
const AUTH_LOGIN_TIMEOUT_MS = 3 * 60 * 1000;
const AUTH_EXPIRY_SKEW_SECONDS = 30;
const AUTH_STEAM_SESSION_TTL_SECONDS = 180 * 24 * 60 * 60;
const AUTH_STEAM_LOCAL_CALLBACK_HOST = "127.0.0.1";
const AUTH_STEAM_LOCAL_CALLBACK_PATH = "/auth/callback";
const DOWNLOAD_STREAM_TIMEOUT_MS = Math.max(
  2 * 60 * 1000,
  Number(process.env.WPLAY_DOWNLOAD_TIMEOUT_MS) || 45 * 60 * 1000
);
const GOOGLE_DRIVE_MAX_CONFIRM_HOPS = 6;
const DEFENDER_SCAN_TIMEOUT_MS = 20 * 60 * 1000;
const ARCHIVE_TOOL_TIMEOUT_MS = 25 * 60 * 1000;
const AUTO_UPDATE_MIN_CHECK_INTERVAL_MS = 3 * 60 * 1000;
const AUTO_UPDATE_DEFAULT_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const AUTO_UPDATE_CHECK_COOLDOWN_MS = 45 * 1000;
const AUTO_UPDATE_PRELAUNCH_CHECK_TIMEOUT_MS = 15 * 1000;
const AUTO_UPDATE_WINDOW_READY_CHECK_DELAY_MS = 3500;
const AUTO_UPDATE_SPLASH_MAX_WAIT_MS = 90 * 1000;
const AUTO_UPDATE_SPLASH_POLL_INTERVAL_MS = 250;
const RUNNING_PROCESS_CACHE_TTL_MS = 10 * 1000;
const CATALOG_DEFAULT_POLL_INTERVAL_SECONDS = 15;
const CATALOG_MIN_POLL_INTERVAL_SECONDS = 10;
const CATALOG_MAX_POLL_INTERVAL_SECONDS = 300;
const CATALOG_DEFAULT_SUPABASE_SCHEMA = "public";
const CATALOG_DEFAULT_SUPABASE_TABLE = "launcher_games";
const NOTIFICATIONS_DEFAULT_SUPABASE_SCHEMA = "public";
const NOTIFICATIONS_DEFAULT_SUPABASE_TABLE = "launcher_notifications";
const SOCIAL_ACTIVITY_DEFAULT_SUPABASE_SCHEMA = "public";
const SOCIAL_ACTIVITY_DEFAULT_SUPABASE_TABLE = "launcher_friend_game_activity";
const NOTIFICATIONS_HISTORY_LIMIT = 15;
const SOCIAL_ACTIVITY_FETCH_LIMIT = 60;
const SOCIAL_ACTIVITY_EVENT_TTL_HOURS = 24;
const SOCIAL_ACTIVITY_EMIT_DEBOUNCE_MS = 75 * 1000;
const SOCIAL_ACTIVITY_BACKGROUND_POLL_INTERVAL_MS = 4200;
const SOCIAL_ACTIVITY_BACKGROUND_POLL_INTERVAL_LOW_SPEC_MS = 6500;
const SOCIAL_ACTIVITY_BACKGROUND_CURSOR_BACKTRACK_MS = 9000;
const SOCIAL_ACTIVITY_BACKGROUND_MAX_EVENT_AGE_MS = 30 * 60 * 1000;
const SOCIAL_ACTIVITY_BACKGROUND_SEEN_LIMIT = 420;
const SOCIAL_ACTIVITY_BACKGROUND_LIMIT = 80;
const WINDOWS_APP_USER_MODEL_ID = "com.wplay.app";
const WINDOWS_APP_USER_MODEL_ID_DEV = "com.wplay.app.dev";
const DEV_RUNTIME_APP_NAME = "WPlay Dev";
const DEV_RUNTIME_USER_DATA_DIR_NAME = "WPlay-Dev";
const YOUTUBE_EMBED_REFERER = "https://www.youtube.com/";
const YOUTUBE_EMBED_ORIGIN = "https://www.youtube.com";
const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";
const STEAM_API_BASE_URL = "https://api.steampowered.com";
const STEAM_PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;
const STEAM_FRIENDS_CACHE_TTL_MS = 5 * 60 * 1000;
const STEAM_FRIENDS_EMPTY_RETRY_MS = 90 * 1000;
const STEAM_OWNED_GAMES_CACHE_TTL_MS = 5 * 60 * 1000;
const STEAM_ACHIEVEMENTS_CACHE_TTL_MS = 15 * 60 * 1000;
const STEAM_EMPTY_CACHE_RETRY_MS = 45 * 1000;
const STEAM_CLIENT_PROCESS_NAMES = new Set(["steam.exe", "steam"]);
const GAME_START_TOAST_WIDTH = 398;
const GAME_START_TOAST_HEIGHT = 88;
const GAME_START_TOAST_MARGIN_TOP = 0;
const GAME_START_TOAST_MARGIN_RIGHT = 0;
const GAME_START_TOAST_STACK_GAP = 2;
const GAME_START_TOAST_LIFETIME_MS = 4300;
const GAME_START_TOAST_EXIT_MS = 260;
const GAME_START_TOAST_MAX_WINDOWS = 4;
const GAME_START_TOAST_DEDUPE_WINDOW_MS = 12 * 1000;
const GAME_START_TOAST_BG_COLOR = "#09090A";
const GAME_START_TOAST_ACCENT_COLOR = "#008CFF";
const LIGHTWEIGHT_GAMES_REFRESH_INTERVAL_MS = 12 * 1000;
const STARTUP_LOG_FILE_NAME = "launcher.startup.log";
const STARTUP_HEALTH_FILE_NAME = "launcher.startup-health.json";
const STARTUP_BOOT_TIMEOUT_MS = 45 * 1000;
const STARTUP_FAILURE_WINDOW_MS = 20 * 60 * 1000;
const STARTUP_FAILURES_BEFORE_SAFE_MODE = 2;
const MAIN_WINDOW_MAX_LOAD_RETRIES = 2;
const MAIN_WINDOW_LOAD_RETRY_DELAY_MS = 1200;
const TRAY_TOOLTIP_TEXT = "WPlay Games Launcher";
const ACTIVE_INSTALL_PHASES = new Set(["preparing", "downloading", "extracting"]);

let mainWindow = null;
let updateSplashWindow = null;
let tray = null;
let appQuitRequested = false;
let allowUpdateSplashWindowClose = false;
let startupBootWatchdogTimer = null;
let mainWindowLoadRetryCount = 0;
let youtubeRequestHeaderHookInstalled = false;
let authDeepLinkUrlBuffer = "";
let activeAuthLoginRequest = null;
let authSessionCache = null;
let autoUpdateInitialized = false;
let autoUpdateCheckInFlight = null;
let autoUpdateDownloadInFlight = null;
let autoUpdateIntervalId = null;
let autoUpdateConfigSnapshot = null;
let autoUpdateFeedValidationCompleted = false;
let autoUpdateFeedValidationInFlight = null;
let autoUpdateLastCheckOrigin = "";
let autoUpdateLastRequestedAt = 0;
let remoteCatalogInFlight = null;
const remoteCatalogCache = {
  entries: null,
  loadedAt: 0,
  source: "local-json",
  error: "",
  lastSyncAt: 0
};
const catalogSizeSyncInFlightByGameId = new Map();
const activeInstalls = new Map();
const activeInstallProgressByGameId = new Map();
const activeInstallSessionsByGameId = new Map();
const activeUninstalls = new Set();
const installSizeCache = new Map();
let installSessionPersistQueue = Promise.resolve();
const sevenZipExecutableCache = {
  path: ""
};
const winRarExecutableCache = {
  path: ""
};
const autoUpdateState = {
  supported: false,
  configured: false,
  enabled: false,
  status: "disabled",
  message: "Atualizador indisponivel.",
  currentVersion: app.getVersion(),
  latestVersion: "",
  updateDownloaded: false,
  progressPercent: 0,
  bytesPerSecond: 0,
  transferredBytes: 0,
  totalBytes: 0,
  lastCheckedAt: "",
  error: "",
  // Filled right after runtime channel detection to avoid bootstrap TDZ.
  runtimeChannel: "",
  runtimePackaged: false,
  runtimeExec: path.basename(String(process.execPath || "")).trim().toLowerCase(),
  runtimeDebug: "",
  startupSafeMode: false,
  startupSafeModeReason: "",
  preferLatestFullInstaller: true
};
const runningProcessCache = {
  fetchedAt: 0,
  namesLower: new Set()
};
const steamUserDataCache = {
  steamId: "",
  profile: null,
  profileFetchedAt: 0,
  profileInFlight: null,
  friendsSteamIds: new Set(),
  friendsFetchedAt: 0,
  friendsInFlight: null,
  ownedGamesByAppId: new Map(),
  ownedGamesFetchedAt: 0,
  ownedGamesInFlight: null,
  achievementsByAppId: new Map(),
  achievementsInFlight: new Map()
};
const socialActivityEmitCache = new Map();
const socialActivityBackgroundSeenIds = new Set();
const windowIconAssetCache = {
  resolved: false,
  path: "",
  image: null
};
const toastBrandDataUrlCache = {
  resolved: false,
  value: ""
};
const gameStartToastWindows = [];
const gameStartToastDedupeCache = new Map();
const hostPerformanceProfileCache = {
  resolved: false,
  lowSpec: false
};
const runtimeStartupHealthState = {
  safeMode: false,
  failureCount: 0,
  reason: ""
};
let socialActivityBackgroundPollTimer = null;
let socialActivityBackgroundPollInFlight = null;
let socialActivityBackgroundCursorIso = "";
let socialActivityBackgroundCurrentUserId = "";

function isElectronBinaryPath(executablePath = process.execPath) {
  const execName = path.basename(String(executablePath || "")).trim().toLowerCase();
  return execName === "electron" || execName === "electron.exe";
}

function resolveRuntimeChannel() {
  if (app.isPackaged) {
    return "packaged";
  }
  if (Boolean(process.defaultApp) || isElectronBinaryPath(process.execPath)) {
    return "dev";
  }
  return "packaged";
}

const runtimeChannel = resolveRuntimeChannel();
autoUpdateState.runtimeChannel = runtimeChannel;

function configureRuntimeIdentity() {
  if (runtimeChannel !== "dev") {
    return;
  }

  try {
    app.setName(DEV_RUNTIME_APP_NAME);
  } catch (_error) {
    // Ignore app name assignment failures.
  }

  try {
    const appDataDir = app.getPath("appData");
    if (!appDataDir) {
      return;
    }
    const runtimeUserDataDir = path.join(appDataDir, DEV_RUNTIME_USER_DATA_DIR_NAME);
    app.setPath("userData", runtimeUserDataDir);
  } catch (_error) {
    // Ignore userData override failures.
  }
}

configureRuntimeIdentity();

function isTruthyFlagValue(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function resolveRuntimeStateDirectory() {
  try {
    if (app?.isReady?.()) {
      const userDataDir = String(app.getPath("userData") || "").trim();
      if (userDataDir) {
        fs.mkdirSync(userDataDir, { recursive: true });
        return userDataDir;
      }
    }
  } catch (_error) {
    // Fallback below.
  }

  const appDataDir = String(process.env.APPDATA || process.cwd() || "").trim() || process.cwd();
  const runtimeFolder = runtimeChannel === "dev" ? DEV_RUNTIME_USER_DATA_DIR_NAME : "wplay";
  const fallbackDir = path.join(appDataDir, runtimeFolder);
  try {
    fs.mkdirSync(fallbackDir, { recursive: true });
  } catch (_error) {
    return "";
  }
  return fallbackDir;
}

function getStartupHealthFilePath() {
  const baseDir = resolveRuntimeStateDirectory();
  if (!baseDir) {
    return "";
  }
  return path.join(baseDir, STARTUP_HEALTH_FILE_NAME);
}

function readStartupHealthState() {
  const defaultState = {
    pendingLaunch: false,
    lastLaunchAt: "",
    lastSuccessAt: "",
    consecutiveFailedLaunches: 0,
    safeModeEnabled: false,
    safeModeReason: ""
  };
  const healthPath = getStartupHealthFilePath();
  if (!healthPath) {
    return defaultState;
  }

  try {
    if (!fs.existsSync(healthPath)) {
      return defaultState;
    }
    const raw = fs.readFileSync(healthPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return defaultState;
    }
    return {
      pendingLaunch: parsed.pendingLaunch === true,
      lastLaunchAt: String(parsed.lastLaunchAt || "").trim(),
      lastSuccessAt: String(parsed.lastSuccessAt || "").trim(),
      consecutiveFailedLaunches: Math.max(0, Math.trunc(Number(parsed.consecutiveFailedLaunches) || 0)),
      safeModeEnabled: parsed.safeModeEnabled === true,
      safeModeReason: String(parsed.safeModeReason || "").trim()
    };
  } catch (_error) {
    return defaultState;
  }
}

function writeStartupHealthState(nextState) {
  const healthPath = getStartupHealthFilePath();
  if (!healthPath) {
    return;
  }

  const safeState = nextState && typeof nextState === "object" ? nextState : {};
  const payload = {
    pendingLaunch: safeState.pendingLaunch === true,
    lastLaunchAt: String(safeState.lastLaunchAt || "").trim(),
    lastSuccessAt: String(safeState.lastSuccessAt || "").trim(),
    consecutiveFailedLaunches: Math.max(0, Math.trunc(Number(safeState.consecutiveFailedLaunches) || 0)),
    safeModeEnabled: safeState.safeModeEnabled === true,
    safeModeReason: String(safeState.safeModeReason || "").trim()
  };

  try {
    fs.writeFileSync(healthPath, JSON.stringify(payload, null, 2), "utf8");
  } catch (_error) {
    // Ignore health state write failures.
  }
}

function prepareStartupHealthForLaunch() {
  const previous = readStartupHealthState();
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const previousLaunchMs = Date.parse(previous.lastLaunchAt || "");
  const launchWasRecent =
    Number.isFinite(previousLaunchMs) && nowMs >= previousLaunchMs && nowMs - previousLaunchMs <= STARTUP_FAILURE_WINDOW_MS;

  let failureCount = launchWasRecent ? previous.consecutiveFailedLaunches : 0;
  if (previous.pendingLaunch && launchWasRecent) {
    failureCount += 1;
  } else if (!launchWasRecent) {
    failureCount = 0;
  }

  const forceSafeMode = isTruthyFlagValue(process.env.WPLAY_FORCE_SAFE_MODE);
  const autoSafeMode = failureCount >= STARTUP_FAILURES_BEFORE_SAFE_MODE;
  const safeModeEnabled = forceSafeMode || autoSafeMode;
  const safeModeReason = forceSafeMode ? "forced-env" : safeModeEnabled ? `auto-${failureCount}-failed-launches` : "";

  runtimeStartupHealthState.safeMode = safeModeEnabled;
  runtimeStartupHealthState.failureCount = failureCount;
  runtimeStartupHealthState.reason = safeModeReason;

  writeStartupHealthState({
    ...previous,
    pendingLaunch: true,
    lastLaunchAt: nowIso,
    consecutiveFailedLaunches: failureCount,
    safeModeEnabled,
    safeModeReason
  });

  appendEarlyStartupLog(
    `[STARTUP_HEALTH] pending launch; failures=${failureCount}; safeMode=${safeModeEnabled}; reason=${safeModeReason || "none"}`
  );
}

function markStartupLaunchHealthy(source = "renderer-ready") {
  const previous = readStartupHealthState();
  const nowIso = new Date().toISOString();
  runtimeStartupHealthState.safeMode = false;
  runtimeStartupHealthState.failureCount = 0;
  runtimeStartupHealthState.reason = "";
  writeStartupHealthState({
    ...previous,
    pendingLaunch: false,
    lastSuccessAt: nowIso,
    consecutiveFailedLaunches: 0,
    safeModeEnabled: false,
    safeModeReason: ""
  });
  appendStartupLog(`[STARTUP_HEALTH] launch healthy at source=${source}.`);
}

function getInstallSessionStateFilePath() {
  const baseDir = resolveRuntimeStateDirectory();
  if (!baseDir) {
    return "";
  }
  return path.join(baseDir, INSTALL_SESSION_STATE_FILE_NAME);
}

function normalizePathForComparison(value) {
  const absolute = normalizeAbsolutePath(value);
  if (!absolute) return "";
  if (process.platform === "win32") {
    return absolute.toLowerCase();
  }
  return absolute;
}

function arePathsEquivalent(left, right) {
  const a = normalizePathForComparison(left);
  const b = normalizePathForComparison(right);
  return Boolean(a && b && a === b);
}

function isPathInsideDirectory(baseDir, targetPath) {
  const base = normalizePathForComparison(baseDir);
  const target = normalizePathForComparison(targetPath);
  if (!base || !target) return false;
  if (target === base) return true;
  const baseWithSeparator = base.endsWith(path.sep) ? base : `${base}${path.sep}`;
  return target.startsWith(baseWithSeparator);
}

function isManagedInstallRootPath(installRoot) {
  const normalized = normalizeAbsolutePath(installRoot);
  if (!normalized) return false;
  return path.basename(normalized).toLowerCase() === INSTALL_ROOT_NAME.toLowerCase();
}

function normalizeActiveInstallSessionRecord(rawRecord) {
  if (!rawRecord || typeof rawRecord !== "object") {
    return null;
  }
  const gameId = String(rawRecord.gameId || "").trim();
  if (!gameId) {
    return null;
  }

  const phaseRaw = String(rawRecord.phase || "").trim().toLowerCase();
  const phase = ACTIVE_INSTALL_PHASES.has(phaseRaw) ? phaseRaw : "preparing";
  const installRoot = normalizeAbsolutePath(rawRecord.installRoot || "");
  const installDir = normalizeAbsolutePath(rawRecord.installDir || "");
  const tempArchivePath = normalizeAbsolutePath(rawRecord.tempArchivePath || "");
  const nowIso = new Date().toISOString();

  return {
    gameId,
    gameName: String(rawRecord.gameName || "").trim(),
    installRoot,
    installDir,
    tempArchivePath,
    phase,
    startedAt: String(rawRecord.startedAt || "").trim() || nowIso,
    updatedAt: String(rawRecord.updatedAt || "").trim() || nowIso
  };
}

async function readInstallSessionRecordsFromDisk() {
  const filePath = getInstallSessionStateFilePath();
  if (!filePath) {
    return [];
  }

  try {
    const raw = await fsp.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.sessions) ? parsed.sessions : [];
    return records
      .map((record) => normalizeActiveInstallSessionRecord(record))
      .filter(Boolean);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }
    appendStartupLog(`[INSTALL_RECOVERY_READ_ERROR] ${formatStartupErrorForLog(error)}`);
    return [];
  }
}

async function writeInstallSessionRecordsToDisk(records) {
  const filePath = getInstallSessionStateFilePath();
  if (!filePath) {
    return;
  }

  const normalizedRecords = Array.isArray(records)
    ? records
        .map((record) => normalizeActiveInstallSessionRecord(record))
        .filter(Boolean)
    : [];

  if (normalizedRecords.length === 0) {
    await fsp.rm(filePath, { force: true }).catch(() => {});
    return;
  }

  try {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    const payload = {
      updatedAt: new Date().toISOString(),
      sessions: normalizedRecords
    };
    await fsp.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  } catch (error) {
    appendStartupLog(`[INSTALL_RECOVERY_WRITE_ERROR] ${formatStartupErrorForLog(error)}`);
  }
}

function flushActiveInstallSessionsSync() {
  const filePath = getInstallSessionStateFilePath();
  if (!filePath) {
    return;
  }

  const records = [...activeInstallSessionsByGameId.values()]
    .map((record) => normalizeActiveInstallSessionRecord(record))
    .filter(Boolean);

  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (records.length === 0) {
      fs.rmSync(filePath, { force: true });
      return;
    }
    const payload = {
      updatedAt: new Date().toISOString(),
      sessions: records
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  } catch (error) {
    appendStartupLog(`[INSTALL_RECOVERY_FLUSH_ERROR] ${formatStartupErrorForLog(error)}`);
  }
}

function queuePersistActiveInstallSessions() {
  installSessionPersistQueue = installSessionPersistQueue
    .catch(() => {})
    .then(async () => {
      await writeInstallSessionRecordsToDisk([...activeInstallSessionsByGameId.values()]);
    });
  return installSessionPersistQueue;
}

async function registerActiveInstallSession(sessionRecord) {
  const normalized = normalizeActiveInstallSessionRecord(sessionRecord);
  if (!normalized) {
    return;
  }
  activeInstallSessionsByGameId.set(normalized.gameId, normalized);
  await queuePersistActiveInstallSessions();
}

async function updateActiveInstallSessionPhase(gameId, phase) {
  const id = String(gameId || "").trim();
  if (!id) {
    return;
  }
  const current = activeInstallSessionsByGameId.get(id);
  if (!current) {
    return;
  }
  const nextPhase = String(phase || "").trim().toLowerCase();
  if (!ACTIVE_INSTALL_PHASES.has(nextPhase) || current.phase === nextPhase) {
    return;
  }
  activeInstallSessionsByGameId.set(id, {
    ...current,
    phase: nextPhase,
    updatedAt: new Date().toISOString()
  });
  await queuePersistActiveInstallSessions();
}

async function clearActiveInstallSession(gameId) {
  const id = String(gameId || "").trim();
  if (!id) {
    return;
  }
  if (!activeInstallSessionsByGameId.has(id)) {
    return;
  }
  activeInstallSessionsByGameId.delete(id);
  await queuePersistActiveInstallSessions();
}

async function recoverInterruptedInstallSessionsOnStartup() {
  const records = await readInstallSessionRecordsFromDisk();
  if (!Array.isArray(records) || records.length === 0) {
    return;
  }

  let removedInstallDirs = 0;
  let removedTempArchives = 0;
  let skippedSessions = 0;

  for (const record of records) {
    const installRoot = normalizeAbsolutePath(record.installRoot || "");
    const installDir = normalizeAbsolutePath(record.installDir || "");
    const tempArchivePath = normalizeAbsolutePath(record.tempArchivePath || "");
    const tempRoot = installRoot ? path.join(installRoot, TEMP_DIR_NAME) : "";
    let handled = false;

    if (
      installRoot &&
      installDir &&
      isManagedInstallRootPath(installRoot) &&
      isPathInsideDirectory(installRoot, installDir) &&
      !arePathsEquivalent(installRoot, installDir)
    ) {
      await fsp.rm(installDir, { recursive: true, force: true }).catch(() => {});
      const cacheKey = getInstallSizeCacheKey(installDir);
      if (cacheKey) {
        installSizeCache.delete(cacheKey);
      }
      removedInstallDirs += 1;
      handled = true;
    }

    if (
      installRoot &&
      tempArchivePath &&
      isManagedInstallRootPath(installRoot) &&
      tempRoot &&
      isPathInsideDirectory(tempRoot, tempArchivePath)
    ) {
      await fsp.rm(tempArchivePath, { force: true }).catch(() => {});
      removedTempArchives += 1;
      handled = true;
    }

    if (!handled) {
      skippedSessions += 1;
      appendStartupLog(
        `[INSTALL_RECOVERY_SKIP] gameId=${record.gameId || "unknown"} installRoot=${installRoot || "n/a"} installDir=${installDir || "n/a"}`
      );
    }
  }

  activeInstallSessionsByGameId.clear();
  activeInstallProgressByGameId.clear();
  await writeInstallSessionRecordsToDisk([]);

  appendStartupLog(
    `[INSTALL_RECOVERY] sessoes=${records.length} instalacoes-removidas=${removedInstallDirs} arquivos-temp-removidos=${removedTempArchives} ignoradas=${skippedSessions}`
  );
}

function getActiveInstallProgressSnapshot() {
  return {
    generatedAt: new Date().toISOString(),
    entries: [...activeInstallProgressByGameId.values()].map((entry) => ({ ...entry }))
  };
}

function clearStartupBootWatchdog() {
  if (!startupBootWatchdogTimer) {
    return;
  }
  clearTimeout(startupBootWatchdogTimer);
  startupBootWatchdogTimer = null;
}

function armStartupBootWatchdog() {
  clearStartupBootWatchdog();
  startupBootWatchdogTimer = setTimeout(() => {
    startupBootWatchdogTimer = null;
    appendStartupLog(`[WINDOW] watchdog timeout apos ${STARTUP_BOOT_TIMEOUT_MS}ms sem did-finish-load.`);
  }, STARTUP_BOOT_TIMEOUT_MS);
}

function applyStartupSafeModeIfRequired() {
  if (!runtimeStartupHealthState.safeMode) {
    return;
  }
  try {
    app.disableHardwareAcceleration();
  } catch (_error) {
    // Ignore hardware acceleration toggle failures.
  }
  try {
    app.commandLine.appendSwitch("disable-gpu");
    app.commandLine.appendSwitch("disable-gpu-compositing");
  } catch (_error) {
    // Ignore command-line switch failures.
  }
  appendEarlyStartupLog(
    `[SAFE_MODE] ativado; failures=${runtimeStartupHealthState.failureCount}; reason=${runtimeStartupHealthState.reason || "none"}`
  );
}

prepareStartupHealthForLaunch();
applyStartupSafeModeIfRequired();

function resolveAutoUpdateRuntimeInfo() {
  const execPathValue = String(process.execPath || "").trim();
  const execName = path.basename(execPathValue || "").trim().toLowerCase();
  const defaultApp = Boolean(process.defaultApp);
  const packagedByElectron = Boolean(app.isPackaged);
  const electronBinary = isElectronBinaryPath(execPathValue);
  const resourcesPathValue = String(process.resourcesPath || "").trim();
  const asarPath = resourcesPathValue ? path.join(resourcesPathValue, "app.asar") : "";
  const packagedByHeuristic = Boolean(asarPath && fs.existsSync(asarPath) && !defaultApp && !electronBinary);
  const packaged = packagedByElectron || packagedByHeuristic || runtimeChannel === "packaged";

  return {
    packaged,
    packagedByElectron,
    packagedByHeuristic,
    defaultApp,
    electronBinary,
    runtimeChannel,
    execName,
    execPath: execPathValue
  };
}

function buildAutoUpdateRuntimeDiagnostic(runtimeInfo = resolveAutoUpdateRuntimeInfo()) {
  return (
    `channel=${runtimeInfo.runtimeChannel};` +
    ` app.isPackaged=${runtimeInfo.packagedByElectron};` +
    ` heuristicPackaged=${runtimeInfo.packagedByHeuristic};` +
    ` defaultApp=${runtimeInfo.defaultApp};` +
    ` electronBinary=${runtimeInfo.electronBinary};` +
    ` exec=${runtimeInfo.execName || "unknown"}`
  );
}

function resolveAutoUpdateUnsupportedMessage(runtimeInfo = resolveAutoUpdateRuntimeInfo()) {
  if (runtimeInfo.runtimeChannel === "dev" || runtimeInfo.defaultApp || runtimeInfo.electronBinary) {
    return "Atualizador automatico desativado no modo desenvolvimento. Feche o launcher dev e abra o WPlay instalado.";
  }
  return "Atualizador automatico indisponivel neste runtime.";
}

function ensureWindowsAppIdentity() {
  if (process.platform !== "win32" || typeof app.setAppUserModelId !== "function") {
    return;
  }
  try {
    const appUserModelId = runtimeChannel === "dev" ? WINDOWS_APP_USER_MODEL_ID_DEV : WINDOWS_APP_USER_MODEL_ID;
    app.setAppUserModelId(appUserModelId);
  } catch (_error) {
    // Ignore AppUserModelID assignment failures.
  }
}

ensureWindowsAppIdentity();

function resolveHostLowSpecProfile() {
  if (hostPerformanceProfileCache.resolved) {
    return hostPerformanceProfileCache.lowSpec;
  }

  let cpuCount = 0;
  let totalMemoryBytes = 0;
  try {
    cpuCount = Array.isArray(os.cpus()) ? os.cpus().length : 0;
  } catch (_error) {
    cpuCount = 0;
  }
  try {
    totalMemoryBytes = Number(os.totalmem() || 0);
  } catch (_error) {
    totalMemoryBytes = 0;
  }

  const totalMemoryGb = totalMemoryBytes > 0 ? totalMemoryBytes / (1024 ** 3) : 0;
  const lowSpecByCpu = cpuCount > 0 && cpuCount <= 4;
  const lowSpecByMemory = totalMemoryGb > 0 && totalMemoryGb <= 8;
  const lowSpec = lowSpecByCpu || lowSpecByMemory;

  hostPerformanceProfileCache.resolved = true;
  hostPerformanceProfileCache.lowSpec = lowSpec;
  return lowSpec;
}

function getStartupLogPath() {
  try {
    const userDataDir = app?.isReady?.() ? app.getPath("userData") : "";
    const baseDir = String(userDataDir || process.env.APPDATA || process.cwd() || "").trim() || process.cwd();
    if (!baseDir) {
      return "";
    }
    fs.mkdirSync(baseDir, { recursive: true });
    return path.join(baseDir, STARTUP_LOG_FILE_NAME);
  } catch (_error) {
    return "";
  }
}

function formatStartupErrorForLog(error) {
  if (!error) {
    return "";
  }
  if (error instanceof Error) {
    return error.stack || error.message || String(error);
  }
  return String(error);
}

function appendStartupLog(message) {
  const logPath = getStartupLogPath();
  if (!logPath) return;
  const line = `[${new Date().toISOString()}] ${String(message || "").trim()}\n`;
  try {
    fs.appendFileSync(logPath, line, "utf8");
  } catch (_error) {
    // Ignore startup log write failures.
  }
}

function installProcessRuntimeErrorHandlers() {
  process.on("uncaughtException", (error) => {
    appendStartupLog(`[UNCAUGHT_EXCEPTION] ${formatStartupErrorForLog(error)}`);
    try {
      dialog.showErrorBox(
        "Falha ao iniciar o launcher",
        `O WPlay encontrou um erro critico ao iniciar.\n\n${error?.message || "Erro desconhecido."}`
      );
    } catch (_dialogError) {
      // Ignore dialog failures.
    }
  });

  process.on("unhandledRejection", (reason) => {
    appendStartupLog(`[UNHANDLED_REJECTION] ${formatStartupErrorForLog(reason)}`);
  });
}

installProcessRuntimeErrorHandlers();

function collectWindowIconCandidatePaths() {
  const isWindows = process.platform === "win32";
  const iconNames = isWindows ? ["icon.ico", "icon.png"] : ["icon.png", "icon.ico"];
  const candidates = [];
  const push = (value) => {
    const normalized = String(value || "").trim();
    if (normalized) {
      candidates.push(normalized);
    }
  };
  const pushBuildIconsFrom = (baseDir) => {
    for (const iconName of iconNames) {
      push(path.join(baseDir, "build", iconName));
    }
  };

  if (app.isPackaged && process.resourcesPath) {
    pushBuildIconsFrom(process.resourcesPath);
    pushBuildIconsFrom(path.join(process.resourcesPath, "app.asar.unpacked"));
    push(path.join(process.resourcesPath, "renderer", "assets", "icon.ico"));
    push(path.join(process.resourcesPath, "renderer", "assets", "logo.png"));
    push(path.join(process.resourcesPath, "app.asar.unpacked", "renderer", "assets", "icon.ico"));
    push(path.join(process.resourcesPath, "app.asar.unpacked", "renderer", "assets", "logo.png"));
  }

  pushBuildIconsFrom(__dirname);
  push(path.join(__dirname, "icon.ico"));
  push(path.join(__dirname, "icon.png"));
  push(path.join(__dirname, "logo.png"));
  push(path.join(__dirname, "renderer", "assets", "icon.ico"));
  push(path.join(__dirname, "renderer", "assets", "logo.png"));
  push(path.join(__dirname, "public", "assets", "icon.ico"));
  push(path.join(__dirname, "public", "assets", "logo.png"));
  push(process.execPath);

  try {
    const appPath = app.getAppPath();
    if (appPath) {
      pushBuildIconsFrom(appPath);
      push(path.join(appPath, "icon.ico"));
      push(path.join(appPath, "icon.png"));
      push(path.join(appPath, "renderer", "assets", "icon.ico"));
      push(path.join(appPath, "renderer", "assets", "logo.png"));
    }
  } catch (_error) {
    // Ignore appPath resolution failures before readiness.
  }

  return [...new Set(candidates)];
}

function tryReadIconImageFromPath(iconPath) {
  const normalized = String(iconPath || "").trim();
  if (!normalized) {
    return null;
  }
  try {
    if (!fs.existsSync(normalized)) {
      return null;
    }
    const image = nativeImage.createFromPath(normalized);
    if (!image || typeof image.isEmpty !== "function" || image.isEmpty()) {
      return null;
    }
    return image;
  } catch (_error) {
    return null;
  }
}

function resolveWindowIconAsset() {
  if (windowIconAssetCache.resolved) {
    return windowIconAssetCache;
  }

  const candidates = collectWindowIconCandidatePaths();
  for (const candidatePath of candidates) {
    const iconImage = tryReadIconImageFromPath(candidatePath);
    if (!iconImage) {
      continue;
    }
    windowIconAssetCache.path = candidatePath;
    windowIconAssetCache.image = iconImage;
    windowIconAssetCache.resolved = true;
    return windowIconAssetCache;
  }

  if (process.platform === "win32") {
    console.warn("[ICON] Nenhum arquivo de icone valido foi encontrado. Verifique build/icon.ico.");
  }
  windowIconAssetCache.path = "";
  windowIconAssetCache.image = null;
  windowIconAssetCache.resolved = true;
  return windowIconAssetCache;
}

function resolveWindowIconPath() {
  return resolveWindowIconAsset().path || undefined;
}

function resolveWindowIconImage() {
  return resolveWindowIconAsset().image || undefined;
}

function applyWindowIconToWindow(targetWindow) {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }
  const iconImage = resolveWindowIconImage();
  if (!iconImage) {
    return;
  }
  try {
    targetWindow.setIcon(iconImage);
  } catch (_error) {
    // Ignore unsupported/icon assignment failures.
  }
}

function resolveTrayIconAsset() {
  const iconImage = resolveWindowIconImage();
  if (iconImage && typeof iconImage.isEmpty === "function" && !iconImage.isEmpty()) {
    if (process.platform === "win32") {
      try {
        const resized = iconImage.resize({ width: 16, height: 16, quality: "best" });
        if (resized && typeof resized.isEmpty === "function" && !resized.isEmpty()) {
          return resized;
        }
      } catch (_error) {
        // Fall back to original image.
      }
    }
    return iconImage;
  }
  return resolveWindowIconPath() || process.execPath;
}

function showAndFocusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    try {
      createWindow();
    } catch (error) {
      appendStartupLog(`[SHOW_WINDOW_ERROR] ${formatStartupErrorForLog(error)}`);
    }
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

function requestLauncherRestart() {
  appQuitRequested = true;
  app.relaunch();
  app.quit();
}

function getTrayUpdateStatusLabel() {
  const message = String(autoUpdateState?.message || "").trim();
  if (message) {
    return message;
  }
  const status = String(autoUpdateState?.status || "").trim();
  if (!status) {
    return "Status desconhecido";
  }
  return `Status: ${status}`;
}

function buildTrayMenuTemplate() {
  const updateEnabled = Boolean(
    app.isPackaged && autoUpdateConfigSnapshot?.enabled && autoUpdateConfigSnapshot?.configured
  );
  const canDownload = updateEnabled && autoUpdateState.status === "available";
  const canInstall = updateEnabled && (autoUpdateState.updateDownloaded || autoUpdateState.status === "downloaded");

  return [
    {
      label: "Abrir WPlay",
      click: () => {
        showAndFocusMainWindow();
      }
    },
    { type: "separator" },
    {
      label: "Verificar atualizacao",
      enabled: updateEnabled,
      click: () => {
        void checkForLauncherUpdate("tray-manual");
      }
    },
    {
      label: "Baixar atualizacao",
      enabled: canDownload,
      click: () => {
        void downloadLauncherUpdate();
      }
    },
    {
      label: "Reiniciar para atualizar",
      enabled: canInstall,
      click: () => {
        try {
          restartAndInstallLauncherUpdate();
        } catch (error) {
          appendStartupLog(`[TRAY_UPDATE_RESTART_ERROR] ${formatStartupErrorForLog(error)}`);
        }
      }
    },
    { type: "separator" },
    {
      label: getTrayUpdateStatusLabel(),
      enabled: false
    },
    { type: "separator" },
    {
      label: "Reiniciar launcher",
      click: () => {
        requestLauncherRestart();
      }
    },
    {
      label: "Sair",
      click: () => {
        appQuitRequested = true;
        app.quit();
      }
    }
  ];
}

function refreshTrayContextMenu() {
  if (!tray || tray.isDestroyed()) {
    return;
  }
  try {
    tray.setToolTip(TRAY_TOOLTIP_TEXT);
    const menu = Menu.buildFromTemplate(buildTrayMenuTemplate());
    tray.setContextMenu(menu);
  } catch (error) {
    appendStartupLog(`[TRAY_MENU_ERROR] ${formatStartupErrorForLog(error)}`);
  }
}

function createTray() {
  if (tray && !tray.isDestroyed()) {
    refreshTrayContextMenu();
    return tray;
  }

  try {
    const trayIcon = resolveTrayIconAsset();
    tray = new Tray(trayIcon);
    tray.on("click", () => {
      showAndFocusMainWindow();
    });
    tray.on("double-click", () => {
      showAndFocusMainWindow();
    });
    refreshTrayContextMenu();
  } catch (error) {
    tray = null;
    appendStartupLog(`[TRAY_CREATE_ERROR] ${formatStartupErrorForLog(error)}`);
  }

  return tray;
}

function destroyTray() {
  if (!tray || tray.isDestroyed()) {
    tray = null;
    return;
  }
  try {
    tray.destroy();
  } catch (_error) {
    // Ignore tray destroy failures.
  } finally {
    tray = null;
  }
}

function ensureWindowsShortcutsWithIcon() {
  if (process.platform !== "win32" || !app.isPackaged) {
    return;
  }

  const safeGetPath = (pathName) => {
    try {
      const value = String(app.getPath(pathName) || "").trim();
      return value;
    } catch (error) {
      appendStartupLog(`[SHORTCUT_PATH_ERROR] path=${pathName} error=${formatStartupErrorForLog(error)}`);
      return "";
    }
  };

  const iconPath = resolveWindowIconPath() || process.execPath;
  const appDisplayName = String(app.getName() || "WPlay").trim() || "WPlay";
  const shortcutName = `${appDisplayName}.lnk`;
  const shortcutDetails = {
    target: process.execPath,
    cwd: path.dirname(process.execPath),
    description: `${appDisplayName} Launcher`,
    icon: iconPath,
    iconIndex: 0,
    appUserModelId: WINDOWS_APP_USER_MODEL_ID
  };

  const shortcutPaths = [];
  const desktopPath = safeGetPath("desktop");
  const startMenuPath = safeGetPath("startMenu");
  if (desktopPath) {
    shortcutPaths.push(path.join(desktopPath, shortcutName));
  }
  if (startMenuPath) {
    shortcutPaths.push(path.join(startMenuPath, "Programs", shortcutName));
  }

  if (shortcutPaths.length === 0) {
    appendStartupLog("[SHORTCUT] nenhum caminho valido de atalho disponivel; seguindo inicializacao.");
    return;
  }

  for (const shortcutPath of shortcutPaths) {
    try {
      fs.mkdirSync(path.dirname(shortcutPath), { recursive: true });
      const mode = fs.existsSync(shortcutPath) ? "update" : "create";
      shell.writeShortcutLink(shortcutPath, mode, shortcutDetails);
    } catch (_error) {
      // Ignore shortcut write failures (permissions/locked link).
    }
  }
}

function toPngDataUrlFromNativeImage(image) {
  if (!image || typeof image.isEmpty !== "function" || image.isEmpty()) {
    return "";
  }
  try {
    const pngBuffer = image.toPNG();
    if (!Buffer.isBuffer(pngBuffer) || pngBuffer.length === 0) {
      return "";
    }
    return `data:image/png;base64,${pngBuffer.toString("base64")}`;
  } catch (_error) {
    return "";
  }
}

function collectToastBrandCandidatePaths() {
  const candidates = [];
  const push = (value) => {
    const normalized = String(value || "").trim();
    if (normalized) {
      candidates.push(normalized);
    }
  };

  if (app.isPackaged && process.resourcesPath) {
    push(path.join(process.resourcesPath, "renderer", "assets", "logo.png"));
    push(path.join(process.resourcesPath, "renderer", "assets", "icon.ico"));
    push(path.join(process.resourcesPath, "build", "icon.png"));
    push(path.join(process.resourcesPath, "build", "icon.ico"));
    push(path.join(process.resourcesPath, "app.asar.unpacked", "renderer", "assets", "logo.png"));
    push(path.join(process.resourcesPath, "app.asar.unpacked", "renderer", "assets", "icon.ico"));
    push(path.join(process.resourcesPath, "app.asar.unpacked", "build", "icon.png"));
    push(path.join(process.resourcesPath, "app.asar.unpacked", "build", "icon.ico"));
  }

  push(path.join(__dirname, "renderer", "assets", "logo.png"));
  push(path.join(__dirname, "renderer", "assets", "icon.ico"));
  push(path.join(__dirname, "public", "assets", "logo.png"));
  push(path.join(__dirname, "public", "assets", "icon.ico"));
  push(path.join(__dirname, "build", "icon.png"));
  push(path.join(__dirname, "build", "icon.ico"));
  push(path.join(__dirname, "logo.png"));
  push(path.join(__dirname, "icon.ico"));

  const resolvedWindowIconPath = resolveWindowIconPath();
  if (resolvedWindowIconPath) {
    push(resolvedWindowIconPath);
  }

  return [...new Set(candidates)];
}

function resolveGameStartToastBrandDataUrl() {
  if (toastBrandDataUrlCache.resolved) {
    return toastBrandDataUrlCache.value;
  }

  const candidates = collectToastBrandCandidatePaths();
  for (const candidatePath of candidates) {
    const image = tryReadIconImageFromPath(candidatePath);
    const dataUrl = toPngDataUrlFromNativeImage(image);
    if (!dataUrl) {
      continue;
    }
    toastBrandDataUrlCache.value = dataUrl;
    toastBrandDataUrlCache.resolved = true;
    return dataUrl;
  }

  const fallbackDataUrl = toPngDataUrlFromNativeImage(resolveWindowIconImage());
  toastBrandDataUrlCache.value = fallbackDataUrl;
  toastBrandDataUrlCache.resolved = true;
  return fallbackDataUrl;
}

function resolveRendererEntryPath() {
  const candidates = [];
  const push = (value) => {
    const normalized = String(value || "").trim();
    if (normalized) {
      candidates.push(normalized);
    }
  };

  push(path.join(__dirname, "out", "index.html"));
  try {
    const appPath = app.getAppPath();
    push(path.join(appPath, "out", "index.html"));
  } catch (_error) {
    // Ignore app path failures.
  }
  if (process.resourcesPath) {
    push(path.join(process.resourcesPath, "app.asar", "out", "index.html"));
    push(path.join(process.resourcesPath, "out", "index.html"));
  }

  for (const candidate of [...new Set(candidates)]) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch (_error) {
      // Try next candidate.
    }
  }

  throw new Error(
    `Interface nao encontrada. Caminhos tentados: ${candidates.join(" | ")}. Rode \`npm run next:build\` e gere novo build.`
  );
}

function ensureYoutubeEmbedRequestHeaders() {
  if (youtubeRequestHeaderHookInstalled) {
    return;
  }

  const defaultSession = session?.defaultSession;
  if (!defaultSession) {
    return;
  }

  youtubeRequestHeaderHookInstalled = true;

  const youtubeUrlFilters = {
    urls: [
      "https://www.youtube.com/*",
      "https://youtube.com/*",
      "https://m.youtube.com/*",
      "https://www.youtube-nocookie.com/*",
      "https://youtube-nocookie.com/*",
      "https://*.ytimg.com/*",
      "https://*.googlevideo.com/*"
    ]
  };

  defaultSession.webRequest.onBeforeSendHeaders(youtubeUrlFilters, (details, callback) => {
    const nextHeaders = { ...(details?.requestHeaders || {}) };
    const headerKeys = Object.keys(nextHeaders);

    const getExistingHeaderKey = (targetKey) => {
      const normalizedTarget = String(targetKey || "").toLowerCase();
      return headerKeys.find((key) => String(key || "").toLowerCase() === normalizedTarget) || "";
    };

    const refererKey = getExistingHeaderKey("referer");
    if (!refererKey || !String(nextHeaders[refererKey] || "").trim()) {
      nextHeaders.Referer = YOUTUBE_EMBED_REFERER;
    }

    const urlValue = String(details?.url || "").toLowerCase();
    const looksLikeYoutubePlayerApiRequest =
      urlValue.includes("/youtubei/") ||
      urlValue.includes("/get_video_info") ||
      urlValue.includes("/api/stats/") ||
      urlValue.includes("videoplayback");

    if (looksLikeYoutubePlayerApiRequest) {
      const originKey = getExistingHeaderKey("origin");
      if (!originKey || !String(nextHeaders[originKey] || "").trim()) {
        nextHeaders.Origin = YOUTUBE_EMBED_ORIGIN;
      }
    }

    callback({ requestHeaders: nextHeaders });
  });
}

function resolveUpdateSplashEntryPath() {
  const entryPath = path.join(__dirname, "renderer", "update-splash.html");
  try {
    if (fs.existsSync(entryPath)) {
      return entryPath;
    }
  } catch (_error) {
    // Fall through to explicit error.
  }
  throw new Error("Tela de update nao encontrada. Arquivo esperado: renderer/update-splash.html");
}

function createUpdateSplashWindow() {
  if (updateSplashWindow && !updateSplashWindow.isDestroyed()) {
    return updateSplashWindow;
  }

  const windowIconAsset = resolveWindowIconAsset();
  allowUpdateSplashWindowClose = false;

  updateSplashWindow = new BrowserWindow({
    width: 420,
    height: 560,
    minWidth: 420,
    minHeight: 560,
    maxWidth: 420,
    maxHeight: 560,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    closable: false,
    fullscreenable: false,
    frame: false,
    autoHideMenuBar: true,
    title: "WPlay Games Updater",
    backgroundColor: "#09090A",
    icon: windowIconAsset.image || windowIconAsset.path || undefined,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  updateSplashWindow.loadFile(resolveUpdateSplashEntryPath());

  updateSplashWindow.on("close", (event) => {
    if (!allowUpdateSplashWindowClose) {
      event.preventDefault();
    }
  });

  updateSplashWindow.on("closed", () => {
    updateSplashWindow = null;
    allowUpdateSplashWindowClose = false;
  });

  updateSplashWindow.webContents.on("did-finish-load", () => {
    applyWindowIconToWindow(updateSplashWindow);
    sendAutoUpdateStateToWindow(updateSplashWindow);
  });

  return updateSplashWindow;
}

function destroyUpdateSplashWindow() {
  if (!updateSplashWindow || updateSplashWindow.isDestroyed()) {
    updateSplashWindow = null;
    allowUpdateSplashWindowClose = false;
    return;
  }

  allowUpdateSplashWindowClose = true;
  try {
    updateSplashWindow.close();
  } catch (_error) {
    // Best effort close.
  } finally {
    if (updateSplashWindow && !updateSplashWindow.isDestroyed()) {
      updateSplashWindow.destroy();
    }
    updateSplashWindow = null;
    allowUpdateSplashWindowClose = false;
  }
}

function isAutoUpdateStartupBlockingStatus(statusValue) {
  const normalizedStatus = String(statusValue || "")
    .trim()
    .toLowerCase();
  return normalizedStatus === "checking" || normalizedStatus === "downloading" || normalizedStatus === "installing";
}

function shouldUseStartupUpdateSplash() {
  if (!app.isPackaged) {
    return false;
  }
  if (!autoUpdateConfigSnapshot?.enabled || !autoUpdateConfigSnapshot?.configured) {
    return false;
  }
  return Boolean(autoUpdateConfigSnapshot?.updateOnLaunch);
}

async function waitForStartupUpdateBlockingStateToFinish(maxWaitMs = AUTO_UPDATE_SPLASH_MAX_WAIT_MS) {
  const timeoutMs = Math.max(0, Number(maxWaitMs) || 0);
  if (timeoutMs <= 0) {
    return true;
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (!isAutoUpdateStartupBlockingStatus(autoUpdateState.status)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, AUTO_UPDATE_SPLASH_POLL_INTERVAL_MS));
  }

  return !isAutoUpdateStartupBlockingStatus(autoUpdateState.status);
}

function createWindow() {
  const windowIconAsset = resolveWindowIconAsset();
  mainWindowLoadRetryCount = 0;
  mainWindow = new BrowserWindow({
    width: 1520,
    height: 940,
    minWidth: 980,
    minHeight: 680,
    frame: false,
    autoHideMenuBar: true,
    title: "WPlay Games",
    backgroundColor: "#080808",
    show: false,
    icon: windowIconAsset.image || windowIconAsset.path || undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  const rendererEntryPath = resolveRendererEntryPath();
  const retryRendererLoad = (reason) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return false;
    }
    if (mainWindowLoadRetryCount >= MAIN_WINDOW_MAX_LOAD_RETRIES) {
      appendStartupLog(
        `[WINDOW] retry esgotado (tentativas=${MAIN_WINDOW_MAX_LOAD_RETRIES}) motivo=${String(reason || "unknown")}.`
      );
      return false;
    }
    mainWindowLoadRetryCount += 1;
    const attempt = mainWindowLoadRetryCount;
    appendStartupLog(`[WINDOW] retry #${attempt} agendado. motivo=${String(reason || "unknown")}.`);
    setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        return;
      }
      try {
        void mainWindow.loadFile(rendererEntryPath).catch((error) => {
          appendStartupLog(`[WINDOW] retry #${attempt} falhou: ${formatStartupErrorForLog(error)}`);
          retryRendererLoad("retry-load-rejection");
        });
      } catch (error) {
        appendStartupLog(`[WINDOW] retry #${attempt} erro: ${formatStartupErrorForLog(error)}`);
        retryRendererLoad("retry-load-throw");
      }
    }, MAIN_WINDOW_LOAD_RETRY_DELAY_MS);
    return true;
  };

  mainWindow.on("close", (event) => {
    if (appQuitRequested) {
      return;
    }
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on("closed", () => {
    clearStartupBootWatchdog();
    mainWindow = null;
  });

  appendStartupLog(`[WINDOW] carregando renderer: ${rendererEntryPath}`);
  armStartupBootWatchdog();
  void mainWindow.loadFile(rendererEntryPath).catch((error) => {
    appendStartupLog(`[WINDOW] loadFile rejection: ${formatStartupErrorForLog(error)}`);
    retryRendererLoad("loadfile-rejection");
  });

  const sendMaximizedState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send("launcher:window-maximized", mainWindow.isMaximized());
  };

  mainWindow.on("maximize", sendMaximizedState);
  mainWindow.on("unmaximize", sendMaximizedState);
  mainWindow.on("focus", () => {
    if (!runtimeStartupHealthState.safeMode) {
      void checkForLauncherUpdate("focus");
    }
  });
  mainWindow.on("blur", () => {
    void pollBackgroundFriendGameActivities(true);
  });
  mainWindow.on("minimize", () => {
    setTimeout(() => {
      void pollBackgroundFriendGameActivities(true);
    }, 120);
  });
  mainWindow.on("hide", () => {
    void pollBackgroundFriendGameActivities(true);
  });
  mainWindow.webContents.on("did-attach-webview", (_event, guestWebContents) => {
    if (!guestWebContents) return;

    guestWebContents.setWindowOpenHandler(({ url }) => {
      if (String(url || "").trim()) {
        void shell.openExternal(String(url));
      }
      return { action: "deny" };
    });

    guestWebContents.on("will-navigate", (event, targetUrl) => {
      const value = String(targetUrl || "").trim();
      if (!value) return;

      if (isAllowedYoutubeWebviewNavigation(value)) {
        return;
      }

      event.preventDefault();
      void shell.openExternal(value);
    });
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) {
      return;
    }
    appendStartupLog(
      `[WINDOW] did-fail-load code=${errorCode} description=${String(errorDescription || "")} url=${String(validatedURL || "")}`
    );
    retryRendererLoad(`did-fail-load:${errorCode}`);
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    const reason = String(details?.reason || "unknown");
    const exitCode = Number(details?.exitCode || 0);
    appendStartupLog(`[WINDOW] render-process-gone reason=${reason} exitCode=${exitCode}`);
    if (reason === "crashed" || reason === "oom") {
      retryRendererLoad(`render-process-gone:${reason}`);
    }
  });
  mainWindow.on("unresponsive", () => {
    appendStartupLog("[WINDOW] janela principal sem resposta.");
  });
  mainWindow.webContents.on("did-finish-load", () => {
    clearStartupBootWatchdog();
    markStartupLaunchHealthy("did-finish-load");
    mainWindowLoadRetryCount = 0;
    applyWindowIconToWindow(mainWindow);
    createTray();
    appendStartupLog("[WINDOW] did-finish-load concluido.");
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
    destroyUpdateSplashWindow();
    sendMaximizedState();
    broadcastAutoUpdateState();
    setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        return;
      }
      const activeInstallSnapshot = getActiveInstallProgressSnapshot();
      for (const entry of activeInstallSnapshot.entries) {
        mainWindow.webContents.send(INSTALL_PROGRESS_CHANNEL, entry);
      }
    }, 420);
    if (autoUpdateConfigSnapshot?.enabled && autoUpdateConfigSnapshot?.configured && !runtimeStartupHealthState.safeMode) {
      setTimeout(() => {
        void checkForLauncherUpdate("window-ready");
      }, AUTO_UPDATE_WINDOW_READY_CHECK_DELAY_MS);
    }
  });
}

function escapeHtmlText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeToastText(value, fallback = "", maxLength = 64) {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  const nextValue = normalized || String(fallback || "").trim();
  if (!nextValue) {
    return "";
  }
  if (nextValue.length <= maxLength) {
    return nextValue;
  }
  return `${nextValue.slice(0, Math.max(1, maxLength - 1)).trim()}...`;
}

function sanitizeHttpUrlForToast(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }
    return parsed.toString();
  } catch (_error) {
    return "";
  }
}

function computeToastInitials(name) {
  const parts = String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  return parts || "JG";
}

function buildGameStartToastDedupeKey(payload = {}) {
  const explicitKey = String(payload.activityId || payload.eventId || payload.dedupeKey || "")
    .trim()
    .toLowerCase();
  return explicitKey;
}

function shouldSuppressDuplicatedGameStartToast(payload = {}) {
  const dedupeKey = buildGameStartToastDedupeKey(payload);
  if (!dedupeKey) {
    return false;
  }

  const now = Date.now();
  for (const [key, seenAt] of gameStartToastDedupeCache.entries()) {
    if (now - Number(seenAt || 0) > GAME_START_TOAST_DEDUPE_WINDOW_MS * 4) {
      gameStartToastDedupeCache.delete(key);
    }
  }

  const lastSeenAt = Number(gameStartToastDedupeCache.get(dedupeKey) || 0);
  gameStartToastDedupeCache.set(dedupeKey, now);
  if (lastSeenAt > 0 && now - lastSeenAt < GAME_START_TOAST_DEDUPE_WINDOW_MS) {
    return true;
  }
  return false;
}

function buildGameStartToastHtml(payload = {}) {
  const nickname = sanitizeToastText(payload.nickname, "Jogador", 42);
  const gameName = sanitizeToastText(payload.gameName, "Jogo", 56);
  const avatarUrl = sanitizeHttpUrlForToast(payload.avatarUrl);
  const initials = computeToastInitials(nickname);
  const toastBrandDataUrl = resolveGameStartToastBrandDataUrl();

  const safeNickname = escapeHtmlText(nickname);
  const safeGameName = escapeHtmlText(gameName);
  const safeInitials = escapeHtmlText(initials);
  const safeBrandDataUrl = escapeHtmlText(toastBrandDataUrl || "");
  const safeAvatarTag = avatarUrl
    ? `<img src="${escapeHtmlText(avatarUrl)}" alt="" loading="lazy" />`
    : `<span class="avatar-fallback">${safeInitials}</span>`;
  const brandMarkup = safeBrandDataUrl ? `<span class="brand-mark" aria-hidden="true"></span>` : "";

  const hideDelayMs = Math.max(900, GAME_START_TOAST_LIFETIME_MS - GAME_START_TOAST_EXIT_MS);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';"
    />
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        background: ${GAME_START_TOAST_BG_COLOR};
        overflow: hidden;
      }
      body {
        font-family: "Sora", "Segoe UI", "Inter", system-ui, sans-serif;
      }
      .toast {
        position: relative;
        width: 100%;
        height: 100%;
        margin: 0;
        border: 0;
        display: grid;
        grid-template-columns: 70px minmax(0, 1fr);
        align-items: center;
        gap: 7px;
        padding: 6px 9px 6px 6px;
        box-sizing: border-box;
        background: ${GAME_START_TOAST_BG_COLOR};
        transform: translate3d(0, -16px, 0);
        opacity: 0;
        animation: in 210ms cubic-bezier(0.22, 0.78, 0.3, 1) forwards;
        overflow: hidden;
      }
      .brand-mark {
        position: absolute;
        right: -54px;
        top: 50%;
        width: 210px;
        height: 256px;
        transform: translateY(-50%);
        background-image: url("${safeBrandDataUrl}");
        background-repeat: no-repeat;
        background-position: center;
        background-size: auto 100%;
        opacity: 0.12;
        filter: grayscale(1) brightness(0.38) contrast(1.15);
        pointer-events: none;
      }
      .toast.is-leaving {
        animation: out ${GAME_START_TOAST_EXIT_MS}ms ease forwards;
      }
      .avatar {
        width: 56px;
        height: 56px;
        border-radius: 0;
        overflow: hidden;
        border: 0;
        background: #171720;
        display: grid;
        place-items: center;
        z-index: 1;
      }
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .avatar-fallback {
        color: #626571;
        font-size: 0.78rem;
        font-weight: 400;
        letter-spacing: 0.02em;
      }
      .body {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
        z-index: 1;
      }
      .title {
        margin: 0;
        font-size: 14px;
        line-height: 1.05;
        color: ${GAME_START_TOAST_ACCENT_COLOR};
        font-weight: 400;
        letter-spacing: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .subtitle {
        margin: 0;
        font-size: 12px;
        line-height: 1.1;
        color: #b5b8c0;
        font-weight: 400;
        letter-spacing: 0;
      }
      .game {
        margin: 0;
        font-size: 14px;
        line-height: 1.06;
        color: ${GAME_START_TOAST_ACCENT_COLOR};
        font-weight: 400;
        letter-spacing: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      @keyframes in {
        from { transform: translate3d(0, -16px, 0); opacity: 0; }
        to { transform: translate3d(0, 0, 0); opacity: 1; }
      }
      @keyframes out {
        from { transform: translate3d(0, 0, 0); opacity: 1; }
        to { transform: translate3d(0, -12px, 0); opacity: 0; }
      }
    </style>
  </head>
  <body>
    <article class="toast" id="toast">
      ${brandMarkup}
      <span class="avatar">${safeAvatarTag}</span>
      <div class="body">
        <strong class="title">${safeNickname}</strong>
        <span class="subtitle">iniciou</span>
        <span class="game">${safeGameName}</span>
      </div>
    </article>
    <script>
      const toastEl = document.getElementById("toast");
      setTimeout(() => {
        if (toastEl) {
          toastEl.classList.add("is-leaving");
        }
      }, ${hideDelayMs});
      setTimeout(() => {
        window.close();
      }, ${GAME_START_TOAST_LIFETIME_MS});
    </script>
  </body>
</html>`;
}

function getGameStartToastWorkArea() {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const currentDisplay = screen.getDisplayMatching(mainWindow.getBounds());
      if (currentDisplay?.workArea) {
        return currentDisplay.workArea;
      }
    }
  } catch (_error) {
    // Fallback below.
  }

  try {
    const cursorPoint = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
    if (currentDisplay?.workArea) {
      return currentDisplay.workArea;
    }
  } catch (_error) {
    // Fallback below.
  }

  const primary = screen.getPrimaryDisplay();
  return primary?.workArea || { x: 0, y: 0, width: 1920, height: 1080 };
}

function reflowGameStartToastWindows() {
  for (let index = gameStartToastWindows.length - 1; index >= 0; index -= 1) {
    const entry = gameStartToastWindows[index];
    if (!entry?.window || entry.window.isDestroyed()) {
      gameStartToastWindows.splice(index, 1);
    }
  }

  const area = getGameStartToastWorkArea();
  for (let index = 0; index < gameStartToastWindows.length; index += 1) {
    const entry = gameStartToastWindows[index];
    const toastWindow = entry.window;
    if (!toastWindow || toastWindow.isDestroyed()) {
      continue;
    }
    const x = Math.round(area.x + area.width - GAME_START_TOAST_WIDTH - GAME_START_TOAST_MARGIN_RIGHT);
    const y = Math.round(area.y + GAME_START_TOAST_MARGIN_TOP + index * (GAME_START_TOAST_HEIGHT + GAME_START_TOAST_STACK_GAP));
    try {
      toastWindow.setBounds(
        {
          x,
          y,
          width: GAME_START_TOAST_WIDTH,
          height: GAME_START_TOAST_HEIGHT
        },
        false
      );
    } catch (_error) {
      // Ignore if window is closing.
    }
  }
}

async function showGameStartedDesktopToast(payload = {}) {
  const safePayload = payload && typeof payload === "object" ? { ...payload } : {};
  if (shouldSuppressDuplicatedGameStartToast(safePayload)) {
    return { ok: true, deduped: true };
  }

  const html = buildGameStartToastHtml(safePayload);
  const toastWindow = new BrowserWindow({
    width: GAME_START_TOAST_WIDTH,
    height: GAME_START_TOAST_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    thickFrame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    hasShadow: false,
    roundedCorners: false,
    backgroundColor: "#00000000",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  try {
    toastWindow.setAlwaysOnTop(true, "screen-saver");
  } catch (_error) {
    // Ignore unsupported level.
  }

  try {
    toastWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch (_error) {
    // Ignore unsupported option.
  }

  try {
    toastWindow.setIgnoreMouseEvents(true);
  } catch (_error) {
    // Ignore platform limitations.
  }

  const entry = {
    window: toastWindow,
    closeTimer: null
  };
  gameStartToastWindows.unshift(entry);
  while (gameStartToastWindows.length > GAME_START_TOAST_MAX_WINDOWS) {
    const overflowEntry = gameStartToastWindows.pop();
    const overflowWindow = overflowEntry?.window;
    if (overflowWindow && !overflowWindow.isDestroyed()) {
      try {
        overflowWindow.close();
      } catch (_error) {
        // Ignore close races.
      }
    }
  }
  reflowGameStartToastWindows();

  toastWindow.on("closed", () => {
    if (entry.closeTimer) {
      clearTimeout(entry.closeTimer);
      entry.closeTimer = null;
    }
    const index = gameStartToastWindows.indexOf(entry);
    if (index >= 0) {
      gameStartToastWindows.splice(index, 1);
    }
    reflowGameStartToastWindows();
  });

  entry.closeTimer = setTimeout(() => {
    if (!toastWindow.isDestroyed()) {
      try {
        toastWindow.close();
      } catch (_error) {
        // Ignore close races.
      }
    }
  }, GAME_START_TOAST_LIFETIME_MS + 120);

  toastWindow.once("ready-to-show", () => {
    reflowGameStartToastWindows();
    try {
      toastWindow.showInactive();
    } catch (_error) {
      toastWindow.show();
    }
  });

  await toastWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
  return { ok: true };
}

function getCatalogPath() {
  return path.join(app.getAppPath(), "config", "games.json");
}

function getRuntimeConfigPath() {
  return path.join(app.getPath("userData"), RUNTIME_CONFIG_FILE_NAME);
}

function getBundledAuthConfigPath() {
  return path.join(app.getAppPath(), "config", AUTH_CONFIG_FILE_NAME);
}

function getBundledAuthConfigExamplePath() {
  return path.join(app.getAppPath(), "config", AUTH_CONFIG_EXAMPLE_FILE_NAME);
}

function getUserAuthConfigPath() {
  return path.join(app.getPath("userData"), "config", AUTH_CONFIG_FILE_NAME);
}

function getUpdaterConfigPath() {
  return path.join(app.getAppPath(), "config", UPDATER_CONFIG_FILE_NAME);
}

function getBundledUpdaterConfigPath() {
  return path.join(app.getAppPath(), "config", UPDATER_CONFIG_FILE_NAME);
}

function getBundledUpdaterConfigExamplePath() {
  return path.join(app.getAppPath(), "config", UPDATER_CONFIG_EXAMPLE_FILE_NAME);
}

function getUserUpdaterConfigPath() {
  return path.join(app.getPath("userData"), "config", UPDATER_CONFIG_FILE_NAME);
}

function readRuntimeConfigSync() {
  try {
    const raw = fs.readFileSync(getRuntimeConfigPath(), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return {};
  } catch (_error) {
    return {};
  }
}

async function ensurePersistedAuthConfigFile() {
  const userAuthConfigPath = getUserAuthConfigPath();
  const readCandidate = async (filePath) => {
    try {
      if (!(await pathExists(filePath))) {
        return null;
      }
      const raw = await fsp.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
      return null;
    } catch (_error) {
      return null;
    }
  };
  const isConfigured = (config) => {
    if (!config || typeof config !== "object") {
      return false;
    }
    const url = normalizeSupabaseUrl(sanitizeAuthConfigValue(config.supabaseUrl));
    const anonKey = sanitizeAuthConfigValue(config.supabaseAnonKey);
    const steamWebApiKey = normalizeSteamWebApiKey(config.steamWebApiKey || config.steam_api_key);
    return Boolean((url && anonKey) || steamWebApiKey);
  };
  const getNormalizedFields = (config) => {
    if (!config || typeof config !== "object") {
      return {
        supabaseUrl: "",
        supabaseAnonKey: "",
        redirectUrl: "",
        steamWebApiKey: ""
      };
    }
    return {
      supabaseUrl: normalizeSupabaseUrl(sanitizeAuthConfigValue(config.supabaseUrl)),
      supabaseAnonKey: sanitizeAuthConfigValue(config.supabaseAnonKey),
      redirectUrl: normalizeAuthRedirectUrl(sanitizeAuthConfigValue(config.redirectUrl)),
      steamWebApiKey: normalizeSteamWebApiKey(config.steamWebApiKey || config.steam_api_key)
    };
  };
  const mergeMissingAuthFields = (targetConfig, sourceConfig) => {
    if (!targetConfig || typeof targetConfig !== "object" || !sourceConfig || typeof sourceConfig !== "object") {
      return false;
    }

    const targetFields = getNormalizedFields(targetConfig);
    const sourceFields = getNormalizedFields(sourceConfig);
    let changed = false;

    if (!targetFields.supabaseUrl && sourceFields.supabaseUrl) {
      targetConfig.supabaseUrl = sourceFields.supabaseUrl;
      changed = true;
    }
    if (!targetFields.supabaseAnonKey && sourceFields.supabaseAnonKey) {
      targetConfig.supabaseAnonKey = sourceFields.supabaseAnonKey;
      changed = true;
    }
    if (!targetFields.redirectUrl && sourceFields.redirectUrl) {
      targetConfig.redirectUrl = sourceFields.redirectUrl;
      changed = true;
    }
    if (!targetFields.steamWebApiKey && sourceFields.steamWebApiKey) {
      targetConfig.steamWebApiKey = sourceFields.steamWebApiKey;
      changed = true;
    }

    return changed;
  };

  await fsp.mkdir(path.dirname(userAuthConfigPath), { recursive: true });
  const candidateSources = [getBundledAuthConfigPath(), getBundledAuthConfigExamplePath()];

  const existingUserConfig = await readCandidate(userAuthConfigPath);
  if (existingUserConfig && typeof existingUserConfig === "object") {
    const mergedUserConfig = { ...existingUserConfig };
    let changed = false;
    for (const sourcePath of candidateSources) {
      if (!(await pathExists(sourcePath))) {
        continue;
      }
      const sourceConfig = await readCandidate(sourcePath);
      if (!sourceConfig) {
        continue;
      }
      changed = mergeMissingAuthFields(mergedUserConfig, sourceConfig) || changed;
    }

    if (changed) {
      await fsp.writeFile(userAuthConfigPath, JSON.stringify(mergedUserConfig, null, 2), "utf8");
    }

    if (isConfigured(mergedUserConfig)) {
      return userAuthConfigPath;
    }
  }

  let fallbackSourcePath = "";
  for (const sourcePath of candidateSources) {
    if (!(await pathExists(sourcePath))) {
      continue;
    }
    if (!fallbackSourcePath) {
      fallbackSourcePath = sourcePath;
    }
    const sourceConfig = await readCandidate(sourcePath);
    if (!isConfigured(sourceConfig)) {
      continue;
    }
    try {
      await fsp.copyFile(sourcePath, userAuthConfigPath);
      return userAuthConfigPath;
    } catch (_error) {
      // Try next source.
    }
  }

  if (!existingUserConfig && fallbackSourcePath) {
    await fsp.copyFile(fallbackSourcePath, userAuthConfigPath).catch(() => {});
  }

  return userAuthConfigPath;
}

async function ensurePersistedUpdaterConfigFile() {
  const userUpdaterConfigPath = getUserUpdaterConfigPath();
  const readCandidate = async (filePath) => {
    try {
      if (!(await pathExists(filePath))) {
        return null;
      }
      const raw = await fsp.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
      return null;
    } catch (_error) {
      return null;
    }
  };
  const isConfigured = (config) => {
    if (!config || typeof config !== "object") {
      return false;
    }
    const owner = normalizeUpdaterOwnerOrRepo(config.owner);
    const repo = normalizeUpdaterOwnerOrRepo(config.repo);
    return Boolean(owner && repo);
  };

  const existingUserConfig = await readCandidate(userUpdaterConfigPath);
  if (isConfigured(existingUserConfig)) {
    return userUpdaterConfigPath;
  }

  await fsp.mkdir(path.dirname(userUpdaterConfigPath), { recursive: true });
  const candidateSources = [getBundledUpdaterConfigPath(), getBundledUpdaterConfigExamplePath()];
  let fallbackSourcePath = "";
  for (const sourcePath of candidateSources) {
    if (!(await pathExists(sourcePath))) {
      continue;
    }
    if (!fallbackSourcePath) {
      fallbackSourcePath = sourcePath;
    }
    const sourceConfig = await readCandidate(sourcePath);
    if (!isConfigured(sourceConfig)) {
      continue;
    }
    try {
      await fsp.copyFile(sourcePath, userUpdaterConfigPath);
      return userUpdaterConfigPath;
    } catch (_error) {
      // Try next source.
    }
  }

  if (!existingUserConfig && fallbackSourcePath) {
    await fsp.copyFile(fallbackSourcePath, userUpdaterConfigPath).catch(() => {});
  }

  return userUpdaterConfigPath;
}

async function writeRuntimeConfig(nextConfig) {
  const current = readRuntimeConfigSync();
  const merged = {
    ...current,
    ...nextConfig
  };
  await fsp.mkdir(path.dirname(getRuntimeConfigPath()), { recursive: true });
  await fsp.writeFile(getRuntimeConfigPath(), JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

function readAuthConfigFileSync() {
  const candidatePaths = [getUserAuthConfigPath(), getBundledAuthConfigPath(), getBundledAuthConfigExamplePath()];
  const parsedCandidates = [];
  for (const candidatePath of candidatePaths) {
    try {
      if (!fs.existsSync(candidatePath)) {
        continue;
      }
      const raw = fs.readFileSync(candidatePath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        parsedCandidates.push(parsed);
      }
    } catch (_error) {
      // Try next source.
    }
  }
  if (parsedCandidates.length === 0) {
    return {};
  }

  const merged = {};
  for (const parsedCandidate of parsedCandidates) {
    const source = parsedCandidate && typeof parsedCandidate === "object" ? parsedCandidate : {};
    const supabaseUrl = normalizeSupabaseUrl(sanitizeAuthConfigValue(source.supabaseUrl));
    const supabaseAnonKey = sanitizeAuthConfigValue(source.supabaseAnonKey);
    const redirectUrl = normalizeAuthRedirectUrl(sanitizeAuthConfigValue(source.redirectUrl));
    const steamWebApiKey = normalizeSteamWebApiKey(source.steamWebApiKey || source.steam_api_key);

    if (!sanitizeAuthConfigValue(merged.supabaseUrl) && supabaseUrl) {
      merged.supabaseUrl = supabaseUrl;
    }
    if (!sanitizeAuthConfigValue(merged.supabaseAnonKey) && supabaseAnonKey) {
      merged.supabaseAnonKey = supabaseAnonKey;
    }
    if (!sanitizeAuthConfigValue(merged.redirectUrl) && redirectUrl) {
      merged.redirectUrl = redirectUrl;
    }
    if (!normalizeSteamWebApiKey(merged.steamWebApiKey || merged.steam_api_key) && steamWebApiKey) {
      merged.steamWebApiKey = steamWebApiKey;
    }
  }

  return merged;
}

function normalizeSupabaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return "";
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch (_error) {
    return "";
  }
}

function sanitizeAuthConfigValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  const compact = upper.replace(/[\s"'`]/g, "");
  const looksLikePlainPlaceholder = /^(SEU|SUA)[A-Z0-9_-]{0,64}$/.test(compact);
  const containsTemplateToken =
    upper.includes("SEU-PROJETO") ||
    upper.includes("SUA_SUPABASE_ANON_KEY") ||
    upper.includes("SUPABASE_ANON_KEY") ||
    upper.includes("SUA_STEAM_WEB_API_KEY") ||
    upper.includes("STEAM_WEB_API_KEY");
  if (looksLikePlainPlaceholder || containsTemplateToken) {
    return "";
  }
  return raw;
}

function normalizeSteamWebApiKey(value) {
  return sanitizeAuthConfigValue(value);
}

function normalizeAuthRedirectUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return AUTH_CALLBACK_URL_DEFAULT;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol.toLowerCase() !== `${AUTH_PROTOCOL_SCHEME}:`) {
      return AUTH_CALLBACK_URL_DEFAULT;
    }
    return parsed.toString();
  } catch (_error) {
    return AUTH_CALLBACK_URL_DEFAULT;
  }
}

function resolveAuthConfig() {
  const fileConfig = readAuthConfigFileSync();
  const supabaseUrl = normalizeSupabaseUrl(
    sanitizeAuthConfigValue(process.env.WPLAY_SUPABASE_URL || fileConfig.supabaseUrl)
  );
  const supabaseAnonKey = sanitizeAuthConfigValue(
    String(process.env.WPLAY_SUPABASE_ANON_KEY || fileConfig.supabaseAnonKey || "")
  );
  const redirectUrl = normalizeAuthRedirectUrl(
    sanitizeAuthConfigValue(process.env.WPLAY_AUTH_REDIRECT_URL || fileConfig.redirectUrl)
  );
  const steamWebApiKey = normalizeSteamWebApiKey(
    process.env.WPLAY_STEAM_WEB_API_KEY || fileConfig.steamWebApiKey || fileConfig.steam_api_key
  );

  return {
    supabaseUrl,
    supabaseAnonKey,
    redirectUrl,
    steamWebApiKey
  };
}

function assertSteamAuthConfig(authConfig) {
  if (!authConfig.steamWebApiKey) {
    throw new Error(
      "[AUTH_NOT_CONFIGURED] Steam nao configurado. Preencha config/auth.json com steamWebApiKey (Steam Web API Key)."
    );
  }
}

function normalizeSteamId(value) {
  const raw = String(value || "").trim();
  if (!/^\d{17}$/.test(raw)) {
    return "";
  }
  return raw;
}

function createAuthStateToken() {
  return crypto.randomBytes(18).toString("hex");
}

function isHttpProtocolUrl(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    const protocol = parsed.protocol.toLowerCase();
    return protocol === "http:" || protocol === "https:";
  } catch (_error) {
    return false;
  }
}

function buildSteamLocalCallbackHtml(success, message) {
  const safeMessage = String(message || "").replace(/[<>]/g, "");
  const title = success ? "Login Steam concluido" : "Falha no login Steam";
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { margin: 0; font-family: Segoe UI, Arial, sans-serif; background: #0b0b0c; color: #f0f0f0; }
    main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .card { max-width: 520px; background: #151517; border-radius: 14px; padding: 20px 18px; line-height: 1.5; }
    h1 { margin: 0 0 8px; font-size: 18px; }
    p { margin: 0; color: #d3d3d8; }
  </style>
</head>
<body>
  <main>
    <div class="card">
      <h1>${title}</h1>
      <p>${safeMessage}</p>
    </div>
  </main>
  <script>
    setTimeout(function () { try { window.close(); } catch (_e) {} }, 1200);
  </script>
</body>
</html>`;
}

async function createSteamLocalCallbackChannel() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    let closed = false;

    const close = () => {
      if (closed) {
        return;
      }
      closed = true;
      try {
        server.close();
      } catch (_error) {
        // Ignore close errors.
      }
    };

    server.on("request", (req, res) => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const baseUrl = `http://${AUTH_STEAM_LOCAL_CALLBACK_HOST}:${port}`;
      let parsed;
      try {
        parsed = new URL(String(req.url || "/"), baseUrl);
      } catch (_error) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(buildSteamLocalCallbackHtml(false, "Resposta invalida recebida da autenticacao Steam."));
        return;
      }

      if (parsed.pathname !== AUTH_STEAM_LOCAL_CALLBACK_PATH) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Not found");
        return;
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(buildSteamLocalCallbackHtml(true, "Autenticacao recebida. Voce ja pode voltar ao launcher."));

      setTimeout(() => close(), 1000);
      setTimeout(() => {
        void handleAuthDeepLink(parsed.toString());
      }, 0);
    });

    server.once("error", (error) => {
      close();
      reject(
        new Error(
          `[AUTH_CALLBACK_SERVER] Nao foi possivel abrir callback local Steam: ${error?.message || "erro desconhecido"}`
        )
      );
    });

    server.listen(0, AUTH_STEAM_LOCAL_CALLBACK_HOST, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        close();
        reject(new Error("[AUTH_CALLBACK_SERVER] Porta local invalida para callback Steam."));
        return;
      }

      resolve({
        redirectUrl: `http://${AUTH_STEAM_LOCAL_CALLBACK_HOST}:${address.port}${AUTH_STEAM_LOCAL_CALLBACK_PATH}`,
        cleanup: close
      });
    });
  });
}

async function resolveSteamCallbackChannel(authConfig) {
  if (isHttpProtocolUrl(authConfig?.redirectUrl)) {
    return {
      redirectUrl: String(authConfig.redirectUrl),
      cleanup: null
    };
  }
  return createSteamLocalCallbackChannel();
}

function normalizeSteamPersonaName(value, fallback = "Steam User") {
  const name = String(value || "").trim();
  return name || fallback;
}

function normalizeSteamAvatarUrl(player = {}) {
  return String(player.avatarfull || player.avatarmedium || player.avatar || "").trim();
}

function buildStoredSteamSession(player = {}) {
  const steamId = normalizeSteamId(player.steamid || player.steamId || player.id);
  if (!steamId) {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const displayName = normalizeSteamPersonaName(player.personaname || player.displayName, "Steam User");
  const avatarUrl = normalizeSteamAvatarUrl(player);

  return {
    provider: "steam",
    steamId,
    accessToken: `steam:${steamId}`,
    refreshToken: "",
    tokenType: "steam",
    expiresAt: nowSeconds + AUTH_STEAM_SESSION_TTL_SECONDS,
    issuedAt: nowSeconds,
    user: {
      id: steamId,
      email: "",
      displayName,
      avatarUrl,
      provider: "steam"
    }
  };
}

function buildSteamOpenIdAuthorizeUrl(authConfig, stateToken) {
  const state = String(stateToken || "").trim();
  if (!state) {
    throw new Error("[AUTH_STATE] Nao foi possivel gerar token de autenticacao.");
  }

  const returnTo = new URL(authConfig.redirectUrl);
  returnTo.searchParams.set("provider", "steam");
  returnTo.searchParams.set("state", state);

  const realm = `${returnTo.protocol}//${returnTo.host}`;
  const url = new URL(STEAM_OPENID_URL);
  url.searchParams.set("openid.ns", "http://specs.openid.net/auth/2.0");
  url.searchParams.set("openid.mode", "checkid_setup");
  url.searchParams.set("openid.return_to", returnTo.toString());
  url.searchParams.set("openid.realm", realm);
  url.searchParams.set("openid.identity", "http://specs.openid.net/auth/2.0/identifier_select");
  url.searchParams.set("openid.claimed_id", "http://specs.openid.net/auth/2.0/identifier_select");
  return url.toString();
}

function parseSteamAuthCallbackPayload(rawUrl, authConfig, expectedRedirectUrl = "") {
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch (_error) {
    return null;
  }

  let expectedRedirect;
  try {
    expectedRedirect = new URL(String(expectedRedirectUrl || authConfig.redirectUrl || ""));
  } catch (_error) {
    return null;
  }

  const sameTarget =
    parsedUrl.protocol.toLowerCase() === expectedRedirect.protocol.toLowerCase() &&
    parsedUrl.host.toLowerCase() === expectedRedirect.host.toLowerCase() &&
    parsedUrl.pathname === expectedRedirect.pathname;

  if (!sameTarget) {
    return null;
  }

  const search = new URLSearchParams(parsedUrl.search || "");
  const provider = String(search.get("provider") || "").trim().toLowerCase();
  if (provider && provider !== "steam") {
    return null;
  }

  const payload = {
    provider: "steam",
    state: String(search.get("state") || "").trim(),
    openidMode: String(search.get("openid.mode") || "").trim(),
    openidClaimedId: String(search.get("openid.claimed_id") || "").trim(),
    openidIdentity: String(search.get("openid.identity") || "").trim(),
    rawQuery: search
  };

  return payload;
}

function extractSteamIdFromClaimedId(claimedId) {
  const value = String(claimedId || "").trim();
  if (!value) return "";
  const match = value.match(/steamcommunity\.com\/openid\/id\/(\d{17})/i);
  return normalizeSteamId(match?.[1] || "");
}

async function verifySteamOpenIdResponse(searchParams) {
  const source = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams || "");
  const payload = new URLSearchParams();

  for (const [key, value] of source.entries()) {
    if (!String(key || "").toLowerCase().startsWith("openid.")) {
      continue;
    }
    payload.set(key, value);
  }

  payload.set("openid.mode", "check_authentication");

  const response = await axios.post(STEAM_OPENID_URL, payload.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    timeout: 20_000,
    validateStatus: (status) => status >= 200 && status < 500
  });

  if (response.status >= 400) {
    return false;
  }

  const body = String(response.data || "");
  return /is_valid\s*:\s*true/i.test(body);
}

async function fetchSteamPlayerSummary(steamId, steamWebApiKey) {
  const normalizedSteamId = normalizeSteamId(steamId);
  const apiKey = normalizeSteamWebApiKey(steamWebApiKey);
  if (!normalizedSteamId || !apiKey) {
    return null;
  }

  const endpoint = `${STEAM_API_BASE_URL}/ISteamUser/GetPlayerSummaries/v0002/`;
  const response = await axios.get(endpoint, {
    params: {
      key: apiKey,
      steamids: normalizedSteamId
    },
    timeout: 20_000,
    validateStatus: (status) => status >= 200 && status < 500
  });

  if (response.status >= 400) {
    return null;
  }

  const players = Array.isArray(response.data?.response?.players) ? response.data.response.players : [];
  const player = players.find((entry) => normalizeSteamId(entry?.steamid) === normalizedSteamId);
  return player || null;
}

function clearSteamUserDataCache() {
  steamUserDataCache.steamId = "";
  steamUserDataCache.profile = null;
  steamUserDataCache.profileFetchedAt = 0;
  steamUserDataCache.profileInFlight = null;
  steamUserDataCache.friendsSteamIds = new Set();
  steamUserDataCache.friendsFetchedAt = 0;
  steamUserDataCache.friendsInFlight = null;
  steamUserDataCache.ownedGamesByAppId = new Map();
  steamUserDataCache.ownedGamesFetchedAt = 0;
  steamUserDataCache.ownedGamesInFlight = null;
  steamUserDataCache.achievementsByAppId = new Map();
  steamUserDataCache.achievementsInFlight = new Map();
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.floor(parsed);
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return Boolean(fallback);
  }
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return Boolean(fallback);
}

function readUpdaterConfigFileSync() {
  const candidatePaths = [getUserUpdaterConfigPath(), getBundledUpdaterConfigPath(), getBundledUpdaterConfigExamplePath()];
  const parsedCandidates = [];

  for (const candidatePath of candidatePaths) {
    try {
      if (!fs.existsSync(candidatePath)) {
        continue;
      }
      const raw = fs.readFileSync(candidatePath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        parsedCandidates.push(parsed);
      }
    } catch (_error) {
      // Try next source.
    }
  }

  if (parsedCandidates.length === 0) {
    return {};
  }

  for (const parsedCandidate of parsedCandidates) {
    const owner = normalizeUpdaterOwnerOrRepo(parsedCandidate.owner);
    const repo = normalizeUpdaterOwnerOrRepo(parsedCandidate.repo);
    if (owner && repo) {
      return parsedCandidate;
    }
  }

  return parsedCandidates[0];
}

function normalizeUpdaterOwnerOrRepo(value) {
  return String(value || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9_.-]/g, "");
}

function normalizeUpdaterProvider(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["auto", "github", "generic"].includes(normalized)) {
    return normalized;
  }
  return "auto";
}

function resolveAutoUpdaterProvider(config) {
  if (!config || typeof config !== "object") {
    return "github";
  }
  if (config.provider === "github" || config.provider === "generic") {
    return config.provider;
  }
  if (config.privateRepo || config.allowPrerelease) {
    return "github";
  }
  // Default to GitHub provider to avoid stale generic CDN responses.
  return "github";
}

function resolveAutoUpdaterConfig() {
  const fileConfig = readUpdaterConfigFileSync();
  const enabled = parseBoolean(process.env.WPLAY_UPDATER_ENABLED ?? fileConfig.enabled, true);
  const owner = normalizeUpdaterOwnerOrRepo(process.env.WPLAY_UPDATER_OWNER || fileConfig.owner);
  const repo = normalizeUpdaterOwnerOrRepo(process.env.WPLAY_UPDATER_REPO || fileConfig.repo);
  const channel = String(process.env.WPLAY_UPDATER_CHANNEL || fileConfig.channel || "latest").trim() || "latest";
  const privateRepo = parseBoolean(process.env.WPLAY_UPDATER_PRIVATE ?? fileConfig.private, false);
  const token = String(process.env.WPLAY_UPDATER_TOKEN || fileConfig.token || "").trim();
  const provider = normalizeUpdaterProvider(process.env.WPLAY_UPDATER_PROVIDER || fileConfig.provider || "auto");
  const allowPrerelease = parseBoolean(process.env.WPLAY_UPDATER_ALLOW_PRERELEASE ?? fileConfig.allowPrerelease, false);
  const allowDowngrade = parseBoolean(process.env.WPLAY_UPDATER_ALLOW_DOWNGRADE ?? fileConfig.allowDowngrade, false);
  const preferLatestFullInstaller = parseBoolean(
    process.env.WPLAY_UPDATER_PREFER_FULL_INSTALLER ?? fileConfig.preferLatestFullInstaller,
    true
  );
  const autoDownload = parseBoolean(process.env.WPLAY_UPDATER_AUTO_DOWNLOAD ?? fileConfig.autoDownload, true);
  const updateOnLaunch = parseBoolean(process.env.WPLAY_UPDATER_ON_LAUNCH ?? fileConfig.updateOnLaunch, true);
  const autoRestartOnStartup = parseBoolean(
    process.env.WPLAY_UPDATER_AUTO_RESTART_ON_STARTUP ?? fileConfig.autoRestartOnStartup,
    true
  );
  const intervalMinutes = parsePositiveInteger(
    process.env.WPLAY_UPDATER_CHECK_INTERVAL_MINUTES ?? fileConfig.checkIntervalMinutes
  );
  const configured = Boolean(owner && repo);
  const checkIntervalMs = Math.max(
    AUTO_UPDATE_MIN_CHECK_INTERVAL_MS,
    (intervalMinutes > 0 ? intervalMinutes * 60_000 : AUTO_UPDATE_DEFAULT_CHECK_INTERVAL_MS)
  );

  return {
    enabled,
    configured,
    owner,
    repo,
    channel,
    privateRepo,
    token,
    provider,
    allowPrerelease,
    allowDowngrade,
    preferLatestFullInstaller,
    autoDownload,
    updateOnLaunch,
    autoRestartOnStartup,
    checkIntervalMs
  };
}

function getPublicAutoUpdateState() {
  return {
    ...autoUpdateState
  };
}

function sendAutoUpdateStateToWindow(targetWindow) {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }
  try {
    targetWindow.webContents.send(AUTO_UPDATE_STATE_CHANNEL, getPublicAutoUpdateState());
  } catch (_error) {
    // Ignore send failures for windows being destroyed.
  }
}

function broadcastAutoUpdateState() {
  sendAutoUpdateStateToWindow(mainWindow);
  sendAutoUpdateStateToWindow(updateSplashWindow);
}

function setAutoUpdateState(nextPatch, shouldBroadcast = true) {
  if (!nextPatch || typeof nextPatch !== "object") {
    return;
  }
  Object.assign(autoUpdateState, nextPatch);
  refreshTrayContextMenu();
  if (shouldBroadcast) {
    broadcastAutoUpdateState();
  }
}

function formatAutoUpdateError(error) {
  const raw = String(error?.message || error || "").replace(/\s+/g, " ").trim();
  if (!raw) {
    return "Falha ao verificar atualizacoes.";
  }
  const lower = raw.toLowerCase();
  const owner = String(autoUpdateConfigSnapshot?.owner || "").trim();
  const repo = String(autoUpdateConfigSnapshot?.repo || "").trim();
  const repoLabel = owner && repo ? `${owner}/${repo}` : "repo configurado";

  if (lower.includes("cannot find latest.yml") || (lower.includes("latest.yml") && lower.includes("404"))) {
    return (
      `[AUTO_UPDATE_FEED] O repo ${repoLabel} nao possui artefatos de update do launcher. ` +
      "Para auto update funcionar, publique release com latest.yml, .exe e .blockmap " +
      "(nao use repo de assets de jogo)."
    );
  }

  if (lower.includes("release not found") || lower.includes("404")) {
    return (
      `[AUTO_UPDATE_FEED] Release de update nao encontrada em ${repoLabel}. ` +
      "Publique uma release do launcher com latest.yml."
    );
  }

  if (
    (lower.includes("403") || lower.includes("429") || lower.includes("rate limit")) &&
    (lower.includes("github") || lower.includes("forbidden") || lower.includes("api"))
  ) {
    return "[AUTO_UPDATE_TEMP] GitHub limitou temporariamente as consultas de update. O launcher tentara novamente automaticamente.";
  }

  if (raw.length > 260) {
    return `${raw.slice(0, 257)}...`;
  }
  return raw;
}

function isAutoUpdateFeedFatalError(errorMessage) {
  const value = String(errorMessage || "").toLowerCase();
  if (!value) return false;
  return value.includes("[auto_update_feed]") || value.includes("latest.yml");
}

function isAutoUpdateTransientError(errorMessage) {
  const value = String(errorMessage || "").toLowerCase();
  if (!value) return false;
  return (
    value.includes("[auto_update_temp]") ||
    value.includes("temporariamente") ||
    value.includes("rate limit") ||
    value.includes("timed out") ||
    value.includes("etimedout") ||
    value.includes("econnreset") ||
    value.includes("econnrefused") ||
    value.includes("enotfound") ||
    value.includes("network") ||
    value.includes("socket hang up") ||
    value.includes("429") ||
    value.includes("503")
  );
}

function disableAutoUpdaterForSession(reasonMessage, errorMessage = "") {
  clearAutoUpdaterInterval();
  if (autoUpdateConfigSnapshot && typeof autoUpdateConfigSnapshot === "object") {
    autoUpdateConfigSnapshot = {
      ...autoUpdateConfigSnapshot,
      enabled: false
    };
  }

  setAutoUpdateState({
    status: "disabled",
    enabled: false,
    updateDownloaded: false,
    progressPercent: 0,
    bytesPerSecond: 0,
    transferredBytes: 0,
    totalBytes: 0,
    message: String(reasonMessage || "Atualizador desativado."),
    error: String(errorMessage || "")
  });
}

function setAutoUpdateNoReleaseState(message) {
  setAutoUpdateState({
    status: "idle",
    updateDownloaded: false,
    progressPercent: 0,
    bytesPerSecond: 0,
    transferredBytes: 0,
    totalBytes: 0,
    message: String(message || "Nenhuma release de update disponivel."),
    error: "",
    lastCheckedAt: new Date().toISOString()
  });
}

function clearAutoUpdaterInterval() {
  if (!autoUpdateIntervalId) return;
  clearInterval(autoUpdateIntervalId);
  autoUpdateIntervalId = null;
}

function scheduleAutoUpdaterInterval(checkIntervalMs) {
  clearAutoUpdaterInterval();
  if (!Number.isFinite(checkIntervalMs) || checkIntervalMs <= 0) {
    return;
  }
  autoUpdateIntervalId = setInterval(() => {
    void checkForLauncherUpdate("interval");
  }, checkIntervalMs);
}

function getExpectedUpdateManifestNames(channelValue) {
  const channel = String(channelValue || "").trim().toLowerCase();
  const names = new Set(["latest.yml"]);
  if (channel && channel !== "latest") {
    names.add(`${channel}.yml`);
  }
  return names;
}

function getGenericUpdateBaseUrl(config) {
  const owner = String(config?.owner || "").trim();
  const repo = String(config?.repo || "").trim();
  if (!owner || !repo) {
    return "";
  }
  return `https://github.com/${owner}/${repo}/releases/latest/download`;
}

function isRetryableAutoUpdateStatus(status) {
  return [403, 429, 500, 502, 503, 504].includes(Number(status) || 0);
}

function buildAutoUpdateRequestHeaders(config) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "WPlay-Launcher-Updater"
  };
  if (config?.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }
  return headers;
}

async function probeGenericManifestAvailability(config, expectedManifests) {
  const baseUrl = getGenericUpdateBaseUrl(config);
  if (!baseUrl) {
    return {
      ok: false,
      status: 0,
      retryable: false,
      noRelease: false,
      message: "owner/repo invalidos para validar manifest."
    };
  }

  const headers = buildAutoUpdateRequestHeaders(config);
  let sawRetryable = false;
  let sawNon404Error = false;
  let lastStatus = 0;
  let lastMessage = "";

  for (const manifestName of expectedManifests) {
    const url = `${baseUrl}/${manifestName}`;
    try {
      const response = await axios.get(url, {
        headers,
        timeout: 20_000,
        maxRedirects: 6,
        responseType: "text",
        transformResponse: [(value) => value],
        validateStatus: (status) => status >= 200 && status < 500
      });
      lastStatus = Number(response.status) || 0;

      if (response.status === 200) {
        return {
          ok: true,
          manifestName,
          url,
          status: 200,
          retryable: false,
          noRelease: false,
          message: ""
        };
      }

      if (response.status === 404) {
        continue;
      }

      if (isRetryableAutoUpdateStatus(response.status)) {
        sawRetryable = true;
      } else {
        sawNon404Error = true;
      }
      lastMessage = `HTTP ${response.status} em ${url}`;
    } catch (error) {
      const status = Number(error?.response?.status) || 0;
      lastStatus = status;
      if (isRetryableAutoUpdateStatus(status)) {
        sawRetryable = true;
      } else {
        sawNon404Error = true;
      }
      lastMessage = formatAutoUpdateError(error);
    }
  }

  return {
    ok: false,
    status: lastStatus,
    retryable: sawRetryable,
    noRelease: !sawRetryable && !sawNon404Error,
    message: lastMessage || "Manifest de update ainda indisponivel."
  };
}

async function validateAutoUpdateFeedOnce() {
  if (autoUpdateFeedValidationCompleted) {
    return true;
  }

  if (autoUpdateFeedValidationInFlight) {
    return autoUpdateFeedValidationInFlight;
  }

  const config = autoUpdateConfigSnapshot;
  if (!config?.enabled || !config?.configured) {
    return false;
  }

  const owner = String(config.owner || "").trim();
  const repo = String(config.repo || "").trim();
  const feedProvider = resolveAutoUpdaterProvider(config);
  const expectedManifests = getExpectedUpdateManifestNames(config.channel);

  autoUpdateFeedValidationInFlight = (async () => {
    if (feedProvider === "generic") {
      const genericProbe = await probeGenericManifestAvailability(config, expectedManifests);
      if (genericProbe.ok) {
        autoUpdateFeedValidationCompleted = true;
        return true;
      }
      if (genericProbe.noRelease) {
        setAutoUpdateNoReleaseState(
          `Sem release de update no repo ${owner}/${repo}. Publique uma release do launcher quando quiser atualizar.`
        );
        return false;
      }
      if (genericProbe.retryable) {
        setAutoUpdateState({
          status: "idle",
          message: "Feed de update temporariamente indisponivel. Tentando novamente em instantes...",
          error: "",
          lastCheckedAt: new Date().toISOString()
        });
        return false;
      }
      setAutoUpdateState({
        status: "error",
        message: "Falha ao validar feed de update.",
        error: `[AUTO_UPDATE_FEED] Nao foi possivel acessar manifest de update em ${owner}/${repo}.`,
        lastCheckedAt: new Date().toISOString()
      });
      return false;
    }

    const releaseApiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    const headers = buildAutoUpdateRequestHeaders(config);
    const response = await axios.get(releaseApiUrl, {
      headers,
      timeout: 20_000,
      validateStatus: (status) => status >= 200 && status < 500
    });

    if (response.status === 404) {
      setAutoUpdateNoReleaseState(
        `Sem release de update no repo ${owner}/${repo}. Publique uma release do launcher quando quiser atualizar.`
      );
      return false;
    }

    if (response.status >= 400) {
      const fallbackProbe = await probeGenericManifestAvailability(config, expectedManifests);
      if (fallbackProbe.ok) {
        autoUpdateFeedValidationCompleted = true;
        return true;
      }

      if (response.status === 403 || response.status === 429 || fallbackProbe.retryable) {
        setAutoUpdateState({
          status: "idle",
          message: "GitHub limitou temporariamente a validacao do update. Tentando novamente automaticamente...",
          error: "",
          lastCheckedAt: new Date().toISOString()
        });
        return false;
      }

      setAutoUpdateState({
        status: "error",
        message: "Falha ao validar feed de update.",
        error: `[AUTO_UPDATE_FEED] GitHub API retornou ${response.status} para ${owner}/${repo}.`,
        lastCheckedAt: new Date().toISOString()
      });
      return false;
    }

    const assets = Array.isArray(response.data?.assets) ? response.data.assets : [];
    const hasManifest = assets.some((asset) =>
      expectedManifests.has(String(asset?.name || "").trim().toLowerCase())
    );

    if (!hasManifest) {
      const fallbackProbe = await probeGenericManifestAvailability(config, expectedManifests);
      if (fallbackProbe.ok) {
        autoUpdateFeedValidationCompleted = true;
        return true;
      }

      const releaseTag = String(response.data?.tag_name || "").trim() || "(sem tag)";
      const expectedList = [...expectedManifests].join(" ou ");
      setAutoUpdateNoReleaseState(
        `[AUTO_UPDATE_FEED] A release ${releaseTag} em ${owner}/${repo} nao possui ${expectedList}.`
      );
      return false;
    }

    autoUpdateFeedValidationCompleted = true;
    return true;
  })()
    .catch(async (error) => {
      const fallbackProbe = await probeGenericManifestAvailability(config, expectedManifests).catch(() => ({
        ok: false,
        retryable: false
      }));
      if (fallbackProbe.ok) {
        autoUpdateFeedValidationCompleted = true;
        return true;
      }

      const formattedError = formatAutoUpdateError(error);
      const transient =
        fallbackProbe.retryable ||
        formattedError.toLowerCase().includes("[auto_update_temp]") ||
        formattedError.toLowerCase().includes("rate limit");

      setAutoUpdateState({
        status: transient ? "idle" : "error",
        message: transient
          ? "Validacao de update temporariamente indisponivel. O launcher continuara tentando automaticamente."
          : "Falha ao validar feed do updater.",
        error: transient ? "" : formattedError,
        lastCheckedAt: new Date().toISOString()
      });
      return false;
    })
    .finally(() => {
      autoUpdateFeedValidationInFlight = null;
    });

  return autoUpdateFeedValidationInFlight;
}

function wireAutoUpdaterEventsOnce() {
  if (!autoUpdater || autoUpdateInitialized) {
    return;
  }

  autoUpdateInitialized = true;

  autoUpdater.on("checking-for-update", () => {
    setAutoUpdateState({
      status: "checking",
      message: "Verificando atualizacoes...",
      error: "",
      progressPercent: 0,
      bytesPerSecond: 0,
      transferredBytes: 0,
      totalBytes: 0
    });
  });

  autoUpdater.on("update-available", (info) => {
    const latestVersion = String(info?.version || "").trim();
    const latestLabel = latestVersion ? `v${latestVersion}` : "nova versao";
    const directLatestMode = Boolean(autoUpdateConfigSnapshot?.preferLatestFullInstaller);
    const message = autoUpdater.autoDownload
      ? directLatestMode
        ? `${latestLabel} encontrada. Baixando pacote completo mais recente...`
        : `${latestLabel} encontrada. Baixando em segundo plano...`
      : `${latestLabel} encontrada. Clique para baixar.`;

    setAutoUpdateState({
      status: autoUpdater.autoDownload ? "downloading" : "available",
      latestVersion,
      updateDownloaded: false,
      message,
      error: "",
      lastCheckedAt: new Date().toISOString()
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    const percent = Number(progress?.percent);
    const percentSafe = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
    setAutoUpdateState({
      status: "downloading",
      message: `Baixando atualizacao ${percentSafe.toFixed(1)}%...`,
      progressPercent: percentSafe,
      bytesPerSecond: Number(progress?.bytesPerSecond) || 0,
      transferredBytes: Number(progress?.transferred) || 0,
      totalBytes: Number(progress?.total) || 0,
      error: ""
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    const latestVersion = String(info?.version || "").trim();
    const shouldAutoRestartAfterStartup = false;
    appendStartupLog(`[AUTO_UPDATE] update-downloaded version=${latestVersion || "unknown"} origin=${autoUpdateLastCheckOrigin}`);

    setAutoUpdateState({
      status: "downloaded",
      latestVersion,
      updateDownloaded: true,
      progressPercent: 100,
      message: "Atualizacao pronta. Clique no icone verde para reiniciar e aplicar.",
      error: "",
      lastCheckedAt: new Date().toISOString()
    });

    if (shouldAutoRestartAfterStartup) {
      setTimeout(() => {
        try {
          autoUpdater.quitAndInstall(true, true);
        } catch (error) {
          setAutoUpdateState({
            status: "error",
            message: "Falha ao reiniciar launcher para aplicar atualizacao.",
            error: formatAutoUpdateError(error),
            lastCheckedAt: new Date().toISOString()
          });
        }
      }, 1100);
    }
  });

  autoUpdater.on("update-not-available", (info) => {
    const latestVersion = String(info?.version || "").trim();
    setAutoUpdateState({
      status: "idle",
      latestVersion,
      updateDownloaded: false,
      progressPercent: 0,
      message: "Launcher atualizado.",
      error: "",
      lastCheckedAt: new Date().toISOString()
    });
  });

  autoUpdater.on("error", (error) => {
    const formattedError = formatAutoUpdateError(error);
    if (isAutoUpdateFeedFatalError(formattedError)) {
      setAutoUpdateNoReleaseState(formattedError);
      return;
    }

    if (isAutoUpdateTransientError(formattedError)) {
      setAutoUpdateState({
        status: "idle",
        updateDownloaded: false,
        message: "Atualizador temporariamente indisponivel. O launcher continuara tentando automaticamente.",
        error: "",
        lastCheckedAt: new Date().toISOString()
      });
      return;
    }

    setAutoUpdateState({
      status: "error",
      updateDownloaded: false,
      message: "Falha no atualizador.",
      error: formattedError,
      lastCheckedAt: new Date().toISOString()
    });
  });
}

function setupAutoUpdater() {
  const runtimeInfo = resolveAutoUpdateRuntimeInfo();

  setAutoUpdateState(
    {
      currentVersion: app.getVersion(),
      runtimeChannel: runtimeInfo.runtimeChannel,
      runtimePackaged: runtimeInfo.packaged,
      runtimeExec: runtimeInfo.execName,
      runtimeDebug: buildAutoUpdateRuntimeDiagnostic(runtimeInfo),
      startupSafeMode: runtimeStartupHealthState.safeMode,
      startupSafeModeReason: runtimeStartupHealthState.reason || "",
      preferLatestFullInstaller: true
    },
    false
  );

  if (!runtimeInfo.packaged) {
    setAutoUpdateState({
      supported: false,
      configured: false,
      enabled: false,
      status: "disabled",
      message: resolveAutoUpdateUnsupportedMessage(runtimeInfo),
      error: ""
    });
    return;
  }

  if (!autoUpdater) {
    setAutoUpdateState({
      supported: false,
      configured: false,
      enabled: false,
      status: "disabled",
      message: "Modulo electron-updater nao encontrado.",
      error: ""
    });
    return;
  }

  const config = resolveAutoUpdaterConfig();
  autoUpdateConfigSnapshot = config;
  autoUpdateFeedValidationCompleted = false;
  autoUpdateFeedValidationInFlight = null;
  autoUpdateLastRequestedAt = 0;

  if (!config.enabled) {
    setAutoUpdateState({
      supported: true,
      configured: false,
      enabled: false,
      status: "disabled",
      message: "Atualizador desativado em config/updater.json.",
      error: ""
    });
    return;
  }

  if (!config.configured) {
    setAutoUpdateState({
      supported: true,
      configured: false,
      enabled: true,
      status: "disabled",
      message: "Configure owner/repo em config/updater.json para habilitar atualizacoes.",
      error: ""
    });
    return;
  }

  try {
    wireAutoUpdaterEventsOnce();
    autoUpdater.autoDownload = config.autoDownload;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = config.allowPrerelease;
    autoUpdater.allowDowngrade = config.allowDowngrade;
    if (Object.prototype.hasOwnProperty.call(autoUpdater, "disableDifferentialDownload")) {
      autoUpdater.disableDifferentialDownload = config.preferLatestFullInstaller;
    }
    const feedProvider = resolveAutoUpdaterProvider(config);
    if (feedProvider === "generic") {
      autoUpdater.setFeedURL({
        provider: "generic",
        url: getGenericUpdateBaseUrl(config),
        channel: config.channel
      });
    } else {
      autoUpdater.setFeedURL({
        provider: "github",
        owner: config.owner,
        repo: config.repo,
        releaseType: config.allowPrerelease ? "prerelease" : "release",
        channel: config.channel,
        private: config.privateRepo,
        token: config.token || undefined
      });
    }

    setAutoUpdateState({
      supported: true,
      configured: true,
      enabled: true,
      status: "idle",
      latestVersion: "",
      updateDownloaded: false,
      preferLatestFullInstaller: config.preferLatestFullInstaller,
      progressPercent: 0,
      bytesPerSecond: 0,
      transferredBytes: 0,
      totalBytes: 0,
      message: "Atualizador pronto.",
      error: ""
    });

    scheduleAutoUpdaterInterval(config.checkIntervalMs);
  } catch (error) {
    setAutoUpdateState({
      supported: true,
      configured: false,
      enabled: true,
      status: "error",
      message: "Nao foi possivel inicializar o atualizador.",
      error: formatAutoUpdateError(error)
    });
  }
}

async function checkForLauncherUpdate(origin = "manual") {
  const runtimeInfo = resolveAutoUpdateRuntimeInfo();
  if (!autoUpdater || !autoUpdateConfigSnapshot?.enabled || !autoUpdateConfigSnapshot?.configured || !runtimeInfo.packaged) {
    return getPublicAutoUpdateState();
  }

  if (autoUpdateState.updateDownloaded || autoUpdateState.status === "downloaded") {
    return getPublicAutoUpdateState();
  }

  const normalizedOrigin = String(origin || "").trim().toLowerCase() || "manual";
  const nowMs = Date.now();
  if (normalizedOrigin !== "manual") {
    const elapsedSinceRequest = nowMs - autoUpdateLastRequestedAt;
    if (elapsedSinceRequest >= 0 && elapsedSinceRequest < AUTO_UPDATE_CHECK_COOLDOWN_MS) {
      return getPublicAutoUpdateState();
    }
    const lastCheckedAtMs = Date.parse(autoUpdateState.lastCheckedAt || "");
    if (Number.isFinite(lastCheckedAtMs) && lastCheckedAtMs > 0) {
      const elapsedSinceCheck = nowMs - lastCheckedAtMs;
      if (elapsedSinceCheck >= 0 && elapsedSinceCheck < AUTO_UPDATE_CHECK_COOLDOWN_MS) {
        return getPublicAutoUpdateState();
      }
    }
  }

  const feedValid = await validateAutoUpdateFeedOnce();
  if (!feedValid) {
    return getPublicAutoUpdateState();
  }

  if (autoUpdateCheckInFlight) {
    return autoUpdateCheckInFlight;
  }

  if (normalizedOrigin === "manual" && autoUpdateState.status !== "checking") {
    setAutoUpdateState({
      status: "checking",
      message: "Verificando atualizacoes...",
      error: ""
    });
  }

  autoUpdateLastCheckOrigin = normalizedOrigin;
  autoUpdateLastRequestedAt = nowMs;
  autoUpdateCheckInFlight = autoUpdater
    .checkForUpdates()
    .then(() => getPublicAutoUpdateState())
    .catch((error) => {
      const formattedError = formatAutoUpdateError(error);
      if (isAutoUpdateFeedFatalError(formattedError)) {
        setAutoUpdateNoReleaseState(formattedError);
        return getPublicAutoUpdateState();
      }

      if (isAutoUpdateTransientError(formattedError)) {
        setAutoUpdateState({
          status: "idle",
          message: "Servico de update indisponivel no momento. Tentando novamente em segundo plano...",
          error: "",
          lastCheckedAt: new Date().toISOString()
        });
        return getPublicAutoUpdateState();
      }

      setAutoUpdateState({
        status: "error",
        message: "Falha ao verificar atualizacao.",
        error: formattedError,
        lastCheckedAt: new Date().toISOString()
      });
      return getPublicAutoUpdateState();
    })
    .finally(() => {
      autoUpdateCheckInFlight = null;
    });

  return autoUpdateCheckInFlight;
}

async function downloadLauncherUpdate() {
  const runtimeInfo = resolveAutoUpdateRuntimeInfo();
  if (!autoUpdater || !autoUpdateConfigSnapshot?.enabled || !autoUpdateConfigSnapshot?.configured || !runtimeInfo.packaged) {
    return getPublicAutoUpdateState();
  }

  if (autoUpdateState.updateDownloaded || autoUpdateState.status === "downloaded") {
    return getPublicAutoUpdateState();
  }

  if (autoUpdateDownloadInFlight) {
    return autoUpdateDownloadInFlight;
  }

  if (autoUpdateState.status !== "available") {
    return checkForLauncherUpdate("manual");
  }

  setAutoUpdateState({
    status: "downloading",
    message: "Baixando atualizacao do launcher...",
    error: ""
  });

  autoUpdateDownloadInFlight = autoUpdater
    .downloadUpdate()
    .then(() => getPublicAutoUpdateState())
    .catch((error) => {
      const formattedError = formatAutoUpdateError(error);
      if (isAutoUpdateTransientError(formattedError)) {
        setAutoUpdateState({
          status: "available",
          message: "Falha temporaria no download. Clique novamente para tentar.",
          error: "",
          lastCheckedAt: new Date().toISOString()
        });
        return getPublicAutoUpdateState();
      }

      setAutoUpdateState({
        status: "error",
        message: "Falha ao baixar atualizacao.",
        error: formattedError,
        lastCheckedAt: new Date().toISOString()
      });
      return getPublicAutoUpdateState();
    })
    .finally(() => {
      autoUpdateDownloadInFlight = null;
    });

  return autoUpdateDownloadInFlight;
}

function restartAndInstallLauncherUpdate() {
  if (!autoUpdater) {
    throw new Error("Atualizador nao esta disponivel nesta build.");
  }
  if (!autoUpdateState.updateDownloaded) {
    throw new Error("Nenhuma atualizacao pronta para instalar.");
  }

  setAutoUpdateState({
    status: "installing",
    message: "Aplicando atualizacao do launcher...",
    error: ""
  });

  setTimeout(() => {
    appQuitRequested = true;
    autoUpdater.quitAndInstall(true, true);
  }, 140);

  return { ok: true };
}

function isStartupUpdatePending() {
  if (!autoUpdateConfigSnapshot?.autoRestartOnStartup) {
    return false;
  }
  if (autoUpdateLastCheckOrigin !== "startup") {
    return false;
  }
  return (
    autoUpdateState.status === "checking" ||
    autoUpdateState.status === "downloading" ||
    autoUpdateState.status === "downloaded" ||
    Boolean(autoUpdateState.updateDownloaded)
  );
}

function getPublicAuthSession(storedSession) {
  if (!storedSession || !storedSession.user?.id) {
    return null;
  }

  const provider = String(storedSession.provider || storedSession.user?.provider || "discord").toLowerCase();
  const hasAccess = provider === "steam" ? true : Boolean(storedSession.accessToken);
  if (!hasAccess) {
    return null;
  }

  return {
    user: {
      id: storedSession.user.id,
      email: storedSession.user.email,
      displayName: storedSession.user.displayName,
      avatarUrl: storedSession.user.avatarUrl,
      provider: storedSession.user.provider || provider || "discord"
    },
    expiresAt: parsePositiveInteger(storedSession.expiresAt)
  };
}

function isStoredAuthSessionExpired(storedSession) {
  const provider = String(storedSession?.provider || storedSession?.user?.provider || "").toLowerCase();
  if (provider === "steam") {
    return false;
  }
  const expiresAt = parsePositiveInteger(storedSession?.expiresAt);
  if (!expiresAt) return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return expiresAt <= nowSeconds + AUTH_EXPIRY_SKEW_SECONDS;
}

function encryptAuthSession(storedSession) {
  if (!safeStorage.isEncryptionAvailable()) {
    return "";
  }
  const serialized = JSON.stringify(storedSession);
  return safeStorage.encryptString(serialized).toString("base64");
}

function decryptAuthSession(value) {
  const encrypted = String(value || "").trim();
  if (!encrypted) return null;
  if (!safeStorage.isEncryptionAvailable()) return null;

  try {
    const decrypted = safeStorage.decryptString(Buffer.from(encrypted, "base64"));
    const parsed = JSON.parse(decrypted);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return null;
  } catch (_error) {
    return null;
  }
}

function readPersistedAuthSessionSync() {
  if (authSessionCache) {
    return authSessionCache;
  }

  const runtimeConfig = readRuntimeConfigSync();
  const persisted = decryptAuthSession(runtimeConfig.authSessionEncrypted);
  if (!persisted) {
    return null;
  }
  authSessionCache = persisted;
  return persisted;
}

async function persistAuthSession(storedSession) {
  authSessionCache = storedSession || null;

  if (!storedSession) {
    await writeRuntimeConfig({
      authSessionEncrypted: "",
      authSessionUpdatedAt: ""
    });
    return;
  }

  const encrypted = encryptAuthSession(storedSession);
  if (!encrypted) {
    // Fallback seguro: manter somente em memoria se o SO nao oferecer criptografia.
    return;
  }

  await writeRuntimeConfig({
    authSessionEncrypted: encrypted,
    authSessionUpdatedAt: new Date().toISOString()
  });
}

async function clearPersistedAuthSession() {
  authSessionCache = null;
  resetSocialActivityBackgroundTrackingState();
  await writeRuntimeConfig({
    authSessionEncrypted: "",
    authSessionUpdatedAt: ""
  });
}

async function resolveValidStoredAuthSession() {
  const authConfig = resolveAuthConfig();
  const configured = Boolean(authConfig.steamWebApiKey);
  if (!configured) {
    return {
      configured: false,
      session: null
    };
  }

  let session = readPersistedAuthSessionSync();
  if (!session) {
    return {
      configured: true,
      session: null
    };
  }

  const provider = String(session.provider || session.user?.provider || "").toLowerCase();
  if (provider !== "steam") {
    await clearPersistedAuthSession();
    clearSteamUserDataCache();
    return {
      configured: true,
      session: null
    };
  }

  const steamId = normalizeSteamId(session.steamId || session.user?.id);
  if (!steamId) {
    await clearPersistedAuthSession();
    clearSteamUserDataCache();
    return {
      configured: true,
      session: null
    };
  }

  const cacheStale = Date.now() - Number(steamUserDataCache.profileFetchedAt || 0) > STEAM_PROFILE_CACHE_TTL_MS;
  const shouldRefreshProfile = !session.user?.displayName || cacheStale;
  if (shouldRefreshProfile) {
    const profile = await fetchSteamPlayerSummary(steamId, authConfig.steamWebApiKey).catch(() => null);
    if (profile) {
      const refreshed = buildStoredSteamSession(profile);
      if (refreshed) {
        session = refreshed;
        await persistAuthSession(session);
        steamUserDataCache.steamId = steamId;
        steamUserDataCache.profile = profile;
        steamUserDataCache.profileFetchedAt = Date.now();
      }
    }
  }

  return {
    configured: true,
    session
  };
}

function finishActiveAuthLogin(error, result) {
  if (!activeAuthLoginRequest) return;
  const request = activeAuthLoginRequest;
  activeAuthLoginRequest = null;
  if (typeof request.cleanup === "function") {
    try {
      request.cleanup();
    } catch (_error) {
      // Ignore cleanup errors.
    }
  }
  if (request.timeoutId) {
    clearTimeout(request.timeoutId);
  }
  if (error) {
    request.reject(error);
    return;
  }
  request.resolve(result);
}

async function handleAuthDeepLink(rawUrl) {
  const urlValue = String(rawUrl || "").trim();

  const authConfig = resolveAuthConfig();
  const expectedRedirectUrl = String(activeAuthLoginRequest?.callbackUrl || authConfig.redirectUrl || "");
  const parsedPayload = parseSteamAuthCallbackPayload(urlValue, authConfig, expectedRedirectUrl);
  if (!parsedPayload) {
    return false;
  }

  authDeepLinkUrlBuffer = "";
  focusMainWindowIfAvailable();

  if (!activeAuthLoginRequest) {
    // Se nao houver fluxo aguardando, apenas ignoramos callback stale.
    return true;
  }

  if (String(activeAuthLoginRequest.provider || "").toLowerCase() !== "steam") {
    finishActiveAuthLogin(new Error("[AUTH_STATE] Login em andamento nao corresponde ao callback recebido."));
    return true;
  }

  const expectedState = String(activeAuthLoginRequest.state || "").trim();
  if (!parsedPayload.state || !expectedState || parsedPayload.state !== expectedState) {
    finishActiveAuthLogin(
      new Error("[AUTH_STATE] Sessao de login Steam invalida. Feche abas antigas e tente novamente.")
    );
    return true;
  }

  const openidMode = String(parsedPayload.openidMode || "").trim().toLowerCase();
  if (!openidMode || openidMode !== "id_res") {
    finishActiveAuthLogin(new Error("[AUTH_OAUTH_DENIED] Login Steam cancelado ou invalido."));
    return true;
  }

  try {
    const openIdValid = await verifySteamOpenIdResponse(parsedPayload.rawQuery);
    if (!openIdValid) {
      throw new Error("[AUTH_CALLBACK_INVALID] Nao foi possivel validar resposta OpenID da Steam.");
    }

    const steamId = normalizeSteamId(extractSteamIdFromClaimedId(parsedPayload.openidClaimedId));
    if (!steamId) {
      throw new Error("[AUTH_CALLBACK_INVALID] SteamID nao encontrado no retorno da autenticacao.");
    }

    const player = await fetchSteamPlayerSummary(steamId, authConfig.steamWebApiKey);
    if (!player) {
      throw new Error("[AUTH_STEAM_PROFILE] Nao foi possivel carregar perfil Steam. Verifique steamWebApiKey.");
    }

    const storedSession = buildStoredSteamSession(player);
    if (!storedSession || !storedSession.user?.id) {
      throw new Error("[AUTH_CALLBACK_INVALID] Sessao Steam recebida esta incompleta.");
    }

    await persistAuthSession(storedSession);
    clearSteamUserDataCache();
    steamUserDataCache.steamId = steamId;
    steamUserDataCache.profile = player;
    steamUserDataCache.profileFetchedAt = Date.now();
    resetSocialActivityBackgroundTrackingState();
    socialActivityBackgroundCurrentUserId = steamId;
    socialActivityBackgroundCursorIso = new Date(Date.now() - 3000).toISOString();
    ensureSocialActivityBackgroundMonitorStarted();
    setTimeout(() => {
      void pollBackgroundFriendGameActivities(true);
    }, 180);
    finishActiveAuthLogin(null, {
      authenticated: true,
      configured: true,
      session: getPublicAuthSession(storedSession)
    });
  } catch (error) {
    await clearPersistedAuthSession();
    clearSteamUserDataCache();
    finishActiveAuthLogin(
      new Error(error?.message || "[AUTH_LOGIN_FAILED] Nao foi possivel concluir login com Steam.")
    );
  }

  return true;
}

function extractDeepLinkFromArgv(argv) {
  if (!Array.isArray(argv)) return "";
  for (const item of argv) {
    const value = String(item || "").trim();
    if (value.toLowerCase().startsWith(`${AUTH_PROTOCOL_SCHEME}://`)) {
      return value;
    }
  }
  return "";
}

function focusMainWindowIfAvailable() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

function isAuthProtocolRegistered() {
  try {
    return app.isDefaultProtocolClient(AUTH_PROTOCOL_SCHEME);
  } catch (_error) {
    return false;
  }
}

function getAuthProtocolCommandValue() {
  if (process.defaultApp) {
    const entry = process.argv.length >= 2 ? path.resolve(process.argv[1]) : app.getAppPath();
    return `"${process.execPath}" "${entry}" "%1"`;
  }
  return `"${process.execPath}" "%1"`;
}

async function registerAuthProtocolWindowsPerUserFallback() {
  if (process.platform !== "win32") {
    return false;
  }

  const regExe = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "reg.exe");
  const protocolKey = `HKCU\\Software\\Classes\\${AUTH_PROTOCOL_SCHEME}`;
  const commandKey = `${protocolKey}\\shell\\open\\command`;
  const iconKey = `${protocolKey}\\DefaultIcon`;
  const commandValue = getAuthProtocolCommandValue();
  const iconValue = `"${process.execPath}",0`;

  const commands = [
    ["add", protocolKey, "/ve", "/t", "REG_SZ", "/d", `URL:${AUTH_PROTOCOL_SCHEME} Protocol`, "/f"],
    ["add", protocolKey, "/v", "URL Protocol", "/t", "REG_SZ", "/d", "\"\"", "/f"],
    ["add", iconKey, "/ve", "/t", "REG_SZ", "/d", iconValue, "/f"],
    ["add", commandKey, "/ve", "/t", "REG_SZ", "/d", commandValue, "/f"]
  ];

  for (const args of commands) {
    try {
      const result = await runCommandCapture(regExe, args, { timeoutMs: 20_000 });
      if (result.code !== 0) {
        return false;
      }
    } catch (_error) {
      return false;
    }
  }

  return true;
}

async function registerAuthProtocolClient() {
  try {
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient(AUTH_PROTOCOL_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
      } else {
        app.setAsDefaultProtocolClient(AUTH_PROTOCOL_SCHEME);
      }
    } else {
      app.setAsDefaultProtocolClient(AUTH_PROTOCOL_SCHEME);
    }
  } catch (_error) {
    // fallback below
  }

  if (isAuthProtocolRegistered()) {
    return true;
  }

  const fallbackOk = await registerAuthProtocolWindowsPerUserFallback();
  if (!fallbackOk) {
    return isAuthProtocolRegistered();
  }

  // Tenta validar novamente apos registro manual por usuario.
  return isAuthProtocolRegistered() || fallbackOk;
}

async function getAuthSessionState() {
  const resolved = await resolveValidStoredAuthSession();
  return {
    authenticated: Boolean(resolved.session),
    configured: Boolean(resolved.configured),
    session: resolved.session ? getPublicAuthSession(resolved.session) : null
  };
}

async function loginWithSteam() {
  if (activeAuthLoginRequest) {
    throw new Error("Ja existe um login em andamento. Conclua o processo no navegador.");
  }

  const authConfig = resolveAuthConfig();
  assertSteamAuthConfig(authConfig);

  const stateToken = createAuthStateToken();
  const callbackChannel = await resolveSteamCallbackChannel(authConfig);
  const authorizeUrl = buildSteamOpenIdAuthorizeUrl(
    {
      ...authConfig,
      redirectUrl: callbackChannel.redirectUrl
    },
    stateToken
  );

  const loginPromise = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      finishActiveAuthLogin(new Error("[AUTH_TIMEOUT] Tempo de login expirou. Tente novamente."));
    }, AUTH_LOGIN_TIMEOUT_MS);

    activeAuthLoginRequest = {
      timeoutId,
      provider: "steam",
      state: stateToken,
      callbackUrl: callbackChannel.redirectUrl,
      cleanup: callbackChannel.cleanup,
      resolve,
      reject
    };
  });

  try {
    await shell.openExternal(authorizeUrl);
  } catch (error) {
    finishActiveAuthLogin(new Error(error?.message || "Falha ao abrir navegador para login Steam."));
    throw error;
  }

  if (authDeepLinkUrlBuffer) {
    const buffered = authDeepLinkUrlBuffer;
    authDeepLinkUrlBuffer = "";
    setTimeout(() => {
      void handleAuthDeepLink(buffered);
    }, 0);
  }

  return loginPromise;
}

async function logoutAuthSession() {
  await clearPersistedAuthSession();
  clearSteamUserDataCache();
  resetSocialActivityBackgroundTrackingState();
  return { ok: true };
}

function sanitizeFolderName(name) {
  return String(name || "jogo")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80) || "jogo";
}

function slugifyId(input, fallback = "game") {
  const base = String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || fallback;
}

function normalizeArchiveType(value) {
  const type = String(value || "").toLowerCase();
  if (type === "zip" || type === "rar" || type === "none") {
    return type;
  }
  return "zip";
}

function formatBytesShort(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) {
    return "Tamanho nao informado";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let cursor = value;
  let unitIndex = 0;
  while (cursor >= 1024 && unitIndex < units.length - 1) {
    cursor /= 1024;
    unitIndex += 1;
  }
  const decimals = cursor >= 10 || unitIndex === 0 ? 0 : 1;
  return `${cursor.toFixed(decimals)} ${units[unitIndex]}`;
}

function parseSizeNumberToken(rawValue) {
  const value = String(rawValue || "")
    .trim()
    .replace(/\s+/g, "");
  if (!value) {
    return 0;
  }

  const dotCount = (value.match(/\./g) || []).length;
  const commaCount = (value.match(/,/g) || []).length;
  const hasDot = dotCount > 0;
  const hasComma = commaCount > 0;
  let normalized = value;

  if (hasDot && hasComma) {
    const lastDot = value.lastIndexOf(".");
    const lastComma = value.lastIndexOf(",");
    const decimalSeparator = lastDot > lastComma ? "." : ",";
    const thousandsSeparator = decimalSeparator === "." ? "," : ".";
    normalized = value.split(thousandsSeparator).join("").replace(decimalSeparator, ".");
  } else if (hasComma && !hasDot) {
    if (commaCount > 1) {
      normalized = value.split(",").join("");
    } else {
      normalized = /,\d{1,3}$/.test(value) ? value.replace(",", ".") : value.split(",").join("");
    }
  } else if (hasDot && !hasComma) {
    if (dotCount > 1) {
      normalized = value.split(".").join("");
    } else {
      normalized = /\.\d{1,3}$/.test(value) ? value : value.split(".").join("");
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseSizeBytes(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  }

  const text = String(value || "").trim();
  if (!text) {
    return 0;
  }

  const directParsed = Number(text);
  if (Number.isFinite(directParsed) && directParsed > 0) {
    return Math.round(directParsed);
  }

  const sizeMatch = text.match(/^([\d.,\s]+)\s*(b|bytes?|kb|kib|mb|mib|gb|gib|tb|tib)$/i);
  if (sizeMatch) {
    const amount = parseSizeNumberToken(sizeMatch[1]);
    if (amount > 0) {
      const normalizedUnit = String(sizeMatch[2] || "")
        .trim()
        .toLowerCase();
      let multiplier = 1;
      if (normalizedUnit === "kb" || normalizedUnit === "kib") multiplier = 1024;
      else if (normalizedUnit === "mb" || normalizedUnit === "mib") multiplier = 1024 ** 2;
      else if (normalizedUnit === "gb" || normalizedUnit === "gib") multiplier = 1024 ** 3;
      else if (normalizedUnit === "tb" || normalizedUnit === "tib") multiplier = 1024 ** 4;
      const resolved = amount * multiplier;
      if (Number.isFinite(resolved) && resolved > 0) {
        return Math.round(resolved);
      }
    }
  }

  const digitsOnly = text.replace(/[^\d]/g, "");
  if (!digitsOnly) {
    return 0;
  }
  const parsedDigits = Number(digitsOnly);
  return Number.isFinite(parsedDigits) && parsedDigits > 0 ? parsedDigits : 0;
}

function extractTotalBytesFromHeaders(headers = {}) {
  if (!headers || typeof headers !== "object") {
    return 0;
  }

  const headerCandidates = [
    headers["content-length"],
    headers["x-goog-stored-content-length"],
    headers["x-goog-upload-content-length"],
    headers["x-file-size"]
  ];

  for (const candidate of headerCandidates) {
    const parsed = parseSizeBytes(candidate);
    if (parsed > 0) {
      return parsed;
    }
  }

  const contentRange = String(headers["content-range"] || "").trim();
  const rangeMatch = contentRange.match(/\/(\d+)\s*$/);
  if (rangeMatch?.[1]) {
    return parseSizeBytes(rangeMatch[1]);
  }

  return 0;
}

function normalizeOptionalString(value) {
  const text = String(value || "").trim();
  return text || "";
}

function normalizeStatValue(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((entry) => String(entry || "").trim()).filter(Boolean))];
  }

  if (typeof value === "string" && value.trim()) {
    return [...new Set(value.split(",").map((entry) => entry.trim()).filter(Boolean))];
  }

  return [];
}

function normalizeJsonArrayValue(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_error) {
      return normalizeStringArray(value);
    }
  }
  return [];
}

function pickFirstDefinedValue(source, keys = []) {
  if (!source || typeof source !== "object") {
    return undefined;
  }
  for (const key of keys) {
    if (!key) continue;
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return undefined;
}

function pickFirstMeaningfulValue(source, keys = []) {
  if (!source || typeof source !== "object") {
    return undefined;
  }
  for (const key of keys) {
    if (!key) continue;
    const value = source[key];
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        continue;
      }
      return trimmed;
    }
    return value;
  }
  return undefined;
}

function normalizeCatalogIdentifier(value, fallback = "") {
  const normalized = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "");
  return normalized || fallback;
}

function clampCatalogPollSeconds(value, fallback = CATALOG_DEFAULT_POLL_INTERVAL_SECONDS) {
  const parsed = parsePositiveInteger(value);
  if (parsed <= 0) {
    return fallback;
  }
  return Math.max(CATALOG_MIN_POLL_INTERVAL_SECONDS, Math.min(parsed, CATALOG_MAX_POLL_INTERVAL_SECONDS));
}

function resolveCatalogSourceConfig(settings = {}) {
  const catalogSettings = settings.catalog && typeof settings.catalog === "object" ? settings.catalog : {};
  const providerRaw = String(
    process.env.WPLAY_CATALOG_PROVIDER || catalogSettings.provider || settings.catalogProvider || "supabase"
  )
    .trim()
    .toLowerCase();
  const provider = ["supabase", "json", "auto"].includes(providerRaw) ? providerRaw : "supabase";
  const enabled = parseBoolean(
    process.env.WPLAY_CATALOG_ENABLED ?? catalogSettings.enabled ?? settings.catalogEnabled,
    provider !== "json"
  );
  const pollIntervalSeconds = clampCatalogPollSeconds(
    process.env.WPLAY_CATALOG_POLL_SECONDS ?? catalogSettings.pollIntervalSeconds ?? settings.catalogPollIntervalSeconds,
    CATALOG_DEFAULT_POLL_INTERVAL_SECONDS
  );
  const schema = normalizeCatalogIdentifier(
    process.env.WPLAY_CATALOG_SUPABASE_SCHEMA || catalogSettings.supabaseSchema || catalogSettings.schema,
    CATALOG_DEFAULT_SUPABASE_SCHEMA
  );
  const table = normalizeCatalogIdentifier(
    process.env.WPLAY_CATALOG_SUPABASE_TABLE || catalogSettings.supabaseTable || catalogSettings.table,
    CATALOG_DEFAULT_SUPABASE_TABLE
  );
  const fallbackToLocalJson = parseBoolean(
    process.env.WPLAY_CATALOG_FALLBACK_JSON ?? catalogSettings.fallbackToLocalJson,
    true
  );
  const allowEmptyRemote = parseBoolean(
    process.env.WPLAY_CATALOG_ALLOW_EMPTY_REMOTE ?? catalogSettings.allowEmptyRemote,
    false
  );
  const useRemote = enabled && (provider === "supabase" || provider === "auto");
  return {
    provider,
    enabled,
    useRemote,
    pollIntervalSeconds,
    pollIntervalMs: pollIntervalSeconds * 1000,
    schema,
    table,
    fallbackToLocalJson,
    allowEmptyRemote
  };
}

function sortCatalogEntries(entries = []) {
  return [...entries].sort((a, b) => {
    const orderA = Number(a?.sortOrder);
    const orderB = Number(b?.sortOrder);
    const safeOrderA = Number.isFinite(orderA) ? orderA : 1_000_000;
    const safeOrderB = Number.isFinite(orderB) ? orderB : 1_000_000;
    if (safeOrderA !== safeOrderB) {
      return safeOrderA - safeOrderB;
    }
    const nameA = String(a?.name || "").toLowerCase();
    const nameB = String(b?.name || "").toLowerCase();
    return nameA.localeCompare(nameB, "pt-BR");
  });
}

function mapSupabaseCatalogRowToEntry(row, fallbackGoogleApiKey = "") {
  const source = row && typeof row === "object" ? row : {};
  const payloadRaw = source.game_data && typeof source.game_data === "object"
    ? source.game_data
    : source.data && typeof source.data === "object"
      ? source.data
      : {};
  const payload = payloadRaw && typeof payloadRaw === "object" ? payloadRaw : {};
  const merged = {
    ...payload,
    ...source
  };

  const gallery = normalizeJsonArrayValue(pickFirstDefinedValue(merged, ["gallery", "screenshots", "images"]));
  const genres = normalizeJsonArrayValue(pickFirstDefinedValue(merged, ["genres", "tags", "genre"]));
  const downloadUrls = normalizeJsonArrayValue(
    pickFirstDefinedValue(merged, ["downloadUrls", "download_urls", "mirrorUrls", "mirror_urls", "download_urls_json"])
  );
  const downloadSources = normalizeJsonArrayValue(
    pickFirstDefinedValue(merged, ["downloadSources", "download_sources", "sources"])
  );

  return {
    id: pickFirstDefinedValue(merged, ["id", "game_id", "gameId"]),
    name: pickFirstDefinedValue(merged, ["name", "title"]),
    description: pickFirstDefinedValue(merged, ["description", "summary"]),
    longDescription: pickFirstDefinedValue(merged, ["longDescription", "long_description", "fullDescription"]),
    section: pickFirstDefinedValue(merged, ["section", "catalog_section"]),
    comingSoon: pickFirstDefinedValue(merged, ["comingSoon", "coming_soon"]),
    archiveType: pickFirstDefinedValue(merged, ["archiveType", "archive_type"]),
    archivePassword: pickFirstDefinedValue(merged, ["archivePassword", "archive_password"]),
    checksumSha256: pickFirstDefinedValue(merged, ["checksumSha256", "checksum_sha256", "sha256"]),
    downloadUrl: pickFirstDefinedValue(merged, ["downloadUrl", "download_url"]),
    downloadUrls,
    downloadSources,
    googleDriveFileId: pickFirstDefinedValue(merged, ["googleDriveFileId", "google_drive_file_id"]),
    localArchiveFile: pickFirstDefinedValue(merged, ["localArchiveFile", "local_archive_file"]),
    googleApiKey: pickFirstDefinedValue(merged, ["googleApiKey", "google_api_key"]) || fallbackGoogleApiKey,
    installDirName: pickFirstDefinedValue(merged, ["installDirName", "install_dir_name"]),
    launchExecutable: pickFirstDefinedValue(merged, ["launchExecutable", "launch_executable"]),
    autoDetectExecutable: pickFirstDefinedValue(merged, ["autoDetectExecutable", "auto_detect_executable"]),
    imageUrl: pickFirstDefinedValue(merged, ["imageUrl", "image_url"]),
    cardImageUrl: pickFirstDefinedValue(merged, ["cardImageUrl", "card_image_url"]),
    bannerUrl: pickFirstDefinedValue(merged, ["bannerUrl", "banner_url"]),
    logoUrl: pickFirstDefinedValue(merged, ["logoUrl", "logo_url"]),
    developedBy: pickFirstDefinedValue(merged, ["developedBy", "developed_by"]),
    publishedBy: pickFirstDefinedValue(merged, ["publishedBy", "published_by"]),
    releaseDate: pickFirstDefinedValue(merged, ["releaseDate", "release_date"]),
    trailerUrl: pickFirstDefinedValue(merged, ["trailerUrl", "trailer_url", "video_url"]),
    steamAppId: pickFirstDefinedValue(merged, [
      "steamAppId",
      "steam_app_id",
      "steam_appid",
      "steamGameId",
      "steam_game_id"
    ]),
    steamStoreUrl: pickFirstDefinedValue(merged, ["steamStoreUrl", "steam_store_url", "storeUrl", "store_url"]),
    requireSteamClient: pickFirstDefinedValue(merged, [
      "requireSteamClient",
      "require_steam_client",
      "steamRequired",
      "steam_required"
    ]),
    gallery,
    genres,
    averagePlayTime: pickFirstDefinedValue(merged, ["averagePlayTime", "average_play_time"]),
    averageAchievement: pickFirstDefinedValue(merged, ["averageAchievement", "average_achievement"]),
    storeType: pickFirstDefinedValue(merged, ["storeType", "store_type"]),
    storeTag: pickFirstDefinedValue(merged, ["storeTag", "store_tag"]),
    currentPrice: pickFirstDefinedValue(merged, ["currentPrice", "current_price"]),
    originalPrice: pickFirstDefinedValue(merged, ["originalPrice", "original_price"]),
    discountPercent: pickFirstDefinedValue(merged, ["discountPercent", "discount_percent"]),
    free: pickFirstDefinedValue(merged, ["free", "is_free"]),
    exclusive: pickFirstDefinedValue(merged, ["exclusive", "is_exclusive"]),
    sizeBytes: pickFirstDefinedValue(merged, [
      "size_bytes",
      "sizeBytes",
      "archive_bytes",
      "archiveBytes",
      "file_size_bytes",
      "fileSizeBytes"
    ]),
    size: pickFirstMeaningfulValue(merged, [
      "size_label",
      "size",
      "archive_size",
      "archiveSize",
      "file_size",
      "fileSize"
    ]),
    enabled: pickFirstDefinedValue(merged, ["enabled", "is_enabled"]),
    sortOrder: pickFirstDefinedValue(merged, ["sortOrder", "sort_order"]),
    updatedAt: pickFirstDefinedValue(merged, ["updatedAt", "updated_at"])
  };
}

function normalizeDownloadSourceEntries(value) {
  if (!Array.isArray(value)) return [];

  const normalized = [];
  for (const entry of value) {
    if (typeof entry === "string") {
      const url = String(entry || "").trim();
      if (url) {
        normalized.push({
          url,
          label: "",
          kind: "",
          priority: Number.NaN
        });
      }
      continue;
    }

    if (!entry || typeof entry !== "object") continue;

    const url = String(entry.url || entry.href || "").trim();
    if (!url) continue;

    const priorityRaw = Number(entry.priority);
    normalized.push({
      url,
      label: normalizeOptionalString(entry.label || entry.name),
      kind: normalizeOptionalString(entry.kind || entry.type),
      priority: Number.isFinite(priorityRaw) ? priorityRaw : Number.NaN
    });
  }

  return normalized;
}

function formatTransferSpeedShort(bytesPerSecond) {
  const value = Number(bytesPerSecond);
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value < 1024) return `${Math.round(value)} B/s`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB/s`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB/s`;
}

function pushUniqueFailure(target, value) {
  const text = String(value || "").trim();
  if (!text) return;
  if (!Array.isArray(target)) return;
  if (!target.includes(text)) {
    target.push(text);
  }
}

function compactFailureDetails(items, maxEntries = 6, maxCharsPerEntry = 180) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }
  const compacted = [];
  for (const entry of items) {
    let text = String(entry || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    if (text.length > maxCharsPerEntry) {
      text = `${text.slice(0, maxCharsPerEntry - 3)}...`;
    }
    compacted.push(text);
    if (compacted.length >= maxEntries) {
      break;
    }
  }
  return compacted;
}

function normalizeAbsolutePath(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (path.isAbsolute(raw)) {
    return path.normalize(raw);
  }
  if (process.platform === "win32") {
    const systemDrive = process.env.SystemDrive || "C:";
    return path.join(systemDrive, raw);
  }
  return path.resolve(raw);
}

function extractDriveId(url) {
  const value = String(url || "");
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/uc\?export=download&id=([a-zA-Z0-9_-]+)/
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return "";
}

function resolveInside(baseDir, relativeTarget) {
  const safeRelative = String(relativeTarget || "")
    .replace(/^[\\\/]+/, "")
    .replace(/\//g, path.sep);
  const absolute = path.resolve(baseDir, safeRelative);
  const normalizedBase = path.resolve(baseDir);
  const baseWithSeparator = `${normalizedBase}${path.sep}`;
  if (absolute !== normalizedBase && !absolute.startsWith(baseWithSeparator)) {
    throw new Error("Caminho de executavel invalido.");
  }
  return absolute;
}

function asarToUnpackedPath(value) {
  const input = String(value || "");
  if (!input) return input;
  const normalized = path.normalize(input);
  const token = `${path.sep}app.asar${path.sep}`;
  if (normalized.includes(token)) {
    return normalized.replace(token, `${path.sep}app.asar.unpacked${path.sep}`);
  }
  return normalized
    .replace("app.asar\\", "app.asar.unpacked\\")
    .replace("app.asar/", "app.asar.unpacked/");
}

function get7zipArchFolder() {
  if (process.arch === "x64") return "x64";
  if (process.arch === "ia32") return "ia32";
  if (process.arch === "arm64") return "arm64";
  return process.arch;
}

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath);
    return true;
  } catch (_error) {
    return false;
  }
}

async function isDirectory(targetPath) {
  try {
    const stat = await fsp.stat(targetPath);
    return stat.isDirectory();
  } catch (_error) {
    return false;
  }
}

function getInstallSizeCacheKey(installDir) {
  const value = String(installDir || "");
  if (!value) return "";
  return process.platform === "win32" ? value.toLowerCase() : value;
}

async function calculateDirectorySizeBytes(rootDir) {
  if (!rootDir) return 0;
  const stack = [rootDir];
  let totalBytes = 0;

  while (stack.length > 0) {
    const currentDir = stack.pop();
    let entries = [];
    try {
      entries = await fsp.readdir(currentDir, { withFileTypes: true });
    } catch (_error) {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      try {
        const stat = await fsp.stat(fullPath);
        if (stat.isFile()) {
          totalBytes += stat.size;
        }
      } catch (_error) {
        // Continue scanning files.
      }
    }
  }

  return totalBytes;
}

async function getInstalledSizeSnapshot(installDir, manifest = null, options = {}) {
  const skipMeasurement = options?.skipMeasurement === true;
  const cacheKey = getInstallSizeCacheKey(installDir);
  const now = Date.now();
  if (cacheKey) {
    const cached = installSizeCache.get(cacheKey);
    if (cached && now - cached.measuredAt < INSTALL_SIZE_CACHE_TTL_MS) {
      return cached;
    }
  }

  const manifestSize = parseSizeBytes(manifest?.installedSizeBytes);
  const manifestMeasuredAt = Number(manifest?.sizeMeasuredAt || 0);
  if (manifestSize > 0 && manifestMeasuredAt > 0 && now - manifestMeasuredAt < INSTALL_SIZE_CACHE_TTL_MS) {
    const fromManifest = { sizeBytes: manifestSize, measuredAt: manifestMeasuredAt };
    if (cacheKey) {
      installSizeCache.set(cacheKey, fromManifest);
    }
    return fromManifest;
  }

  if (skipMeasurement) {
    if (manifestSize > 0) {
      return { sizeBytes: manifestSize, measuredAt: manifestMeasuredAt || now };
    }
    return { sizeBytes: 0, measuredAt: now };
  }

  const measured = {
    sizeBytes: await calculateDirectorySizeBytes(installDir),
    measuredAt: now
  };

  if (cacheKey) {
    installSizeCache.set(cacheKey, measured);
  }

  return measured;
}

async function parseLocalCatalogFile() {
  const raw = await fsp.readFile(getCatalogPath(), "utf8");
  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed)) {
    return { settings: {}, entries: parsed };
  }

  if (parsed && typeof parsed === "object" && Array.isArray(parsed.games)) {
    return {
      settings: parsed.settings && typeof parsed.settings === "object" ? parsed.settings : {},
      entries: parsed.games
    };
  }

  throw new Error("config/games.json deve ser um array ou objeto com { settings, games }.");
}

function buildCatalogSupabaseHeaders(authConfig, schema) {
  return {
    apikey: authConfig.supabaseAnonKey,
    Authorization: `Bearer ${authConfig.supabaseAnonKey}`,
    "Accept-Profile": schema,
    "Content-Profile": schema
  };
}

function normalizeNotificationType(value) {
  const type = String(value || "")
    .trim()
    .toLowerCase();
  if (type === "error") return "error";
  if (type === "success") return "success";
  return "info";
}

function sanitizeNotificationText(value, maxLength = 480) {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function mapSupabaseNotificationRow(row) {
  if (!row || typeof row !== "object") return null;
  const id = String(row.id || "").trim();
  if (!id) return null;
  return {
    id,
    type: normalizeNotificationType(row.type),
    title: sanitizeNotificationText(row.title, 120) || "Notificacao",
    message: sanitizeNotificationText(row.message, 800),
    createdAt: String(row.created_at || row.createdAt || new Date().toISOString())
  };
}

function resolveNotificationsStorageConfig() {
  const runtimeConfig = readRuntimeConfigSync();
  const runtimeNotifications =
    runtimeConfig?.notifications && typeof runtimeConfig.notifications === "object"
      ? runtimeConfig.notifications
      : {};

  return {
    schema: normalizeCatalogIdentifier(
      process.env.WPLAY_NOTIFICATIONS_SUPABASE_SCHEMA ||
        runtimeNotifications.supabaseSchema ||
        runtimeNotifications.schema,
      NOTIFICATIONS_DEFAULT_SUPABASE_SCHEMA
    ),
    table: normalizeCatalogIdentifier(
      process.env.WPLAY_NOTIFICATIONS_SUPABASE_TABLE ||
        runtimeNotifications.supabaseTable ||
        runtimeNotifications.table,
      NOTIFICATIONS_DEFAULT_SUPABASE_TABLE
    )
  };
}

function resolveSupabaseNotificationsContext() {
  const authConfig = resolveAuthConfig();
  if (!authConfig.supabaseUrl || !authConfig.supabaseAnonKey) {
    throw new Error("[NOTIFICATIONS_SUPABASE_AUTH] Supabase nao configurado para notificacoes.");
  }

  const steamSession = getSteamSessionSnapshot();
  const userId = String(steamSession?.steamId || steamSession?.user?.id || "").trim();
  if (!userId) {
    throw new Error("[NOTIFICATIONS_AUTH_REQUIRED] Faca login para acessar notificacoes.");
  }

  const storageConfig = resolveNotificationsStorageConfig();
  return {
    authConfig,
    schema: storageConfig.schema,
    table: storageConfig.table,
    userId
  };
}

function getNotificationsSupabaseEndpoint(context) {
  return `${context.authConfig.supabaseUrl}/rest/v1/${context.table}`;
}

async function fetchNotificationHistoryFromSupabase(context, limit = NOTIFICATIONS_HISTORY_LIMIT) {
  const endpoint = getNotificationsSupabaseEndpoint(context);
  const response = await axios.get(endpoint, {
    headers: buildCatalogSupabaseHeaders(context.authConfig, context.schema),
    params: {
      select: "id,type,title,message,created_at",
      user_id: `eq.${context.userId}`,
      order: "created_at.desc",
      limit: Math.max(1, Math.min(200, Number(limit) || NOTIFICATIONS_HISTORY_LIMIT))
    },
    timeout: 20_000,
    validateStatus: (status) => status >= 200 && status < 500
  });

  if (response.status === 404) {
    throw new Error(
      `[NOTIFICATIONS_TABLE_NOT_FOUND] Tabela ${context.schema}.${context.table} nao encontrada no Supabase.`
    );
  }
  if (response.status >= 400) {
    throw new Error(
      `[NOTIFICATIONS_HTTP_${response.status}] Falha ao carregar notificacoes de ${context.schema}.${context.table}.`
    );
  }

  const rows = Array.isArray(response.data) ? response.data : [];
  return rows
    .map((row) => mapSupabaseNotificationRow(row))
    .filter(Boolean)
    .slice(0, NOTIFICATIONS_HISTORY_LIMIT);
}

async function pruneNotificationHistoryInSupabase(context) {
  const endpoint = getNotificationsSupabaseEndpoint(context);
  const response = await axios.get(endpoint, {
    headers: buildCatalogSupabaseHeaders(context.authConfig, context.schema),
    params: {
      select: "id",
      user_id: `eq.${context.userId}`,
      order: "created_at.desc",
      limit: 300
    },
    timeout: 20_000,
    validateStatus: (status) => status >= 200 && status < 500
  });

  if (response.status === 404) {
    throw new Error(
      `[NOTIFICATIONS_TABLE_NOT_FOUND] Tabela ${context.schema}.${context.table} nao encontrada no Supabase.`
    );
  }
  if (response.status >= 400) {
    throw new Error(
      `[NOTIFICATIONS_HTTP_${response.status}] Falha ao aplicar limite de notificacoes em ${context.schema}.${context.table}.`
    );
  }

  const rows = Array.isArray(response.data) ? response.data : [];
  const overflowRows = rows.slice(NOTIFICATIONS_HISTORY_LIMIT);
  if (!overflowRows.length) {
    return;
  }

  await Promise.all(
    overflowRows.map(async (row) => {
      const id = String(row?.id || "").trim();
      if (!id) return;
      const deleteResponse = await axios.delete(endpoint, {
        headers: buildCatalogSupabaseHeaders(context.authConfig, context.schema),
        params: {
          user_id: `eq.${context.userId}`,
          id: `eq.${id}`
        },
        timeout: 20_000,
        validateStatus: (status) => status >= 200 && status < 500
      });
      if (deleteResponse.status >= 400) {
        throw new Error(
          `[NOTIFICATIONS_PRUNE_HTTP_${deleteResponse.status}] Falha ao remover notificacoes antigas no Supabase.`
        );
      }
    })
  );
}

async function listNotificationsForCurrentUser() {
  const context = resolveSupabaseNotificationsContext();
  const entries = await fetchNotificationHistoryFromSupabase(context, NOTIFICATIONS_HISTORY_LIMIT);
  return { entries };
}

async function createNotificationForCurrentUser(payload = {}) {
  const context = resolveSupabaseNotificationsContext();
  const endpoint = getNotificationsSupabaseEndpoint(context);
  const type = normalizeNotificationType(payload.type);
  const title = sanitizeNotificationText(payload.title, 120) || "Notificacao";
  const message = sanitizeNotificationText(payload.message, 800);

  const response = await axios.post(
    endpoint,
    {
      user_id: context.userId,
      type,
      title,
      message
    },
    {
      headers: {
        ...buildCatalogSupabaseHeaders(context.authConfig, context.schema),
        Prefer: "return=representation"
      },
      timeout: 20_000,
      validateStatus: (status) => status >= 200 && status < 500
    }
  );

  if (response.status === 404) {
    throw new Error(
      `[NOTIFICATIONS_TABLE_NOT_FOUND] Tabela ${context.schema}.${context.table} nao encontrada no Supabase.`
    );
  }
  if (response.status >= 400) {
    throw new Error(
      `[NOTIFICATIONS_HTTP_${response.status}] Falha ao salvar notificacao em ${context.schema}.${context.table}.`
    );
  }

  await pruneNotificationHistoryInSupabase(context);
  const entries = await fetchNotificationHistoryFromSupabase(context, NOTIFICATIONS_HISTORY_LIMIT);
  const createdRow = Array.isArray(response.data) ? response.data[0] : null;
  return {
    entry: mapSupabaseNotificationRow(createdRow),
    entries
  };
}

async function deleteNotificationForCurrentUser(notificationId) {
  const context = resolveSupabaseNotificationsContext();
  const normalizedId = String(notificationId || "").trim();
  if (!normalizedId) {
    const entries = await fetchNotificationHistoryFromSupabase(context, NOTIFICATIONS_HISTORY_LIMIT);
    return { entries };
  }

  const endpoint = getNotificationsSupabaseEndpoint(context);
  const response = await axios.delete(endpoint, {
    headers: buildCatalogSupabaseHeaders(context.authConfig, context.schema),
    params: {
      user_id: `eq.${context.userId}`,
      id: `eq.${normalizedId}`
    },
    timeout: 20_000,
    validateStatus: (status) => status >= 200 && status < 500
  });

  if (response.status === 404) {
    throw new Error(
      `[NOTIFICATIONS_TABLE_NOT_FOUND] Tabela ${context.schema}.${context.table} nao encontrada no Supabase.`
    );
  }
  if (response.status >= 400) {
    throw new Error(
      `[NOTIFICATIONS_HTTP_${response.status}] Falha ao remover notificacao em ${context.schema}.${context.table}.`
    );
  }

  const entries = await fetchNotificationHistoryFromSupabase(context, NOTIFICATIONS_HISTORY_LIMIT);
  return { entries };
}

async function clearNotificationsForCurrentUser() {
  const context = resolveSupabaseNotificationsContext();
  const endpoint = getNotificationsSupabaseEndpoint(context);
  const response = await axios.delete(endpoint, {
    headers: buildCatalogSupabaseHeaders(context.authConfig, context.schema),
    params: {
      user_id: `eq.${context.userId}`
    },
    timeout: 20_000,
    validateStatus: (status) => status >= 200 && status < 500
  });

  if (response.status === 404) {
    throw new Error(
      `[NOTIFICATIONS_TABLE_NOT_FOUND] Tabela ${context.schema}.${context.table} nao encontrada no Supabase.`
    );
  }
  if (response.status >= 400) {
    throw new Error(
      `[NOTIFICATIONS_HTTP_${response.status}] Falha ao limpar notificacoes em ${context.schema}.${context.table}.`
    );
  }

  return { entries: [] };
}

function resolveSocialActivityStorageConfig() {
  const runtimeConfig = readRuntimeConfigSync();
  const runtimeSocial =
    runtimeConfig?.socialActivity && typeof runtimeConfig.socialActivity === "object" ? runtimeConfig.socialActivity : {};

  return {
    schema: normalizeCatalogIdentifier(
      process.env.WPLAY_SOCIAL_SUPABASE_SCHEMA || runtimeSocial.supabaseSchema || runtimeSocial.schema,
      SOCIAL_ACTIVITY_DEFAULT_SUPABASE_SCHEMA
    ),
    table: normalizeCatalogIdentifier(
      process.env.WPLAY_SOCIAL_SUPABASE_TABLE || runtimeSocial.supabaseTable || runtimeSocial.table,
      SOCIAL_ACTIVITY_DEFAULT_SUPABASE_TABLE
    )
  };
}

function resolveSupabaseSocialActivityContext() {
  const authConfig = resolveAuthConfig();
  if (!authConfig.supabaseUrl || !authConfig.supabaseAnonKey) {
    throw new Error("[SOCIAL_SUPABASE_AUTH] Supabase nao configurado para atividade social.");
  }

  const steamSession = getSteamSessionSnapshot();
  const userId = String(steamSession?.steamId || steamSession?.user?.id || "").trim();
  if (!userId) {
    throw new Error("[SOCIAL_AUTH_REQUIRED] Faca login para usar atividade social.");
  }

  const storageConfig = resolveSocialActivityStorageConfig();
  return {
    authConfig,
    schema: storageConfig.schema,
    table: storageConfig.table,
    userId,
    userDisplayName: String(steamSession?.user?.displayName || "").trim(),
    userAvatarUrl: String(steamSession?.user?.avatarUrl || "").trim()
  };
}

function getSocialActivitySupabaseEndpoint(context) {
  return `${context.authConfig.supabaseUrl}/rest/v1/${context.table}`;
}

function mapSupabaseSocialActivityRow(row) {
  if (!row || typeof row !== "object") return null;
  const id = String(row.id || "").trim();
  const actorSteamId = normalizeSteamId(row.actor_steam_id || row.actorSteamId);
  if (!id || !actorSteamId) return null;

  const actorDisplayName = sanitizeNotificationText(row.actor_display_name || row.actorDisplayName, 80) || "Jogador";
  const actorAvatarUrl = sanitizeHttpUrlForToast(row.actor_avatar_url || row.actorAvatarUrl);
  const gameId = sanitizeNotificationText(row.game_id || row.gameId, 120);
  const gameName = sanitizeNotificationText(row.game_name || row.gameName, 140) || "Jogo";
  const createdAtRaw = String(row.created_at || row.createdAt || "").trim();
  const createdAtMs = Date.parse(createdAtRaw);
  const createdAt = Number.isFinite(createdAtMs) ? new Date(createdAtMs).toISOString() : new Date().toISOString();

  return {
    id,
    actorSteamId,
    actorDisplayName,
    actorAvatarUrl,
    gameId,
    gameName,
    createdAt
  };
}

function normalizeSocialActivitySince(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return "";
  return new Date(parsed).toISOString();
}

function splitIntoChunks(values = [], chunkSize = 80) {
  const list = Array.isArray(values) ? values : [];
  const size = Math.max(1, Math.min(200, parsePositiveInteger(chunkSize) || 80));
  const chunks = [];
  for (let index = 0; index < list.length; index += size) {
    chunks.push(list.slice(index, index + size));
  }
  return chunks;
}

function toSocialActivityCreatedAtMs(entry) {
  const parsed = Date.parse(String(entry?.createdAt || "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function getSocialActivityBackgroundPollIntervalMs() {
  return resolveHostLowSpecProfile()
    ? SOCIAL_ACTIVITY_BACKGROUND_POLL_INTERVAL_LOW_SPEC_MS
    : SOCIAL_ACTIVITY_BACKGROUND_POLL_INTERVAL_MS;
}

function resetSocialActivityBackgroundTrackingState() {
  socialActivityBackgroundPollInFlight = null;
  socialActivityBackgroundCursorIso = "";
  socialActivityBackgroundCurrentUserId = "";
  socialActivityBackgroundSeenIds.clear();
}

function stopSocialActivityBackgroundMonitor() {
  if (socialActivityBackgroundPollTimer) {
    clearInterval(socialActivityBackgroundPollTimer);
    socialActivityBackgroundPollTimer = null;
  }
  resetSocialActivityBackgroundTrackingState();
}

function rememberSeenBackgroundSocialActivityId(activityId) {
  const normalized = String(activityId || "").trim();
  if (!normalized) return;
  socialActivityBackgroundSeenIds.add(normalized);
  if (socialActivityBackgroundSeenIds.size > SOCIAL_ACTIVITY_BACKGROUND_SEEN_LIMIT) {
    const overflow = socialActivityBackgroundSeenIds.size - SOCIAL_ACTIVITY_BACKGROUND_SEEN_LIMIT;
    if (overflow <= 0) return;
    const iterator = socialActivityBackgroundSeenIds.values();
    for (let index = 0; index < overflow; index += 1) {
      const next = iterator.next();
      if (next.done) break;
      socialActivityBackgroundSeenIds.delete(next.value);
    }
  }
}

function setSocialActivityBackgroundCursorFromTimestamp(timestampMs) {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return;
  const currentMs = Date.parse(socialActivityBackgroundCursorIso || "");
  if (Number.isFinite(currentMs) && currentMs >= timestampMs) {
    return;
  }
  socialActivityBackgroundCursorIso = new Date(timestampMs).toISOString();
}

function getSocialActivityBackgroundSinceIso() {
  if (!socialActivityBackgroundCursorIso) {
    return "";
  }
  const cursorMs = Date.parse(socialActivityBackgroundCursorIso);
  if (!Number.isFinite(cursorMs)) {
    return "";
  }
  return new Date(Math.max(0, cursorMs - SOCIAL_ACTIVITY_BACKGROUND_CURSOR_BACKTRACK_MS)).toISOString();
}

function isLauncherBackgroundStateForFriendToast() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return true;
  }

  if (!mainWindow.isVisible() || mainWindow.isMinimized()) {
    return true;
  }

  return !mainWindow.isFocused();
}

function normalizeBackgroundSocialActivityEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const id = String(entry.id || "").trim();
  const actorSteamId = normalizeSteamId(entry.actorSteamId);
  const actorDisplayName = sanitizeNotificationText(entry.actorDisplayName, 80) || "Jogador";
  const actorAvatarUrl = sanitizeHttpUrlForToast(entry.actorAvatarUrl);
  const gameId = sanitizeNotificationText(entry.gameId, 120);
  const gameName = sanitizeNotificationText(entry.gameName, 140) || "Jogo";
  const createdAtRaw = String(entry.createdAt || "").trim();
  const createdAtMs = Date.parse(createdAtRaw);
  const createdAt = Number.isFinite(createdAtMs) ? new Date(createdAtMs).toISOString() : new Date().toISOString();

  if (!actorSteamId) {
    return null;
  }

  return {
    id,
    actorSteamId,
    actorDisplayName,
    actorAvatarUrl,
    gameId,
    gameName,
    createdAt,
    createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : Date.now()
  };
}

async function pollBackgroundFriendGameActivities(silent = true) {
  if (appQuitRequested) {
    return;
  }
  if (socialActivityBackgroundPollInFlight) {
    return socialActivityBackgroundPollInFlight;
  }

  socialActivityBackgroundPollInFlight = (async () => {
    const authConfig = resolveAuthConfig();
    if (!authConfig.supabaseUrl || !authConfig.supabaseAnonKey) {
      resetSocialActivityBackgroundTrackingState();
      return;
    }
    const steamWebApiKey = normalizeSteamWebApiKey(authConfig.steamWebApiKey);
    if (!steamWebApiKey) {
      resetSocialActivityBackgroundTrackingState();
      return;
    }

    const steamSession = getSteamSessionSnapshot();
    const currentUserId = normalizeSteamId(steamSession?.steamId || steamSession?.user?.id);
    if (!currentUserId) {
      resetSocialActivityBackgroundTrackingState();
      return;
    }

    if (socialActivityBackgroundCurrentUserId && socialActivityBackgroundCurrentUserId !== currentUserId) {
      resetSocialActivityBackgroundTrackingState();
    }
    socialActivityBackgroundCurrentUserId = currentUserId;

    if (!socialActivityBackgroundCursorIso) {
      socialActivityBackgroundCursorIso = new Date(Date.now() - 3000).toISOString();
    }

    const payload = await listFriendGameActivitiesForCurrentUser({
      since: getSocialActivityBackgroundSinceIso(),
      limit: SOCIAL_ACTIVITY_BACKGROUND_LIMIT
    });
    const entries = Array.isArray(payload?.entries) ? payload.entries : [];
    if (!entries.length) {
      return;
    }

    const now = Date.now();
    const normalizedEntries = entries
      .map((entry) => normalizeBackgroundSocialActivityEntry(entry))
      .filter(Boolean)
      .sort((left, right) => left.createdAtMs - right.createdAtMs);

    for (const entry of normalizedEntries) {
      if (entry.id && socialActivityBackgroundSeenIds.has(entry.id)) {
        continue;
      }
      if (entry.id) {
        rememberSeenBackgroundSocialActivityId(entry.id);
      }
      setSocialActivityBackgroundCursorFromTimestamp(entry.createdAtMs);

      if (entry.actorSteamId === currentUserId) {
        continue;
      }
      if (now - entry.createdAtMs > SOCIAL_ACTIVITY_BACKGROUND_MAX_EVENT_AGE_MS) {
        continue;
      }
      if (!isLauncherBackgroundStateForFriendToast()) {
        continue;
      }

      await showGameStartedDesktopToast({
        activityId: entry.id,
        actorSteamId: entry.actorSteamId,
        gameId: entry.gameId,
        createdAt: entry.createdAt,
        nickname: entry.actorDisplayName,
        avatarUrl: entry.actorAvatarUrl,
        gameName: entry.gameName
      }).catch(() => {});
    }
  })()
    .catch((error) => {
      if (!silent) {
        appendStartupLog(`[SOCIAL_BG_POLL_ERROR] ${formatStartupErrorForLog(error)}`);
      }
    })
    .finally(() => {
      socialActivityBackgroundPollInFlight = null;
    });

  return socialActivityBackgroundPollInFlight;
}

function ensureSocialActivityBackgroundMonitorStarted() {
  if (socialActivityBackgroundPollTimer) {
    return;
  }

  const intervalMs = getSocialActivityBackgroundPollIntervalMs();
  socialActivityBackgroundPollTimer = setInterval(() => {
    void pollBackgroundFriendGameActivities(true);
  }, intervalMs);
  void pollBackgroundFriendGameActivities(true);
}

async function fetchSteamFriendSteamIds(steamId, steamWebApiKey) {
  const normalizedSteamId = normalizeSteamId(steamId);
  const apiKey = normalizeSteamWebApiKey(steamWebApiKey);
  if (!normalizedSteamId || !apiKey) {
    return [];
  }

  const endpoint = `${STEAM_API_BASE_URL}/ISteamUser/GetFriendList/v0001/`;
  const response = await axios.get(endpoint, {
    params: {
      key: apiKey,
      steamid: normalizedSteamId,
      relationship: "friend"
    },
    timeout: 20_000,
    validateStatus: (status) => status >= 200 && status < 500
  });

  if (response.status === 401 || response.status === 403 || response.status === 404) {
    return [];
  }
  if (response.status >= 400) {
    throw new Error(`[STEAM_FRIEND_LIST_HTTP_${response.status}]`);
  }

  const friends = Array.isArray(response.data?.friendslist?.friends) ? response.data.friendslist.friends : [];
  return [
    ...new Set(
      friends
        .map((friendEntry) => normalizeSteamId(friendEntry?.steamid))
        .filter(Boolean)
    )
  ];
}

async function getSteamFriendSteamIdsCached(steamId, steamWebApiKey) {
  ensureSteamUserCacheScope(steamId);
  const currentIds = steamUserDataCache.friendsSteamIds instanceof Set ? steamUserDataCache.friendsSteamIds : new Set();
  const hasCachedFriends = currentIds.size > 0;
  const effectiveTtlMs = hasCachedFriends ? STEAM_FRIENDS_CACHE_TTL_MS : STEAM_FRIENDS_EMPTY_RETRY_MS;
  const cacheAge = Date.now() - Number(steamUserDataCache.friendsFetchedAt || 0);
  const hasFreshCache = cacheAge >= 0 && cacheAge < effectiveTtlMs;

  if (hasFreshCache) {
    return [...currentIds];
  }

  if (steamUserDataCache.friendsInFlight) {
    return steamUserDataCache.friendsInFlight;
  }

  steamUserDataCache.friendsInFlight = fetchSteamFriendSteamIds(steamId, steamWebApiKey)
    .then((friendIds) => {
      steamUserDataCache.friendsSteamIds = new Set(friendIds);
      steamUserDataCache.friendsFetchedAt = Date.now();
      return friendIds;
    })
    .catch((error) => {
      if (!(steamUserDataCache.friendsSteamIds instanceof Set)) {
        steamUserDataCache.friendsSteamIds = new Set();
      }
      steamUserDataCache.friendsFetchedAt = Date.now();
      if (steamUserDataCache.friendsSteamIds.size > 0) {
        return [...steamUserDataCache.friendsSteamIds];
      }
      throw error;
    })
    .finally(() => {
      steamUserDataCache.friendsInFlight = null;
    });

  return steamUserDataCache.friendsInFlight;
}

async function pruneSocialActivityInSupabase(context) {
  const endpoint = getSocialActivitySupabaseEndpoint(context);
  const cutoffIso = new Date(Date.now() - SOCIAL_ACTIVITY_EVENT_TTL_HOURS * 60 * 60 * 1000).toISOString();
  const response = await axios.delete(endpoint, {
    headers: buildCatalogSupabaseHeaders(context.authConfig, context.schema),
    params: {
      created_at: `lt.${cutoffIso}`
    },
    timeout: 20_000,
    validateStatus: (status) => status >= 200 && status < 500
  });

  if (response.status === 404) {
    throw new Error(`[SOCIAL_TABLE_NOT_FOUND] Tabela ${context.schema}.${context.table} nao encontrada no Supabase.`);
  }

  if (response.status >= 400) {
    throw new Error(`[SOCIAL_PRUNE_HTTP_${response.status}] Falha ao limpar eventos sociais antigos.`);
  }
}

async function publishSocialGameLaunchActivity(payload = {}) {
  const context = resolveSupabaseSocialActivityContext();
  const actorSteamId = normalizeSteamId(context.userId);
  const actorDisplayName = sanitizeNotificationText(context.userDisplayName, 80) || "Jogador";
  const actorAvatarUrl = sanitizeHttpUrlForToast(context.userAvatarUrl);
  const gameId = sanitizeNotificationText(payload.gameId, 120);
  const gameName = sanitizeNotificationText(payload.gameName, 140) || "Jogo";

  if (!actorSteamId || !gameName) {
    return { ok: false, skipped: true };
  }

  const dedupeGameKey = gameId || gameName.toLowerCase();
  const emitKey = `${actorSteamId}:${dedupeGameKey}`;
  const now = Date.now();
  const lastEmittedAt = Number(socialActivityEmitCache.get(emitKey) || 0);
  if (lastEmittedAt > 0 && now - lastEmittedAt < SOCIAL_ACTIVITY_EMIT_DEBOUNCE_MS) {
    return { ok: true, skipped: true, reason: "debounced" };
  }
  socialActivityEmitCache.set(emitKey, now);
  if (socialActivityEmitCache.size > 400) {
    for (const [key, value] of socialActivityEmitCache.entries()) {
      if (now - Number(value || 0) > SOCIAL_ACTIVITY_EMIT_DEBOUNCE_MS * 8) {
        socialActivityEmitCache.delete(key);
      }
    }
  }

  const endpoint = getSocialActivitySupabaseEndpoint(context);
  const response = await axios.post(
    endpoint,
    {
      actor_steam_id: actorSteamId,
      actor_display_name: actorDisplayName,
      actor_avatar_url: actorAvatarUrl,
      game_id: gameId || null,
      game_name: gameName
    },
    {
      headers: buildCatalogSupabaseHeaders(context.authConfig, context.schema),
      timeout: 20_000,
      validateStatus: (status) => status >= 200 && status < 500
    }
  );

  if (response.status === 404) {
    throw new Error(`[SOCIAL_TABLE_NOT_FOUND] Tabela ${context.schema}.${context.table} nao encontrada no Supabase.`);
  }
  if (response.status >= 400) {
    throw new Error(`[SOCIAL_HTTP_${response.status}] Falha ao publicar atividade social.`);
  }

  await pruneSocialActivityInSupabase(context).catch(() => {});

  return { ok: true };
}

async function listFriendGameActivitiesForCurrentUser(options = {}) {
  const context = resolveSupabaseSocialActivityContext();
  const steamWebApiKey = normalizeSteamWebApiKey(context.authConfig.steamWebApiKey);
  if (!steamWebApiKey) {
    return { entries: [] };
  }

  const friendSteamIds = await getSteamFriendSteamIdsCached(context.userId, steamWebApiKey).catch(() => []);
  if (!Array.isArray(friendSteamIds) || friendSteamIds.length === 0) {
    return { entries: [] };
  }

  const sinceIso = normalizeSocialActivitySince(options?.since);
  const limit = Math.max(1, Math.min(200, parsePositiveInteger(options?.limit) || SOCIAL_ACTIVITY_FETCH_LIMIT));
  const endpoint = getSocialActivitySupabaseEndpoint(context);
  const idChunks = splitIntoChunks(
    friendSteamIds.map((friendId) => normalizeSteamId(friendId)).filter(Boolean),
    80
  );

  const entries = [];
  for (const chunk of idChunks) {
    if (!chunk.length) {
      continue;
    }

    const params = {
      select: "id,actor_steam_id,actor_display_name,actor_avatar_url,game_id,game_name,created_at",
      actor_steam_id: `in.(${chunk.join(",")})`,
      order: "created_at.desc",
      limit
    };
    if (sinceIso) {
      params.created_at = `gt.${sinceIso}`;
    }

    const response = await axios.get(endpoint, {
      headers: buildCatalogSupabaseHeaders(context.authConfig, context.schema),
      params,
      timeout: 20_000,
      validateStatus: (status) => status >= 200 && status < 500
    });

    if (response.status === 404) {
      throw new Error(`[SOCIAL_TABLE_NOT_FOUND] Tabela ${context.schema}.${context.table} nao encontrada no Supabase.`);
    }
    if (response.status >= 400) {
      throw new Error(`[SOCIAL_HTTP_${response.status}] Falha ao carregar atividade social.`);
    }

    const rows = Array.isArray(response.data) ? response.data : [];
    entries.push(...rows.map((row) => mapSupabaseSocialActivityRow(row)).filter(Boolean));
  }

  const dedupedById = new Map();
  for (const entry of entries) {
    if (!entry?.id) {
      continue;
    }
    if (!dedupedById.has(entry.id)) {
      dedupedById.set(entry.id, entry);
    }
  }

  const sorted = [...dedupedById.values()]
    .sort((left, right) => toSocialActivityCreatedAtMs(right) - toSocialActivityCreatedAtMs(left))
    .slice(0, limit);

  return { entries: sorted };
}

async function fetchCatalogEntriesFromSupabase(sourceConfig, localSettings = {}) {
  const authConfig = resolveAuthConfig();
  if (!authConfig.supabaseUrl || !authConfig.supabaseAnonKey) {
    throw new Error("[CATALOG_SUPABASE_AUTH] Supabase nao configurado para catalogo remoto.");
  }

  const tableName = normalizeCatalogIdentifier(sourceConfig.table, CATALOG_DEFAULT_SUPABASE_TABLE);
  const schemaName = normalizeCatalogIdentifier(sourceConfig.schema, CATALOG_DEFAULT_SUPABASE_SCHEMA);
  const endpoint = `${authConfig.supabaseUrl}/rest/v1/${tableName}?select=*`;

  const response = await axios.get(endpoint, {
    headers: buildCatalogSupabaseHeaders(authConfig, schemaName),
    timeout: 20_000,
    validateStatus: (status) => status >= 200 && status < 500
  });

  if (response.status === 404) {
    throw new Error(
      `[CATALOG_SUPABASE_TABLE_NOT_FOUND] Tabela ${schemaName}.${tableName} nao encontrada no Supabase.`
    );
  }

  if (response.status >= 400) {
    throw new Error(
      `[CATALOG_SUPABASE_HTTP_${response.status}] Falha ao carregar catalogo remoto em ${schemaName}.${tableName}.`
    );
  }

  const fallbackGoogleApiKey = String(localSettings.googleApiKey || "").trim();
  const rows = Array.isArray(response.data) ? response.data : [];
  const mappedEntries = rows
    .map((row) => mapSupabaseCatalogRowToEntry(row, fallbackGoogleApiKey))
    .filter((entry) => {
      if (!entry || typeof entry !== "object") return false;
      if (entry.enabled === false) return false;
      return Boolean(String(entry.id || "").trim() || String(entry.name || "").trim());
    });

  return sortCatalogEntries(mappedEntries);
}

async function syncCatalogGameSizeBytesToSupabase(gameId, sizeBytes, sourceConfig) {
  const normalizedGameId = String(gameId || "").trim();
  const normalizedSizeBytes = parseSizeBytes(sizeBytes);
  if (!normalizedGameId || normalizedSizeBytes <= 0) {
    return false;
  }
  if (!sourceConfig || sourceConfig.useRemote !== true) {
    return false;
  }

  const existingInFlight = catalogSizeSyncInFlightByGameId.get(normalizedGameId);
  if (existingInFlight) {
    return existingInFlight;
  }

  const task = (async () => {
    try {
      const authConfig = resolveAuthConfig();
      if (!authConfig.supabaseUrl || !authConfig.supabaseAnonKey) {
        return false;
      }

      const tableName = normalizeCatalogIdentifier(sourceConfig.table, CATALOG_DEFAULT_SUPABASE_TABLE);
      const schemaName = normalizeCatalogIdentifier(sourceConfig.schema, CATALOG_DEFAULT_SUPABASE_SCHEMA);
      const endpoint = `${authConfig.supabaseUrl}/rest/v1/${tableName}`;
      const response = await axios.patch(
        endpoint,
        {
          size_bytes: normalizedSizeBytes
        },
        {
          headers: {
            ...buildCatalogSupabaseHeaders(authConfig, schemaName),
            Prefer: "return=minimal"
          },
          params: {
            id: `eq.${normalizedGameId}`
          },
          timeout: 15_000,
          validateStatus: (status) => status >= 200 && status < 500
        }
      );

      if (response.status === 404) {
        appendStartupLog(`[CATALOG_SIZE_SYNC] tabela nao encontrada para ${schemaName}.${tableName}.`);
        return false;
      }
      if (response.status >= 400) {
        appendStartupLog(
          `[CATALOG_SIZE_SYNC] falha HTTP ${response.status} ao atualizar size_bytes de ${normalizedGameId}.`
        );
        return false;
      }

      if (Array.isArray(remoteCatalogCache.entries)) {
        for (const entry of remoteCatalogCache.entries) {
          if (!entry || String(entry.id || "").trim() !== normalizedGameId) {
            continue;
          }
          entry.sizeBytes = normalizedSizeBytes;
          const currentSizeLabel = String(entry.size || "").trim();
          if (!currentSizeLabel || currentSizeLabel.toLowerCase() === "tamanho nao informado") {
            entry.size = formatBytesShort(normalizedSizeBytes);
          }
        }
      }

      return true;
    } catch (error) {
      appendStartupLog(
        `[CATALOG_SIZE_SYNC] erro ao atualizar size_bytes de ${normalizedGameId}: ${formatStartupErrorForLog(error)}`
      );
      return false;
    }
  })().finally(() => {
    catalogSizeSyncInFlightByGameId.delete(normalizedGameId);
  });

  catalogSizeSyncInFlightByGameId.set(normalizedGameId, task);
  return task;
}

async function resolveCatalogEntries(settings = {}, localEntries = []) {
  const sourceConfig = resolveCatalogSourceConfig(settings);
  const fallbackEntries = Array.isArray(localEntries) ? localEntries : [];

  if (!sourceConfig.useRemote) {
    return {
      entries: fallbackEntries,
      source: "local-json",
      warning: "",
      sourceConfig
    };
  }

  const now = Date.now();
  if (
    Array.isArray(remoteCatalogCache.entries) &&
    remoteCatalogCache.entries.length > 0 &&
    now - remoteCatalogCache.loadedAt < sourceConfig.pollIntervalMs
  ) {
    return {
      entries: remoteCatalogCache.entries,
      source: remoteCatalogCache.source || "supabase-cache",
      warning: remoteCatalogCache.error || "",
      sourceConfig
    };
  }

  if (remoteCatalogInFlight) {
    const pendingResult = await remoteCatalogInFlight;
    return {
      entries: pendingResult.entries,
      source: pendingResult.source,
      warning: pendingResult.warning || "",
      sourceConfig
    };
  }

  remoteCatalogInFlight = (async () => {
    try {
      const remoteEntries = await fetchCatalogEntriesFromSupabase(sourceConfig, settings);
      const hasRemoteEntries = remoteEntries.length > 0;
      if (!hasRemoteEntries && fallbackEntries.length > 0 && !sourceConfig.allowEmptyRemote) {
        const warning =
          "[CATALOG_SUPABASE_EMPTY] Catalogo remoto vazio. Usando games.json como fallback ate existir jogo na tabela.";
        remoteCatalogCache.entries = null;
        remoteCatalogCache.loadedAt = Date.now();
        remoteCatalogCache.source = "local-json-fallback";
        remoteCatalogCache.error = warning;
        remoteCatalogCache.lastSyncAt = Date.now();
        return {
          entries: fallbackEntries,
          source: "local-json-fallback",
          warning
        };
      }

      remoteCatalogCache.entries = remoteEntries;
      remoteCatalogCache.loadedAt = Date.now();
      remoteCatalogCache.source = "supabase-live";
      remoteCatalogCache.error = "";
      remoteCatalogCache.lastSyncAt = Date.now();
      return {
        entries: remoteEntries,
        source: "supabase-live",
        warning: ""
      };
    } catch (error) {
      const warning = String(error?.message || "[CATALOG_SUPABASE_ERROR] Falha ao carregar catalogo remoto.");
      const canUseStaleRemote = Array.isArray(remoteCatalogCache.entries) && remoteCatalogCache.entries.length > 0;
      const canUseLocalFallback = sourceConfig.fallbackToLocalJson && fallbackEntries.length > 0;
      if (canUseStaleRemote) {
        remoteCatalogCache.error = warning;
        return {
          entries: remoteCatalogCache.entries,
          source: "supabase-stale-cache",
          warning
        };
      }
      if (canUseLocalFallback) {
        remoteCatalogCache.error = warning;
        return {
          entries: fallbackEntries,
          source: "local-json-fallback",
          warning
        };
      }
      throw error;
    } finally {
      remoteCatalogInFlight = null;
    }
  })();

  return remoteCatalogInFlight;
}

async function readCatalogBundle() {
  const { settings, entries: localEntries } = await parseLocalCatalogFile();
  const resolvedCatalog = await resolveCatalogEntries(settings, localEntries);
  const entries = Array.isArray(resolvedCatalog.entries) ? resolvedCatalog.entries : [];
  const catalogSourceConfig = resolvedCatalog.sourceConfig || resolveCatalogSourceConfig(settings);

  const globalApiKey = String(
    settings.googleApiKey || process.env.WPLAY_GOOGLE_API_KEY || process.env.WYZER_GOOGLE_API_KEY || ""
  ).trim();
  const defaultExecutable = String(settings.defaultExecutable || "game.exe").trim() || "game.exe";
  const installRoot = normalizeAbsolutePath(settings.installRoot || "");

  const games = entries
    .map((entry, index) => {
      const name = String(entry.name || `Jogo ${index + 1}`).trim() || `Jogo ${index + 1}`;
      const id = String(entry.id || slugifyId(name, `game-${index + 1}`));
      const downloadUrl = String(entry.downloadUrl || "").trim();
      const googleDriveFileId = String(entry.googleDriveFileId || extractDriveId(downloadUrl)).trim();
      const downloadUrls = normalizeStringArray(entry.downloadUrls || entry.mirrors || entry.mirrorUrls || entry.backupUrls);
      const downloadSources = normalizeDownloadSourceEntries(entry.downloadSources || entry.sources || entry.downloadMirrors);
      const localArchiveFile = String(entry.localArchiveFile || "").trim();
      const hasDownloadSource = Boolean(
        downloadUrl || googleDriveFileId || localArchiveFile || downloadUrls.length > 0 || downloadSources.length > 0
      );
      const archivePassword = String(entry.archivePassword || "").trim();
      const checksumSha256 = String(entry.checksumSha256 || entry.sha256 || entry.archiveSha256 || "").trim().toLowerCase();
      const launchExecutable = String(entry.launchExecutable || defaultExecutable).trim() || "game.exe";
      const installDirName = String(entry.installDirName || name).trim() || name;
      const section = String(entry.section || "Jogos gratis").trim() || "Jogos gratis";
      const sizeLabel = String(entry.size || "").trim();
      const sizeBytes = parseSizeBytes(entry.sizeBytes) || parseSizeBytes(sizeLabel);
      const size = sizeLabel || (sizeBytes > 0 ? formatBytesShort(sizeBytes) : "Tamanho nao informado");
      const comingSoon = entry.comingSoon === true || !hasDownloadSource;
      const description = String(entry.description || "Sem descricao.");
      const longDescription = String(entry.longDescription || entry.fullDescription || description || "Sem descricao.");
      const developedBy = normalizeOptionalString(entry.developedBy || entry.developer);
      const publishedBy = normalizeOptionalString(entry.publishedBy || entry.publisher);
      const releaseDate = normalizeOptionalString(entry.releaseDate);
      const trailerUrl = normalizeOptionalString(
        entry.trailerUrl || entry.videoUrl || entry.youtubeUrl || entry.youtube || entry.trailer
      );
      const steamStoreUrl = normalizeOptionalString(
        entry.steamStoreUrl || entry.steam_store_url || entry.storeUrl || entry.store_url
      );
      const steamAppId = parseSteamAppId(
        entry.steamAppId ??
          entry.steam_app_id ??
          entry.steam_appid ??
          entry.steamGameId ??
          entry.steam_game_id ??
          steamStoreUrl
      );
      const requireSteamClient = parseBoolean(
        entry.requireSteamClient ?? entry.require_steam_client ?? entry.steamRequired ?? entry.steam_required,
        steamAppId > 0
      );
      const gallery = normalizeStringArray(entry.gallery || entry.screenshots || entry.images);
      const genres = normalizeStringArray(entry.genres || entry.tags || entry.genre);
      const averagePlayTime = normalizeStatValue(
        entry.averagePlayTime ?? entry.avgPlayTime ?? entry.playTime ?? entry.avgPlayTimeHours ?? entry.playTimeHours
      );
      const averageAchievement = normalizeStatValue(
        entry.averageAchievement ??
          entry.avgAchievement ??
          entry.achievementRate ??
          entry.avgAchievementPercent ??
          entry.achievementPercent ??
          entry.completionRate
      );
      const storeType = normalizeOptionalString(entry.storeType || entry.productType || entry.storeKind || entry.cardKind);
      const storeTag = normalizeOptionalString(entry.storeTag || entry.badge || entry.highlightTag);
      const currentPrice = normalizeStatValue(entry.currentPrice ?? entry.salePrice ?? entry.price);
      const originalPrice = normalizeStatValue(entry.originalPrice ?? entry.listPrice ?? entry.basePrice);
      const discountPercent = normalizeStatValue(entry.discountPercent ?? entry.discount);
      const free = entry.free === true || entry.isFree === true;
      const exclusive = entry.exclusive === true;

      return {
        id,
        name,
        description,
        longDescription,
        section,
        comingSoon,
        hasDownloadSource,
        size,
        sizeBytes,
        archiveType: normalizeArchiveType(entry.archiveType),
        archivePassword,
        checksumSha256,
        downloadUrl,
        downloadUrls,
        downloadSources,
        googleDriveFileId,
        localArchiveFile,
        googleApiKey: String(entry.googleApiKey || globalApiKey || "").trim(),
        installDirName,
        launchExecutable,
        autoDetectExecutable: entry.autoDetectExecutable !== false,
        imageUrl: entry.imageUrl ? String(entry.imageUrl) : "",
        cardImageUrl: entry.cardImageUrl
          ? String(entry.cardImageUrl)
          : entry.bannerUrl
            ? String(entry.bannerUrl)
            : entry.imageUrl
              ? String(entry.imageUrl)
              : "",
        bannerUrl: entry.bannerUrl
          ? String(entry.bannerUrl)
          : entry.cardImageUrl
            ? String(entry.cardImageUrl)
            : entry.imageUrl
              ? String(entry.imageUrl)
              : "",
        logoUrl: entry.logoUrl ? String(entry.logoUrl) : "",
        developedBy,
        publishedBy,
        releaseDate,
        trailerUrl,
        videoUrl: trailerUrl,
        steamAppId: steamAppId > 0 ? steamAppId : 0,
        steamStoreUrl,
        requireSteamClient,
        gallery,
        genres,
        averagePlayTime,
        averageAchievement,
        storeType,
        storeTag,
        currentPrice,
        originalPrice,
        discountPercent,
        free,
        isFree: free,
        exclusive
      };
    });

  return {
    settings: {
      installRoot,
      defaultExecutable,
      googleApiKey: globalApiKey,
      catalogSource: resolvedCatalog.source || "local-json",
      catalogWarning: resolvedCatalog.warning || "",
      catalogPollIntervalSeconds: catalogSourceConfig.pollIntervalSeconds,
      catalogProvider: catalogSourceConfig.useRemote ? "supabase" : "json",
      catalogTable: catalogSourceConfig.table,
      catalogSchema: catalogSourceConfig.schema
    },
    games
  };
}

function getInstallRootCandidates(settings = {}) {
  const candidates = [];
  const runtimeConfig = readRuntimeConfigSync();
  const installBaseDir = normalizeAbsolutePath(runtimeConfig.installBaseDir || "");
  if (installBaseDir) {
    candidates.push(path.join(installBaseDir, INSTALL_ROOT_NAME));
  }

  if (settings.installRoot) {
    candidates.push(settings.installRoot);
  }

  if (process.platform === "win32") {
    const systemDrive = process.env.SystemDrive || "C:";
    candidates.push(path.join(systemDrive, INSTALL_ROOT_NAME));
    candidates.push(`C:\\${INSTALL_ROOT_NAME}`);
  }

  candidates.push(path.join(os.homedir(), INSTALL_ROOT_NAME));
  if (app.isReady()) {
    candidates.push(path.join(app.getPath("downloads"), INSTALL_ROOT_NAME));
  }

  return [...new Set(candidates.map((item) => path.normalize(item)).filter(Boolean))];
}

async function resolveInstallRoot(settings = {}) {
  const candidates = getInstallRootCandidates(settings);
  for (const candidate of candidates) {
    try {
      await fsp.mkdir(candidate, { recursive: true });
      return candidate;
    } catch (_error) {
      // Try next candidate.
    }
  }
  throw new Error("Nao foi possivel criar a pasta C:\\wyzer_games.");
}

function getCurrentInstallRoot(settings = {}) {
  const candidates = getInstallRootCandidates(settings);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0] || (process.platform === "win32" ? "C:\\wyzer_games" : path.join(os.homedir(), INSTALL_ROOT_NAME));
}

function getGameInstallDir(game, installRoot) {
  return path.join(installRoot, sanitizeFolderName(game.installDirName || game.name));
}

async function readInstallManifest(installDir) {
  const filePath = path.join(installDir, MANIFEST_FILE_NAME);
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return null;
  } catch (_error) {
    return null;
  }
}

async function writeInstallManifest(installDir, manifest) {
  const filePath = path.join(installDir, MANIFEST_FILE_NAME);
  await fsp.writeFile(filePath, JSON.stringify(manifest, null, 2), "utf8");
}

function getExecutableNamePreferences(game) {
  const clean = sanitizeFolderName(game.name);
  const noSpaces = clean.replace(/\s+/g, "");
  const slug = slugifyId(game.name, "game");
  const values = [
    "game.exe",
    "launcher.exe",
    "start.exe",
    noSpaces ? `${noSpaces}.exe` : "",
    clean ? `${clean}.exe` : "",
    slug ? `${slug}.exe` : "",
    slug ? `${slug.replace(/-/g, "")}.exe` : ""
  ];
  return [...new Set(values.filter(Boolean).map((item) => item.toLowerCase()))];
}

async function resolveExplicitExecutable(installDir, relativePath) {
  if (!relativePath) return null;
  try {
    const absolutePath = resolveInside(installDir, relativePath);
    if (await pathExists(absolutePath)) {
      return {
        absolutePath,
        relativePath: path.relative(installDir, absolutePath)
      };
    }
    return null;
  } catch (_error) {
    return null;
  }
}

async function autoDetectExecutable(installDir, game) {
  const preferredNames = getExecutableNamePreferences(game);
  const queue = [{ dir: installDir, depth: 0 }];
  const candidates = [];
  let scannedFiles = 0;

  while (queue.length > 0 && scannedFiles < MAX_SCAN_FILES) {
    const item = queue.shift();
    if (!item || item.depth > MAX_SCAN_DEPTH) {
      continue;
    }

    let entries = [];
    try {
      entries = await fsp.readdir(item.dir, { withFileTypes: true });
    } catch (_error) {
      continue;
    }

    for (const entry of entries) {
      if (scannedFiles >= MAX_SCAN_FILES) break;
      scannedFiles += 1;
      const fullPath = path.join(item.dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || entry.name.toLowerCase() === "__macosx") {
          continue;
        }
        queue.push({ dir: fullPath, depth: item.depth + 1 });
        continue;
      }

      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".exe") {
        continue;
      }

      const relativePath = path.relative(installDir, fullPath);
      const lowerName = entry.name.toLowerCase();
      let score = 0;
      const preferredIndex = preferredNames.indexOf(lowerName);

      if (preferredIndex >= 0) {
        score += 220 - preferredIndex * 10;
      }
      score -= item.depth * 6;
      if (item.depth === 0) {
        score += 15;
      }

      const lowerPath = relativePath.toLowerCase();
      if (
        lowerName.includes("unins") ||
        lowerName.includes("uninstall") ||
        lowerName.includes("setup") ||
        lowerPath.includes("\\_redist\\") ||
        lowerPath.includes("\\redist\\") ||
        lowerPath.includes("\\crash")
      ) {
        score -= 140;
      }

      candidates.push({ relativePath, fullPath, score, depth: item.depth });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.relativePath.localeCompare(b.relativePath);
  });

  const winner = candidates[0];
  return {
    absolutePath: winner.fullPath,
    relativePath: winner.relativePath
  };
}

async function resolveGameExecutable(game, installRoot, allowAutoDetect = true) {
  const installDir = getGameInstallDir(game, installRoot);
  if (!(await isDirectory(installDir))) {
    return {
      installDir,
      absolutePath: "",
      relativePath: ""
    };
  }

  const manifest = await readInstallManifest(installDir);
  const explicitCandidates = [
    game.launchExecutable,
    manifest?.lastExecutableRelativePath,
    "game.exe",
    "launcher.exe"
  ].filter(Boolean);

  for (const candidate of explicitCandidates) {
    const resolved = await resolveExplicitExecutable(installDir, candidate);
    if (resolved) {
      if (manifest?.lastExecutableRelativePath !== resolved.relativePath) {
        await writeInstallManifest(installDir, {
          gameId: game.id,
          gameName: game.name,
          installedAt: manifest?.installedAt || new Date().toISOString(),
          lastExecutableRelativePath: resolved.relativePath
        }).catch(() => {});
      }
      return {
        installDir,
        absolutePath: resolved.absolutePath,
        relativePath: resolved.relativePath
      };
    }
  }

  if (!allowAutoDetect || game.autoDetectExecutable === false) {
    return {
      installDir,
      absolutePath: "",
      relativePath: ""
    };
  }

  const detected = await autoDetectExecutable(installDir, game);
  if (detected) {
    await writeInstallManifest(installDir, {
      gameId: game.id,
      gameName: game.name,
      installedAt: manifest?.installedAt || new Date().toISOString(),
      lastExecutableRelativePath: detected.relativePath
    }).catch(() => {});
    return {
      installDir,
      absolutePath: detected.absolutePath,
      relativePath: detected.relativePath
    };
  }

  return {
    installDir,
    absolutePath: "",
    relativePath: ""
  };
}

function buildGoogleApiDownloadUrl(fileId, apiKey) {
  if (!fileId || !apiKey) return "";
  const params = new URLSearchParams({
    alt: "media",
    supportsAllDrives: "true",
    acknowledgeAbuse: "true",
    key: String(apiKey || "").trim()
  });
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`;
}

function detectDownloadKindFromUrl(urlValue) {
  const url = String(urlValue || "").toLowerCase();
  if (!url) return "direct";

  if (
    url.includes("drive.google.com") ||
    url.includes("drive.usercontent.google.com") ||
    url.includes("www.googleapis.com/drive/v3/files")
  ) {
    return "google-drive";
  }

  if (
    url.includes("github.com/") ||
    url.includes("githubusercontent.com") ||
    url.includes("objects.githubusercontent.com")
  ) {
    return "github";
  }

  if (url.includes("dropbox.com")) {
    return "dropbox";
  }

  return "direct";
}

function getDefaultCandidatePriority(kind, urlValue) {
  const normalizedKind = String(kind || "").toLowerCase();
  if (normalizedKind === "github") return 16;
  if (normalizedKind === "direct") return 20;
  if (normalizedKind === "mirror") return 24;
  if (normalizedKind === "dropbox") return 34;
  if (normalizedKind === "google-drive") {
    const value = String(urlValue || "").toLowerCase();
    if (value.includes("drive.usercontent.google.com")) return 90;
    if (value.includes("/uc?export=download")) return 92;
    if (value.includes("www.googleapis.com/drive/v3/files")) return 94;
    return 96;
  }
  return 50;
}

function normalizeDownloadCandidates(game) {
  const candidates = [];
  const seen = new Set();

  const addCandidate = (rawUrl, options = {}) => {
    const url = String(rawUrl || "").trim();
    if (!url) return;

    let parsed;
    try {
      parsed = new URL(url);
    } catch (_error) {
      return;
    }

    if (!["http:", "https:"].includes(parsed.protocol)) return;

    const key = url.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    const kind = String(options.kind || "").trim().toLowerCase() || detectDownloadKindFromUrl(url);
    const priorityRaw = Number(options.priority);
    const priority = Number.isFinite(priorityRaw) ? priorityRaw : getDefaultCandidatePriority(kind, url);

    candidates.push({
      url,
      label: normalizeOptionalString(options.label),
      kind,
      priority
    });
  };

  if (Array.isArray(game.downloadSources)) {
    for (const source of game.downloadSources) {
      addCandidate(source?.url, {
        label: source?.label,
        kind: source?.kind,
        priority: source?.priority
      });
    }
  }

  if (Array.isArray(game.downloadUrls)) {
    for (const url of game.downloadUrls) {
      addCandidate(url, {
        kind: "mirror"
      });
    }
  }

  const directDownloadKind = detectDownloadKindFromUrl(game.downloadUrl);
  addCandidate(game.downloadUrl, {
    label: "download-url",
    kind: directDownloadKind,
    priority: directDownloadKind === "google-drive" ? 91 : 28
  });

  const driveId = game.googleDriveFileId || extractDriveId(game.downloadUrl || "");
  if (driveId) {
    const apiUrl = buildGoogleApiDownloadUrl(driveId, game.googleApiKey);
    if (apiUrl) {
      addCandidate(apiUrl, {
        label: "google-drive-api",
        kind: "google-drive",
        priority: 86
      });
    }

    addCandidate(`https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=t`, {
      label: "google-drive-usercontent",
      kind: "google-drive",
      priority: 90
    });

    addCandidate(`https://drive.google.com/uc?export=download&id=${driveId}`, {
      label: "google-drive-uc",
      kind: "google-drive",
      priority: 92
    });
  }

  candidates.sort((a, b) => a.priority - b.priority);
  return candidates;
}

function getLocalArchiveCandidates(localArchiveFile) {
  const raw = String(localArchiveFile || "").trim();
  if (!raw) return [];

  const value = raw.replace(/\//g, path.sep);
  if (path.isAbsolute(value)) {
    return [path.normalize(value)];
  }

  const candidates = [
    path.resolve(process.cwd(), value),
    path.resolve(app.getAppPath(), value)
  ];

  if (app.isPackaged) {
    candidates.push(path.resolve(path.dirname(process.execPath), value));
    if (process.resourcesPath) {
      candidates.push(path.resolve(process.resourcesPath, value));
    }
  }

  return [...new Set(candidates.map((item) => path.normalize(item)))];
}

async function resolveConfiguredLocalArchivePath(game) {
  const raw = String(game.localArchiveFile || "").trim();
  if (!raw) return "";

  const candidates = getLocalArchiveCandidates(raw);
  for (const candidate of candidates) {
    try {
      const stat = await fsp.stat(candidate);
      if (stat.isFile()) {
        return candidate;
      }
    } catch (_error) {
      // Continue.
    }
  }

  return "";
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"");
}

function normalizeDriveUrlValue(value) {
  return decodeHtmlEntities(String(value || ""))
    .replace(/\\u003d/g, "=")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/");
}

function readHtmlAttributeValue(tagText, attributeName) {
  const tag = String(tagText || "");
  const name = String(attributeName || "").trim();
  if (!tag || !name) return "";

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>` + "`" + `]+))`, "i");
  const match = tag.match(pattern);
  if (!match) return "";
  return String(match[1] ?? match[2] ?? match[3] ?? "").trim();
}

function decodeURIComponentSafe(value) {
  const text = String(value || "");
  if (!text) return "";
  try {
    return decodeURIComponent(text);
  } catch (_error) {
    return text;
  }
}

function mergeCookieHeader(existingCookieHeader, setCookieHeaderValue) {
  const cookieMap = new Map();

  const existing = String(existingCookieHeader || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);
  for (const pair of existing) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex <= 0) continue;
    const name = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (!name) continue;
    cookieMap.set(name, value);
  }

  const setCookieEntries = Array.isArray(setCookieHeaderValue)
    ? setCookieHeaderValue
    : setCookieHeaderValue
      ? [setCookieHeaderValue]
      : [];

  for (const entry of setCookieEntries) {
    const firstPair = String(entry || "").split(";")[0].trim();
    if (!firstPair) continue;
    const separatorIndex = firstPair.indexOf("=");
    if (separatorIndex <= 0) continue;
    const name = firstPair.slice(0, separatorIndex).trim();
    const value = firstPair.slice(separatorIndex + 1).trim();
    if (!name) continue;
    cookieMap.set(name, value);
  }

  return [...cookieMap.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function extractDriveConfirmTokenFromSetCookie(setCookieHeaderValue) {
  const setCookieEntries = Array.isArray(setCookieHeaderValue)
    ? setCookieHeaderValue
    : setCookieHeaderValue
      ? [setCookieHeaderValue]
      : [];

  for (const entry of setCookieEntries) {
    const cookiePair = String(entry || "").split(";")[0].trim();
    if (!cookiePair) continue;
    const match = cookiePair.match(/^download_warning[^=]*=([^;]+)$/i);
    if (!match?.[1]) continue;
    const decoded = decodeURIComponentSafe(match[1]).replace(/^"+|"+$/g, "").trim();
    if (decoded) {
      return decoded;
    }
  }

  return "";
}

function appendDriveResourceKey(urlValue, sourceUrl) {
  const target = String(urlValue || "").trim();
  const source = String(sourceUrl || "").trim();
  if (!target || !source) return target;

  try {
    const targetParsed = new URL(target);
    const sourceParsed = new URL(source);
    const resourceKey = sourceParsed.searchParams.get("resourcekey");
    if (!resourceKey || targetParsed.searchParams.get("resourcekey")) {
      return targetParsed.toString();
    }
    targetParsed.searchParams.set("resourcekey", resourceKey);
    return targetParsed.toString();
  } catch (_error) {
    return target;
  }
}

function buildDriveConfirmUrlFromToken(sourceUrl, driveId, token) {
  const cleanId = String(driveId || "").trim();
  const cleanToken = String(token || "").trim();
  if (!cleanId || !cleanToken) return "";

  const url = new URL("https://drive.google.com/uc");
  url.searchParams.set("export", "download");
  url.searchParams.set("id", cleanId);
  url.searchParams.set("confirm", cleanToken);

  try {
    const sourceParsed = new URL(sourceUrl);
    const resourceKey = sourceParsed.searchParams.get("resourcekey");
    if (resourceKey) {
      url.searchParams.set("resourcekey", resourceKey);
    }
  } catch (_error) {
    // Ignore.
  }

  return url.toString();
}

function detectDriveBlockingReason(bodyText, statusCode = 0) {
  const text = String(bodyText || "");
  const lower = text.toLowerCase();

  if (
    statusCode === 404 ||
    lower.includes("file does not exist") ||
    lower.includes("requested file was not found") ||
    lower.includes("arquivo nao existe")
  ) {
    return "Arquivo do Google Drive nao encontrado ou sem permissao publica.";
  }

  if (
    lower.includes("too many users have viewed or downloaded this file recently") ||
    lower.includes("download quota is exceeded") ||
    lower.includes("quota exceeded") ||
    lower.includes("you can't view or download this file at this time")
  ) {
    return "Google Drive atingiu o limite de downloads deste arquivo. Tente novamente mais tarde.";
  }

  if (lower.includes("can't scan this file for viruses") || lower.includes("virus scan warning")) {
    return "Google Drive exibiu pagina de aviso de virus e nao liberou o download automaticamente.";
  }

  if (
    lower.includes("google drive nao pode fazer a verificacao de virus neste arquivo") ||
    lower.includes("voce ainda quer fazer o download") ||
    lower.includes("fazer o download mesmo assim")
  ) {
    return "Google Drive exibiu pagina de confirmacao de download (arquivo grande).";
  }

  if (statusCode === 403 || lower.includes("access denied")) {
    return "Google Drive negou acesso ao arquivo. Verifique compartilhamento publico e API key.";
  }

  return "";
}

async function readStreamAsText(stream, maxBytes = 2 * 1024 * 1024) {
  let consumed = 0;
  const chunks = [];
  for await (const chunk of stream) {
    consumed += chunk.length;
    if (consumed > maxBytes) {
      throw new Error("Resposta HTML muito grande para processar.");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function buildDriveConfirmUrl(html, sourceUrl) {
  const rawHtml = String(html || "");
  const hrefPatterns = [
    /href=['"](\/uc\?export=download[^'"]+)['"]/i,
    /href=['"](https:\/\/drive\.usercontent\.google\.com\/download[^'"]+)['"]/i,
    /href=['"](https:\/\/drive\.google\.com\/uc\?export=download[^'"]+)['"]/i
  ];
  for (const pattern of hrefPatterns) {
    const match = rawHtml.match(pattern);
    if (!match?.[1]) continue;
    const decoded = normalizeDriveUrlValue(match[1]);
    const absolute = decoded.startsWith("http") ? decoded : `https://drive.google.com${decoded}`;
    return appendDriveResourceKey(absolute, sourceUrl);
  }

  const jsonPatterns = [/"downloadUrl"\s*:\s*"([^"]+)"/i, /'downloadUrl'\s*:\s*'([^']+)'/i];
  for (const pattern of jsonPatterns) {
    const match = rawHtml.match(pattern);
    if (!match?.[1]) continue;
    const decoded = normalizeDriveUrlValue(match[1]);
    if (!decoded.startsWith("http")) continue;
    return appendDriveResourceKey(decoded, sourceUrl);
  }

  const downloadFormBlock =
    rawHtml.match(/<form[^>]*id=['"]download-form['"][^>]*>[\s\S]*?<\/form>/i)?.[0] ||
    rawHtml.match(/<form[^>]*action=['"][^'"]*(?:drive\.usercontent\.google\.com\/download|drive\.google\.com\/uc)[^'"]*['"][^>]*>[\s\S]*?<\/form>/i)?.[0] ||
    rawHtml.match(/<form[^>]*>[\s\S]*?(?:id=['"]uc-download-link['"]|fazer o download mesmo assim|download anyway)[\s\S]*?<\/form>/i)?.[0] ||
    "";

  const downloadFormTag =
    downloadFormBlock.match(/<form[^>]*>/i)?.[0] ||
    rawHtml.match(/<form[^>]*id=['"]download-form['"][^>]*>/i)?.[0] ||
    "";

  const formAction =
    readHtmlAttributeValue(downloadFormTag, "action") ||
    rawHtml.match(/id=['"]download-form['"][^>]*action=['"]([^'"]+)['"]/i)?.[1] ||
    rawHtml.match(/action=['"]([^'"]+)['"][^>]*id=['"]download-form['"]/i)?.[1] ||
    "";

  const formInputs = [];
  const inputSource = downloadFormBlock || rawHtml;
  const inputTags = [...inputSource.matchAll(/<input[^>]*>/gi)];
  for (const tagMatch of inputTags) {
    const tag = String(tagMatch?.[0] || "");
    const name = readHtmlAttributeValue(tag, "name");
    if (!name) continue;
    const value = readHtmlAttributeValue(tag, "value");
    formInputs.push([name, value]);
  }

  const driveId = extractDriveId(sourceUrl);
  if (!driveId) return "";

  if (formAction) {
    const baseValue = normalizeDriveUrlValue(formAction);
    const parsedBase = baseValue.startsWith("http")
      ? new URL(baseValue)
      : new URL(baseValue, "https://drive.google.com");
    const params = new URLSearchParams(parsedBase.search);
    for (const match of formInputs) {
      const name = String(match?.[0] || "").trim();
      if (!name) continue;
      const value = normalizeDriveUrlValue(match?.[1] || "");
      params.set(name, value);
    }
    params.set("id", params.get("id") || driveId);
    params.set("export", "download");
    if (!params.get("confirm")) {
      const confirmValue =
        rawHtml.match(/name=['"]confirm['"][^>]*value=['"]([^'"]+)['"]/i)?.[1] ||
        rawHtml.match(/value=['"]([^'"]+)['"][^>]*name=['"]confirm['"]/i)?.[1];
      if (confirmValue) {
        params.set("confirm", normalizeDriveUrlValue(confirmValue));
      }
    }

    try {
      const sourceParsed = new URL(sourceUrl);
      const resourceKey = sourceParsed.searchParams.get("resourcekey");
      if (resourceKey && !params.get("resourcekey")) {
        params.set("resourcekey", resourceKey);
      }
    } catch (_error) {
      // Ignore invalid source URL parsing.
    }

    parsedBase.search = params.toString();
    return appendDriveResourceKey(parsedBase.toString(), sourceUrl);
  }

  const token =
    rawHtml.match(/[?&]confirm=([0-9A-Za-z_-]+)/i)?.[1] ||
    rawHtml.match(/confirm%3D([0-9A-Za-z_-]+)/i)?.[1] ||
    rawHtml.match(/name=['"]confirm['"][^>]*value=['"]([^'"]+)['"]/i)?.[1];
  if (token) {
    return buildDriveConfirmUrlFromToken(sourceUrl, driveId, normalizeDriveUrlValue(token));
  }

  return "";
}

function getDownloadCandidateLabel(candidate) {
  if (candidate && typeof candidate === "object") {
    const explicit = normalizeOptionalString(candidate.label);
    if (explicit) return explicit;
  }

  const value = String(candidate?.url || candidate || "").toLowerCase();
  if (value.includes("objects.githubusercontent.com") || value.includes("github.com/")) return "github-release";
  if (value.includes("drive.usercontent.google.com")) return "driveusercontent";
  if (value.includes("drive.google.com/uc")) return "drive-uc";
  if (value.includes("www.googleapis.com/drive/v3/files")) return "drive-api";
  if (value.includes("dropbox.com")) return "dropbox";
  return "direct-url";
}

function isGoogleDriveCandidate(candidate) {
  const value = String(candidate?.url || candidate || "").toLowerCase();
  return (
    value.includes("drive.google.com") ||
    value.includes("drive.usercontent.google.com") ||
    value.includes("www.googleapis.com/drive/v3/files")
  );
}

async function createDownloadStream(game, options = {}) {
  const skipSourceUrls = Array.isArray(options.skipSourceUrls) ? options.skipSourceUrls : [];
  const skipped = new Set(skipSourceUrls.map((entry) => String(entry || "").trim().toLowerCase()).filter(Boolean));
  const candidates = normalizeDownloadCandidates(game).filter((candidate) => !skipped.has(String(candidate.url).toLowerCase()));
  if (!candidates.length) {
    throw new Error("Nenhuma fonte de download disponivel para tentativa.");
  }

  let lastError = null;
  const precheckFailures = [];
  const precheckFailedUrls = [];
  const registerFailure = (candidate, reason) => {
    const label = getDownloadCandidateLabel(candidate);
    pushUniqueFailure(precheckFailures, `${label}: ${String(reason || "falha desconhecida").trim()}`);
    const sourceUrl = String(candidate?.url || "").trim();
    if (sourceUrl) {
      pushUniqueFailure(precheckFailedUrls, sourceUrl);
    }
  };

  for (const candidate of candidates) {
    try {
      const response = await axios({
        method: "GET",
        url: candidate.url,
        responseType: "stream",
        maxRedirects: 8,
        timeout: DOWNLOAD_STREAM_TIMEOUT_MS,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        validateStatus: () => true,
        headers: {
          "User-Agent": "WPlay/2.0",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
        }
      });

      if (response.status >= 400) {
        response.data.destroy();
        const statusError = new Error(`HTTP ${response.status}`);
        registerFailure(candidate, `HTTP ${response.status}`);
        lastError = statusError;
        continue;
      }

      const contentType = String(response.headers["content-type"] || "").toLowerCase();
      const disposition = String(response.headers["content-disposition"] || "").toLowerCase();
      const looksLikeHtml = contentType.includes("text/html") && !disposition.includes("attachment");
      const looksLikeJson = contentType.includes("application/json");
      const looksLikePlainText = contentType.includes("text/plain") && !disposition.includes("attachment");
      const isDrive = isGoogleDriveCandidate(candidate);

      if (isDrive && (looksLikeHtml || looksLikeJson || looksLikePlainText)) {
        const driveId = game.googleDriveFileId || extractDriveId(candidate.url);
        if (!driveId) {
          response.data.destroy();
          lastError = new Error("Nao foi possivel extrair o ID do Google Drive.");
          registerFailure(candidate, "id do Drive invalido");
          continue;
        }

        let currentResponse = response;
        let currentUrl = String(candidate.url || "");
        let cookieHeader = mergeCookieHeader("", currentResponse.headers["set-cookie"]);
        const visitedConfirmUrls = new Set([currentUrl.toLowerCase()]);
        let streamResolved = false;

        for (let hop = 0; hop < GOOGLE_DRIVE_MAX_CONFIRM_HOPS; hop += 1) {
          const currentType = String(currentResponse.headers["content-type"] || "").toLowerCase();
          const currentDisposition = String(currentResponse.headers["content-disposition"] || "").toLowerCase();
          const currentIsHtml = currentType.includes("text/html") && !currentDisposition.includes("attachment");
          const currentIsJson = currentType.includes("application/json");
          const currentIsPlainText = currentType.includes("text/plain") && !currentDisposition.includes("attachment");

          if (!currentIsHtml && !currentIsJson && !currentIsPlainText) {
            streamResolved = true;
            return {
              response: currentResponse,
              sourceUrl: candidate.url,
              candidate
            };
          }

          const bodyText = await readStreamAsText(currentResponse.data);
          const driveBlockReason = detectDriveBlockingReason(bodyText, currentResponse.status);
          let confirmUrl = buildDriveConfirmUrl(bodyText, currentUrl);

          if (!confirmUrl) {
            const cookieToken = extractDriveConfirmTokenFromSetCookie(currentResponse.headers["set-cookie"]);
            if (cookieToken) {
              confirmUrl = buildDriveConfirmUrlFromToken(currentUrl, driveId, cookieToken);
            }
          }

          if (!confirmUrl) {
            const fallbackReason = driveBlockReason || "Nao foi possivel confirmar o download no Google Drive.";
            lastError = new Error(fallbackReason);
            registerFailure(candidate, driveBlockReason || "faltou token de confirmacao");
            break;
          }

          confirmUrl = appendDriveResourceKey(confirmUrl, candidate.url);
          const confirmKey = String(confirmUrl || "").toLowerCase();
          if (!confirmKey || visitedConfirmUrls.has(confirmKey)) {
            lastError = new Error("Google Drive entrou em loop de confirmacao de download.");
            registerFailure(candidate, "loop de confirmacao");
            break;
          }
          visitedConfirmUrls.add(confirmKey);

          const confirmedResponse = await axios({
            method: "GET",
            url: confirmUrl,
            responseType: "stream",
            maxRedirects: 8,
            timeout: DOWNLOAD_STREAM_TIMEOUT_MS,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            validateStatus: () => true,
            headers: {
              "User-Agent": "WPlay/2.0",
              "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
              ...(cookieHeader ? { Cookie: cookieHeader } : {})
            }
          });

          cookieHeader = mergeCookieHeader(cookieHeader, confirmedResponse.headers["set-cookie"]);
          currentResponse = confirmedResponse;
          currentUrl = confirmUrl;
        }

        if (!streamResolved) {
          if (!lastError) {
            lastError = new Error("Google Drive nao liberou um arquivo valido para download.");
          }
          registerFailure(candidate, "confirmacao nao concluiu o download");
          if (currentResponse?.data && typeof currentResponse.data.destroy === "function") {
            currentResponse.data.destroy();
          }
          continue;
        }
      }

      if (looksLikeJson && String(candidate.url).includes("www.googleapis.com/drive/v3/files/")) {
        response.data.destroy();
        lastError = new Error("Google Drive API retornou JSON em vez do arquivo.");
        registerFailure(candidate, "resposta JSON sem arquivo");
        continue;
      }

      if (looksLikeHtml) {
        response.data.destroy();
        lastError = new Error("A URL retornou HTML em vez do arquivo. Use link direto para o arquivo (.zip/.rar).");
        registerFailure(candidate, "retorno HTML sem arquivo");
        continue;
      }

      return {
        response,
        sourceUrl: candidate.url,
        candidate,
        precheckFailures: [...precheckFailures],
        precheckFailedUrls: [...precheckFailedUrls]
      };
    } catch (error) {
      registerFailure(candidate, error.message);
      lastError = error;
    }
  }

  if (lastError) {
    const details = compactFailureDetails(precheckFailures).join(" | ");
    const streamError = new Error(
      details
        ? `Nao foi possivel abrir o link de download. Detalhes: ${details}`
        : "Nao foi possivel abrir o link de download."
    );
    streamError.attemptedUrls = candidates.map((candidate) => String(candidate.url || "").trim()).filter(Boolean);
    streamError.precheckFailures = [...precheckFailures];
    throw streamError;
  }
  const streamError = new Error("Nao foi possivel abrir o link de download.");
  streamError.attemptedUrls = candidates.map((candidate) => String(candidate.url || "").trim()).filter(Boolean);
  streamError.precheckFailures = [...precheckFailures];
  throw streamError;
}

function getArchiveExt(game) {
  const archiveType = normalizeArchiveType(game.archiveType);
  if (archiveType === "zip") return ".zip";
  if (archiveType === "rar") return ".rar";
  return ".bin";
}

async function verifyDownloadedChecksum(archivePath, expectedSha256 = "") {
  const expected = String(expectedSha256 || "").trim().toLowerCase();
  if (!expected) return "";
  if (!/^[a-f0-9]{64}$/.test(expected)) {
    throw new Error("checksumSha256 invalido no catalogo. Use hash SHA-256 com 64 caracteres hexadecimais.");
  }

  const hash = crypto.createHash("sha256");
  const stream = fs.createReadStream(archivePath);
  await new Promise((resolve, reject) => {
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", resolve);
  });

  const computed = hash.digest("hex").toLowerCase();
  if (computed !== expected) {
    throw new Error(`Checksum SHA-256 invalido (esperado: ${expected.slice(0, 12)}..., obtido: ${computed.slice(0, 12)}...).`);
  }

  return computed;
}

async function downloadFile({ game, destinationPath, onProgress }) {
  const allCandidates = normalizeDownloadCandidates(game);
  if (!allCandidates.length) {
    throw new Error("Jogo sem fonte de download configurada (downloadUrl/downloadUrls/downloadSources).");
  }

  const triedCandidates = new Set();
  const failures = [];

  while (triedCandidates.size < allCandidates.length) {
    let payload;
    try {
      payload = await createDownloadStream(game, {
        skipSourceUrls: [...triedCandidates]
      });
    } catch (error) {
      const attemptedUrls = Array.isArray(error?.attemptedUrls) ? error.attemptedUrls : [];
      for (const url of attemptedUrls) {
        triedCandidates.add(String(url || "").trim());
      }
      const precheckFailures = Array.isArray(error?.precheckFailures) ? error.precheckFailures : [];
      for (const entry of precheckFailures) {
        pushUniqueFailure(failures, entry);
      }
      if (failures.length > 0) {
        const details = compactFailureDetails(failures).join(" | ");
        throw new Error(`Nao foi possivel abrir links validos de download. ${details}`);
      }
      throw error;
    }

    const { response, sourceUrl, candidate, precheckFailures = [], precheckFailedUrls = [] } = payload;
    for (const entry of precheckFailures) {
      pushUniqueFailure(failures, entry);
    }
    for (const url of precheckFailedUrls) {
      triedCandidates.add(String(url || "").trim());
    }
    const sourceKey = String(sourceUrl || "");
    triedCandidates.add(sourceKey);
    const totalBytes = extractTotalBytesFromHeaders(response.headers);
    let downloadedBytes = 0;
    let lastSampleAt = Date.now();
    let lastSampleBytes = 0;
    let lastSpeedBps = 0;

    response.data.on("data", (chunk) => {
      downloadedBytes += chunk.length;
      const now = Date.now();
      const elapsedMs = Math.max(1, now - lastSampleAt);
      const deltaBytes = Math.max(0, downloadedBytes - lastSampleBytes);
      const instantBps = (deltaBytes * 1000) / elapsedMs;
      if (Number.isFinite(instantBps) && instantBps >= 0) {
        lastSpeedBps = lastSpeedBps > 0 ? lastSpeedBps * 0.62 + instantBps * 0.38 : instantBps;
      }
      lastSampleAt = now;
      lastSampleBytes = downloadedBytes;

      onProgress(downloadedBytes, totalBytes, {
        speedBps: Math.max(0, lastSpeedBps),
        sourceLabel: getDownloadCandidateLabel(candidate),
        sourceUrl
      });
    });

    try {
      await pipeline(response.data, fs.createWriteStream(destinationPath));
      if (totalBytes > 0 && downloadedBytes > 0 && downloadedBytes < totalBytes) {
        throw new Error(`Download incompleto (${downloadedBytes}/${totalBytes} bytes).`);
      }
      await inspectDownloadedArchiveFile(destinationPath, game.archiveType || "zip");
      if (normalizeArchiveType(game.archiveType) !== "none") {
        await testArchiveIntegrity(destinationPath, game);
      }
      return {
        sourceUrl,
        sourceLabel: getDownloadCandidateLabel(candidate),
        totalBytes: totalBytes > 0 ? totalBytes : downloadedBytes,
        downloadedBytes
      };
    } catch (error) {
      await fsp.rm(destinationPath, { force: true }).catch(() => {});
      const label = getDownloadCandidateLabel(candidate || sourceKey);
      pushUniqueFailure(failures, `${label}: ${error.message}`);
    }
  }

  const details = compactFailureDetails(failures).join(" | ");
  throw new Error(`Falha ao baixar um arquivo valido. Detalhes: ${details}`);
}

async function copyLocalArchiveToPath({ sourcePath, destinationPath, onProgress }) {
  const stat = await fsp.stat(sourcePath);
  if (!stat.isFile() || stat.size <= 0) {
    throw new Error(`Arquivo local invalido: ${sourcePath}`);
  }

  let copiedBytes = 0;
  let lastSampleAt = Date.now();
  let lastSampleBytes = 0;
  let lastSpeedBps = 0;
  const input = fs.createReadStream(sourcePath);
  input.on("data", (chunk) => {
    copiedBytes += chunk.length;
    const now = Date.now();
    const elapsedMs = Math.max(1, now - lastSampleAt);
    const deltaBytes = Math.max(0, copiedBytes - lastSampleBytes);
    const instantBps = (deltaBytes * 1000) / elapsedMs;
    if (Number.isFinite(instantBps) && instantBps >= 0) {
      lastSpeedBps = lastSpeedBps > 0 ? lastSpeedBps * 0.62 + instantBps * 0.38 : instantBps;
    }
    lastSampleAt = now;
    lastSampleBytes = copiedBytes;

    onProgress(copiedBytes, stat.size, {
      speedBps: Math.max(0, lastSpeedBps),
      sourceLabel: "arquivo-local",
      sourceUrl: sourcePath
    });
  });

  await pipeline(input, fs.createWriteStream(destinationPath));
  return {
    sourcePath,
    totalBytes: stat.size,
    copiedBytes
  };
}

function detectArchiveTypeFromBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return "";
  }

  const isRarV4 =
    buffer.length >= 7 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x61 &&
    buffer[2] === 0x72 &&
    buffer[3] === 0x21 &&
    buffer[4] === 0x1a &&
    buffer[5] === 0x07 &&
    buffer[6] === 0x00;
  if (isRarV4) return "rar";

  const isRarV5 =
    buffer.length >= 8 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x61 &&
    buffer[2] === 0x72 &&
    buffer[3] === 0x21 &&
    buffer[4] === 0x1a &&
    buffer[5] === 0x07 &&
    buffer[6] === 0x01 &&
    buffer[7] === 0x00;
  if (isRarV5) return "rar";

  const isZip =
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    ((buffer[2] === 0x03 && buffer[3] === 0x04) ||
      (buffer[2] === 0x05 && buffer[3] === 0x06) ||
      (buffer[2] === 0x07 && buffer[3] === 0x08));
  if (isZip) return "zip";

  const isSevenZip =
    buffer.length >= 6 &&
    buffer[0] === 0x37 &&
    buffer[1] === 0x7a &&
    buffer[2] === 0xbc &&
    buffer[3] === 0xaf &&
    buffer[4] === 0x27 &&
    buffer[5] === 0x1c;
  if (isSevenZip) return "7z";

  const isExe = buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a;
  if (isExe) return "exe";

  return "";
}

function looksLikeHtmlOrDriveText(buffer) {
  const probe = buffer.toString("utf8").toLowerCase();
  if (probe.includes("<!doctype html") || probe.includes("<html")) {
    return true;
  }
  if (probe.includes("google drive") && (probe.includes("virus") || probe.includes("download warning"))) {
    return true;
  }
  if (probe.includes("error") && probe.includes("drive")) {
    return true;
  }
  if (probe.includes("too many users have viewed or downloaded this file recently")) {
    return true;
  }
  if (probe.includes("you can't view or download this file at this time")) {
    return true;
  }
  if (probe.includes("quota exceeded") || probe.includes("download quota")) {
    return true;
  }
  if (probe.includes("file does not exist") || probe.includes("requested file was not found")) {
    return true;
  }
  return false;
}

async function inspectDownloadedArchiveFile(archivePath, expectedArchiveType = "zip") {
  let stat;
  try {
    stat = await fsp.stat(archivePath);
  } catch (_error) {
    throw new Error("Arquivo baixado nao foi encontrado no disco.");
  }

  if (!stat.isFile() || stat.size <= 0) {
    throw new Error("Download retornou arquivo vazio.");
  }

  const sampleSize = Math.min(8192, stat.size);
  const handle = await fsp.open(archivePath, "r");
  try {
    const buffer = Buffer.alloc(sampleSize);
    await handle.read(buffer, 0, sampleSize, 0);
    if (looksLikeHtmlOrDriveText(buffer)) {
      throw new Error("Download retornou pagina HTML em vez do arquivo do jogo.");
    }

    const detectedType = detectArchiveTypeFromBuffer(buffer);
    const normalizedExpected = normalizeArchiveType(expectedArchiveType);
    if (normalizedExpected !== "none" && !detectedType) {
      throw new Error("Download nao retornou um arquivo compactado valido.");
    }
    if (normalizedExpected !== "none" && detectedType && detectedType !== normalizedExpected) {
      throw new Error(
        `Tipo de arquivo inesperado (detectado: ${detectedType}, esperado: ${normalizedExpected}).`
      );
    }

    return {
      sizeBytes: stat.size,
      detectedType
    };
  } finally {
    await handle.close().catch(() => {});
  }
}

async function resolveSevenZipExecutablePath() {
  if (sevenZipExecutableCache.path && (await pathExists(sevenZipExecutableCache.path))) {
    return sevenZipExecutableCache.path;
  }

  const archFolder = get7zipArchFolder();
  const candidates = [];
  if (path7za) {
    const directPath = path.normalize(path7za);
    candidates.push(directPath);
    const unpackedPath = asarToUnpackedPath(directPath);
    if (unpackedPath && unpackedPath !== directPath) {
      candidates.push(unpackedPath);
    }
  }

  if (app.isPackaged && process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "7zip-bin", "win", archFolder, "7za.exe"));
    candidates.push(path.join(process.resourcesPath, "bin", "7zip-bin", "win", archFolder, "7za.exe"));
  }

  const tested = [];
  const uniqueCandidates = [...new Set(candidates.filter(Boolean).map((item) => path.normalize(item)))];
  for (const candidate of uniqueCandidates) {
    tested.push(candidate);
    if (!(await pathExists(candidate))) {
      continue;
    }

    const asarPathPattern = /app\.asar[\\/]/i;
    if (asarPathPattern.test(candidate)) {
      const tempDir = path.join(app.getPath("userData"), "bin");
      const tempPath = path.join(tempDir, `7za-${archFolder}.exe`);
      try {
        await fsp.mkdir(tempDir, { recursive: true });
        await fsp.copyFile(candidate, tempPath);
        sevenZipExecutableCache.path = tempPath;
        return tempPath;
      } catch (_error) {
        continue;
      }
    }

    sevenZipExecutableCache.path = candidate;
    return candidate;
  }

  throw new Error(
    `Nao foi possivel localizar o 7za.exe para extrair arquivos. Caminhos testados: ${tested.join(" | ")}`
  );
}

async function resolveWinRarExecutablePath() {
  if (winRarExecutableCache.path && (await pathExists(winRarExecutableCache.path))) {
    return winRarExecutableCache.path;
  }

  if (process.platform !== "win32") {
    return "";
  }

  const roots = [
    process.env.ProgramW6432,
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
    "C:\\Program Files",
    "C:\\Program Files (x86)"
  ]
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
  const uniqueRoots = [...new Set(roots)];

  const executableNames = ["UnRAR.exe", "Rar.exe"];
  const candidates = [];
  for (const root of uniqueRoots) {
    for (const executableName of executableNames) {
      candidates.push(path.join(root, "WinRAR", executableName));
    }
  }

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      winRarExecutableCache.path = candidate;
      return candidate;
    }
  }

  return "";
}

function buildSevenZipPasswordArg(password) {
  const value = String(password || "").trim();
  return value ? `-p${value}` : "";
}

function buildWinRarPasswordArg(password) {
  const value = String(password || "").trim();
  return value ? `-p${value}` : "-p-";
}

function normalizeExtractionErrorMessage(rawOutput, fallback) {
  const output = String(rawOutput || "").trim();
  const lower = output.toLowerCase();
  if (
    lower.includes("incorrect password") ||
    lower.includes("wrong password") ||
    lower.includes("wrong password?") ||
    lower.includes("data error in encrypted file") ||
    lower.includes("can not open encrypted archive")
  ) {
    return "Senha do arquivo RAR invalida. Confira o campo archivePassword no games.json.";
  }
  if (
    lower.includes("enter password") ||
    lower.includes("encrypted header") ||
    lower.includes("headers error")
  ) {
    return "Arquivo RAR protegido por senha. Preencha archivePassword no games.json.";
  }
  if (
    lower.includes("unexpected end of archive") ||
    lower.includes("checksum error") ||
    lower.includes("recovery record is corrupt")
  ) {
    return "Arquivo RAR corrompido ou incompleto. Verifique o download e o checksum.";
  }
  if (
    lower.includes("cannot open the file as archive") ||
    lower.includes("is not archive") ||
    lower.includes("unsupported archive")
  ) {
    return "Falha ao extrair: o arquivo baixado nao e um arquivo compactado valido.";
  }
  return fallback || output;
}

async function runSevenZip(args, fallbackMessage) {
  const sevenZipPath = await resolveSevenZipExecutablePath();
  await new Promise((resolve, reject) => {
    const proc = spawn(sevenZipPath, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let output = "";
    proc.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    proc.on("error", (error) => reject(error));
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const message = normalizeExtractionErrorMessage(
        output,
        `${fallbackMessage} Codigo ${code}. ${output.trim()}`
      );
      reject(new Error(message));
    });
  });
}

async function runWinRar(args, fallbackMessage) {
  const winRarPath = await resolveWinRarExecutablePath();
  if (!winRarPath) {
    throw new Error("WinRAR/UnRAR nao encontrado.");
  }

  const result = await runCommandCapture(winRarPath, args, { timeoutMs: ARCHIVE_TOOL_TIMEOUT_MS });
  if (result.timedOut) {
    throw new Error(`${fallbackMessage} Tempo excedido ao processar o arquivo.`);
  }
  if (result.code !== 0) {
    const message = normalizeExtractionErrorMessage(
      result.output,
      `${fallbackMessage} Codigo ${result.code}. ${String(result.output || "").trim()}`
    );
    throw new Error(message);
  }
}

async function testArchiveIntegrity(archivePath, game) {
  const archiveType = normalizeArchiveType(game?.archiveType || "zip");
  const archivePassword = game?.archivePassword || "";

  if (archiveType === "rar") {
    const winRarPath = await resolveWinRarExecutablePath();
    if (winRarPath) {
      const args = ["t", archivePath, "-idq", buildWinRarPasswordArg(archivePassword)];
      await runWinRar(args, "Arquivo invalido/corrompido (teste RAR).");
      return;
    }
  }

  const args = ["t", archivePath, "-y"];
  const passwordArg = buildSevenZipPasswordArg(archivePassword);
  if (passwordArg) {
    args.push(passwordArg);
  }

  try {
    await runSevenZip(args, "Arquivo invalido/corrompido (teste 7z).");
  } catch (error) {
    const lower = String(error?.message || "").toLowerCase();
    if (
      archiveType === "rar" &&
      (lower.includes("cannot open the file as archive") ||
        lower.includes("nao e um arquivo compactado valido") ||
        lower.includes("unsupported archive"))
    ) {
      throw new Error("Este arquivo RAR nao e compativel com o extrator interno. Instale o WinRAR no Windows ou publique em .zip.");
    }
    throw error;
  }
}

async function extractArchive(archivePath, targetDir, game) {
  const archiveType = normalizeArchiveType(game?.archiveType || "zip");
  const archivePassword = game?.archivePassword || "";

  if (archiveType === "rar") {
    const winRarPath = await resolveWinRarExecutablePath();
    if (winRarPath) {
      const args = ["x", archivePath, `${targetDir}${path.sep}`, "-idq", "-o+", "-y", buildWinRarPasswordArg(archivePassword)];
      await runWinRar(args, "Falha ao extrair arquivo RAR.");
      return;
    }
  }

  const args = ["x", archivePath, `-o${targetDir}`, "-y"];
  const passwordArg = buildSevenZipPasswordArg(archivePassword);
  if (passwordArg) {
    args.push(passwordArg);
  }

  try {
    await runSevenZip(args, "Falha ao extrair arquivo.");
  } catch (error) {
    const lower = String(error?.message || "").toLowerCase();
    if (
      archiveType === "rar" &&
      (lower.includes("cannot open the file as archive") ||
        lower.includes("nao e um arquivo compactado valido") ||
        lower.includes("unsupported archive"))
    ) {
      throw new Error("Nao foi possivel extrair este RAR com o extrator interno. Instale o WinRAR no Windows ou publique em .zip.");
    }
    throw error;
  }
}

function trimProcessOutput(value, maxChars = 320) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 3)}...`;
}

async function runCommandCapture(command, args = [], options = {}) {
  const timeoutMs = Number(options.timeoutMs);
  return await new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let output = "";
    let settled = false;
    let timer = null;

    const finish = (result, asError = false) => {
      if (settled) return;
      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      if (asError) {
        reject(result);
      } else {
        resolve(result);
      }
    };

    proc.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    proc.on("error", (error) => finish(error, true));
    proc.on("close", (code) => {
      finish({
        code: Number.isFinite(Number(code)) ? Number(code) : -1,
        output,
        timedOut: false
      });
    });

    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      timer = setTimeout(() => {
        try {
          proc.kill("SIGTERM");
        } catch (_error) {
          // Ignore.
        }
        setTimeout(() => {
          try {
            proc.kill("SIGKILL");
          } catch (_error) {
            // Ignore.
          }
        }, 1200);
        finish({
          code: -1,
          output,
          timedOut: true
        });
      }, timeoutMs);
    }
  });
}

async function resolveDefenderScannerPath() {
  if (process.platform !== "win32") {
    return "";
  }

  const candidates = [];
  const platformRoot = path.join(process.env.ProgramData || "C:\\ProgramData", "Microsoft", "Windows Defender", "Platform");

  try {
    const entries = await fsp.readdir(platformRoot, { withFileTypes: true });
    const platformFolders = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" }));
    for (const folder of platformFolders) {
      candidates.push(path.join(platformRoot, folder, "MpCmdRun.exe"));
    }
  } catch (_error) {
    // Ignore missing platform folder.
  }

  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  candidates.push(path.join(programFiles, "Windows Defender", "MpCmdRun.exe"));

  for (const candidate of candidates) {
    if (candidate && (await pathExists(candidate))) {
      return candidate;
    }
  }

  return "";
}

async function scanArchiveWithWindowsDefender(archivePath) {
  const scannerPath = await resolveDefenderScannerPath();
  if (!scannerPath) {
    return {
      scanned: false,
      skipped: true,
      reason: "Windows Defender nao encontrado."
    };
  }

  const result = await runCommandCapture(
    scannerPath,
    ["-Scan", "-ScanType", "3", "-File", archivePath, "-DisableRemediation"],
    { timeoutMs: DEFENDER_SCAN_TIMEOUT_MS }
  );

  if (result.timedOut) {
    throw new Error("Verificacao de seguranca expirou no Windows Defender.");
  }

  const output = trimProcessOutput(result.output);
  const lowerOutput = output.toLowerCase();

  if (result.code === 0) {
    return {
      scanned: true,
      skipped: false,
      reason: ""
    };
  }

  if (
    result.code === 2 ||
    lowerOutput.includes("threat") ||
    lowerOutput.includes("malware") ||
    lowerOutput.includes("virus") ||
    lowerOutput.includes("ameac")
  ) {
    throw new Error("Windows Defender detectou possivel ameaca no arquivo baixado.");
  }

  if (lowerOutput.includes("0x800106ba") || lowerOutput.includes("service has stopped")) {
    return {
      scanned: false,
      skipped: true,
      reason: "Servico do Windows Defender indisponivel."
    };
  }

  return {
    scanned: false,
    skipped: true,
    reason: `Verificacao antivirus indisponivel (codigo ${result.code}).`
  };
}

function formatInstallFailure(code, message, hint = "") {
  const cleanCode = String(code || "INSTALL_FAILED").trim().toUpperCase();
  const cleanMessage = String(message || "Falha na instalacao.").trim();
  const cleanHint = String(hint || "").trim();
  if (!cleanHint) {
    return `[${cleanCode}] ${cleanMessage}`;
  }
  return `[${cleanCode}] ${cleanMessage} Dica: ${cleanHint}`;
}

function normalizeInstallFailureMessage(error) {
  const raw = String(error?.message || "Falha inesperada durante a instalacao.")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) {
    return formatInstallFailure("INSTALL_FAILED", "Falha inesperada durante a instalacao.");
  }
  if (/^\[[A-Z0-9_]+\]\s/.test(raw)) {
    return raw;
  }

  const lower = raw.toLowerCase();
  const detailChunk = raw.match(/detalhes:\s*(.+)$/i)?.[1] || "";
  const detailLower = detailChunk.toLowerCase();

  if (lower.includes("este jogo ainda nao esta disponivel para download")) {
    return formatInstallFailure("GAME_UNAVAILABLE", "Este jogo ainda nao esta disponivel para download.");
  }
  if (lower.includes("jogo sem fonte de download configurada")) {
    return formatInstallFailure(
      "SOURCE_NOT_CONFIGURED",
      "Nenhuma fonte de download foi configurada para este jogo.",
      "Preencha downloadUrl/downloadSources/downloadUrls no catalogo de jogos (Supabase ou games.json)."
    );
  }
  if (
    lower.includes("limite de downloads") ||
    lower.includes("download quota") ||
    lower.includes("quota exceeded")
  ) {
    return formatInstallFailure(
      "DRIVE_QUOTA",
      "Google Drive bloqueou temporariamente este arquivo por limite de downloads.",
      "Tente mais tarde ou adicione uma fonte espelho em downloadSources/downloadUrls."
    );
  }
  if (
    lower.includes("sem permissao publica") ||
    lower.includes("google drive negou acesso") ||
    lower.includes("access denied")
  ) {
    return formatInstallFailure(
      "DRIVE_ACCESS",
      "Google Drive negou acesso ao arquivo.",
      "Confirme compartilhamento publico do arquivo e a googleApiKey."
    );
  }
  if (lower.includes("retornou html") || lower.includes("retorno html sem arquivo")) {
    return formatInstallFailure(
      "INVALID_DOWNLOAD_LINK",
      "A fonte retornou uma pagina HTML em vez do arquivo.",
      "Use link direto do arquivo (.zip/.rar) em downloadSources."
    );
  }
  if (
    lower.includes("download incompleto") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    detailLower.includes("timeout")
  ) {
    return formatInstallFailure(
      "DOWNLOAD_INTERRUPTED",
      "O download foi interrompido antes de finalizar.",
      "Verifique conexao e tente uma fonte mais estavel."
    );
  }
  if (lower.includes("falha ao baixar um arquivo valido") || lower.includes("nao foi possivel abrir links validos de download")) {
    const compactDetails = trimProcessOutput(detailChunk, 220);
    if (compactDetails) {
      return `[DOWNLOAD_FAILED] Nao foi possivel baixar um arquivo valido pelas fontes configuradas. Detalhes tecnicos: ${compactDetails}`;
    }
    return formatInstallFailure(
      "DOWNLOAD_FAILED",
      "Nao foi possivel baixar um arquivo valido pelas fontes configuradas.",
      "Confira as URLs de download e adicione uma fonte espelho."
    );
  }
  if (lower.includes("checksum sha-256 invalido")) {
    return formatInstallFailure(
      "CHECKSUM_MISMATCH",
      "O arquivo baixado nao confere com o checksum SHA-256 esperado.",
      "Atualize checksumSha256 para o hash correto do arquivo publicado."
    );
  }
  if (lower.includes("senha do arquivo rar invalida") || lower.includes("rar protegido por senha")) {
    return formatInstallFailure(
      "ARCHIVE_PASSWORD",
      "Falha ao extrair o arquivo por senha invalida ou ausente.",
      "Confira archivePassword no catalogo de jogos (Supabase ou games.json)."
    );
  }
  if (
    lower.includes("instale o winrar") ||
    lower.includes("winrar/unrar nao encontrado") ||
    lower.includes("nao foi possivel extrair este rar com o extrator interno")
  ) {
    return formatInstallFailure(
      "RAR_TOOL_UNSUPPORTED",
      "O extrator interno nao conseguiu processar este arquivo RAR.",
      "Instale WinRAR no Windows ou publique o jogo em .zip."
    );
  }
  if (
    lower.includes("arquivo rar corrompido ou incompleto") ||
    lower.includes("arquivo invalido/corrompido") ||
    lower.includes("arquivo compactado valido") ||
    lower.includes("tipo de arquivo inesperado")
  ) {
    return formatInstallFailure(
      "ARCHIVE_INVALID",
      "O arquivo baixado esta corrompido ou nao corresponde ao tipo configurado.",
      "Revise archiveType e valide o arquivo original."
    );
  }
  if (lower.includes("windows defender detectou")) {
    return formatInstallFailure(
      "SECURITY_THREAT",
      "Windows Defender detectou possivel ameaca no arquivo baixado.",
      "Troque a fonte do arquivo e valide sua origem antes de tentar novamente."
    );
  }
  if (lower.includes("nao encontrei nenhum .exe")) {
    return formatInstallFailure(
      "EXECUTABLE_NOT_FOUND",
      "A instalacao terminou, mas nao foi encontrado executavel para iniciar o jogo.",
      "Ajuste launchExecutable ou verifique a estrutura interna do arquivo."
    );
  }

  return formatInstallFailure("INSTALL_FAILED", raw);
}

function emitInstallProgress(payload) {
  const safePayload = payload && typeof payload === "object" ? { ...payload } : null;
  if (!safePayload) {
    return;
  }

  const gameId = String(safePayload.gameId || "").trim();
  if (!gameId) {
    return;
  }

  const phase = String(safePayload.phase || "").trim().toLowerCase();
  safePayload.gameId = gameId;
  safePayload.phase = phase || "preparing";

  if (ACTIVE_INSTALL_PHASES.has(safePayload.phase)) {
    activeInstallProgressByGameId.set(gameId, safePayload);
  } else {
    activeInstallProgressByGameId.delete(gameId);
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(INSTALL_PROGRESS_CHANNEL, safePayload);
  }
}

async function installGame(gameId) {
  if (isStartupUpdatePending()) {
    throw new Error(
      "Atualizacao do launcher em andamento. Aguarde concluir e o launcher reiniciar antes de instalar jogos."
    );
  }

  if (activeInstalls.has(gameId)) {
    throw new Error("Este jogo ja esta sendo instalado.");
  }

  const task = (async () => {
    const { games, settings } = await readCatalogBundle();
    const game = games.find((entry) => entry.id === gameId);
    if (!game) {
      throw new Error("Jogo nao encontrado no catalogo.");
    }
    if (game.comingSoon || !game.hasDownloadSource) {
      throw new Error("Este jogo ainda nao esta disponivel para download.");
    }

    const installRoot = await resolveInstallRoot(settings);
    const installDir = getGameInstallDir(game, installRoot);
    const tempDir = path.join(installRoot, TEMP_DIR_NAME);
    const safeTempId = slugifyId(game.id, "game");
    const tempArchivePath = path.join(tempDir, `${safeTempId}-${Date.now()}${getArchiveExt(game)}`);
    const localArchivePath = await resolveConfiguredLocalArchivePath(game);
    const installSessionTimestamp = new Date().toISOString();

    await fsp.mkdir(tempDir, { recursive: true });
    await registerActiveInstallSession({
      gameId: game.id,
      gameName: game.name,
      installRoot,
      installDir,
      tempArchivePath,
      phase: "preparing",
      startedAt: installSessionTimestamp,
      updatedAt: installSessionTimestamp
    }).catch(() => {});

    try {
      await fsp.rm(tempArchivePath, { force: true }).catch(() => {});
      await fsp.rm(installDir, { recursive: true, force: true }).catch(() => {});
      await fsp.mkdir(installDir, { recursive: true });

      emitInstallProgress({
        gameId,
        phase: "preparing",
        percent: 0,
        message: "Preparando instalacao..."
      });

      const usingLocalArchive = Boolean(localArchivePath);
      let transferResult = null;

      await updateActiveInstallSessionPhase(gameId, "downloading").catch(() => {});
      emitInstallProgress({
        gameId,
        phase: "downloading",
        percent: 0,
        message: usingLocalArchive ? "Copiando arquivo local..." : "Baixando..."
      });

      if (usingLocalArchive) {
        transferResult = await copyLocalArchiveToPath({
          sourcePath: localArchivePath,
          destinationPath: tempArchivePath,
          onProgress: (copiedBytes, totalBytes, meta = {}) => {
            const percent = totalBytes > 0 ? Math.min(100, Math.round((copiedBytes / totalBytes) * 100)) : 0;
            const speedText = formatTransferSpeedShort(meta.speedBps);
            emitInstallProgress({
              gameId,
              phase: "downloading",
              percent,
              downloadedBytes: copiedBytes,
              totalBytes,
              speedBps: Number(meta.speedBps) || 0,
              sourceLabel: meta.sourceLabel || "arquivo-local",
              message: totalBytes > 0
                ? `Copiando arquivo local... ${percent}%${speedText ? ` - ${speedText}` : ""}`
                : "Copiando arquivo local..."
            });
          }
        });
      } else {
        transferResult = await downloadFile({
          game,
          destinationPath: tempArchivePath,
          onProgress: (downloadedBytes, totalBytes, meta = {}) => {
            const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
            const downloadedMb = (downloadedBytes / 1024 / 1024).toFixed(1);
            const speedText = formatTransferSpeedShort(meta.speedBps);
            emitInstallProgress({
              gameId,
              phase: "downloading",
              percent,
              downloadedBytes,
              totalBytes,
              speedBps: Number(meta.speedBps) || 0,
              sourceLabel: meta.sourceLabel || "",
              message: totalBytes > 0
                ? `Baixando... ${percent}%${speedText ? ` - ${speedText}` : ""}`
                : `Baixando... ${downloadedMb} MB${speedText ? ` - ${speedText}` : ""}`
            });
          }
        });
      }

      if (
        transferResult &&
        parseSizeBytes(transferResult.totalBytes) <= 0 &&
        parseSizeBytes(transferResult.downloadedBytes || transferResult.copiedBytes) > 0
      ) {
        const finalBytes = parseSizeBytes(transferResult.downloadedBytes || transferResult.copiedBytes);
        emitInstallProgress({
          gameId,
          phase: "downloading",
          percent: 100,
          downloadedBytes: finalBytes,
          totalBytes: finalBytes,
          message: "Download finalizado. Preparando extracao..."
        });
      }

      await updateActiveInstallSessionPhase(gameId, "preparing").catch(() => {});
      emitInstallProgress({
        gameId,
        phase: "preparing",
        percent: 86,
        message: "Validando integridade do arquivo..."
      });
      await verifyDownloadedChecksum(tempArchivePath, game.checksumSha256);
      await inspectDownloadedArchiveFile(tempArchivePath, game.archiveType || "zip");

      emitInstallProgress({
        gameId,
        phase: "preparing",
        percent: 92,
        message: "Executando verificacao de seguranca (Windows Defender)..."
      });
      const securityCheck = await scanArchiveWithWindowsDefender(tempArchivePath);
      if (securityCheck.scanned) {
        emitInstallProgress({
          gameId,
          phase: "preparing",
          percent: 94,
          message: "Verificacao de seguranca concluida. Preparando extracao..."
        });
      } else if (securityCheck.skipped) {
        emitInstallProgress({
          gameId,
          phase: "preparing",
          percent: 94,
          message: `Aviso: ${securityCheck.reason} Continuando instalacao...`
        });
      }

      if (game.archiveType === "none") {
        const fallbackExecutable = game.launchExecutable || "game.exe";
        const executableTarget = resolveInside(installDir, fallbackExecutable);
        await fsp.mkdir(path.dirname(executableTarget), { recursive: true });
        await fsp.copyFile(tempArchivePath, executableTarget);
      } else {
        await updateActiveInstallSessionPhase(gameId, "extracting").catch(() => {});
        await testArchiveIntegrity(tempArchivePath, game);
        let extractionPercent = 96;
        emitInstallProgress({
          gameId,
          phase: "extracting",
          percent: extractionPercent,
          message: "Extraindo arquivos..."
        });

        const extractionPulseTimer = setInterval(() => {
          extractionPercent = Math.min(99, extractionPercent + 0.5);
          emitInstallProgress({
            gameId,
            phase: "extracting",
            percent: extractionPercent,
            message: "Extraindo arquivos..."
          });
        }, 900);

        try {
          await extractArchive(tempArchivePath, installDir, game);
        } finally {
          clearInterval(extractionPulseTimer);
        }
      }

      const executable = await resolveGameExecutable(game, installRoot, true);
      if (!executable.absolutePath) {
        throw new Error(
          "Instalou, mas nao encontrei nenhum .exe para iniciar automaticamente. Verifique launchExecutable e a estrutura do arquivo."
        );
      }

      const installedSizeBytes = await calculateDirectorySizeBytes(installDir).catch(() => 0);
      const archiveBytes =
        parseSizeBytes(transferResult?.totalBytes) ||
        parseSizeBytes(transferResult?.downloadedBytes) ||
        parseSizeBytes(transferResult?.copiedBytes);
      const catalogSizeBytes = archiveBytes || installedSizeBytes;
      const sizeMeasuredAt = Date.now();
      const sizeCacheKey = getInstallSizeCacheKey(installDir);
      if (sizeCacheKey && installedSizeBytes > 0) {
        installSizeCache.set(sizeCacheKey, { sizeBytes: installedSizeBytes, measuredAt: sizeMeasuredAt });
      }

      if (catalogSizeBytes > 0 && parseSizeBytes(game.sizeBytes) <= 0) {
        const sourceConfig = resolveCatalogSourceConfig(settings);
        void syncCatalogGameSizeBytesToSupabase(game.id, catalogSizeBytes, sourceConfig);
      }

      await writeInstallManifest(installDir, {
        gameId: game.id,
        gameName: game.name,
        installedAt: new Date().toISOString(),
        lastExecutableRelativePath: executable.relativePath,
        archiveBytes,
        installedSizeBytes,
        sizeMeasuredAt
      }).catch(() => {});

      await clearActiveInstallSession(gameId).catch(() => {});
      emitInstallProgress({
        gameId,
        phase: "completed",
        percent: 100,
        message: "Instalacao concluida!"
      });

      return {
        ok: true,
        installRoot,
        installDir
      };
    } catch (error) {
      await fsp.rm(installDir, { recursive: true, force: true }).catch(() => {});
      const cacheKey = getInstallSizeCacheKey(installDir);
      if (cacheKey) {
        installSizeCache.delete(cacheKey);
      }
      await clearActiveInstallSession(gameId).catch(() => {});
      const normalizedErrorMessage = normalizeInstallFailureMessage(error);
      emitInstallProgress({
        gameId,
        phase: "failed",
        percent: 0,
        message: normalizedErrorMessage
      });
      throw new Error(normalizedErrorMessage);
    } finally {
      await fsp.rm(tempArchivePath, { force: true }).catch(() => {});
    }
  })();

  activeInstalls.set(gameId, task);
  try {
    return await task;
  } finally {
    activeInstalls.delete(gameId);
    activeInstallProgressByGameId.delete(String(gameId || "").trim());
    await clearActiveInstallSession(gameId).catch(() => {});
  }
}

function normalizeExecutableImageName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const base = path.basename(raw);
  if (!base) return "";

  if (process.platform === "win32") {
    if (path.extname(base).toLowerCase() !== ".exe") {
      return `${base}.exe`;
    }
    return base;
  }

  return base.replace(/\.exe$/i, "");
}

function isGenericExecutableName(value) {
  const lower = String(value || "").toLowerCase();
  return ["game.exe", "launcher.exe", "start.exe", "setup.exe"].includes(lower);
}

function normalizeProcessNameForMatch(value) {
  const normalized = normalizeExecutableImageName(value);
  return String(normalized || "").trim().toLowerCase();
}

function parseWindowsTasklistCsvOutput(outputText) {
  const names = new Set();
  const text = String(outputText || "");
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const match = line.match(/^"([^"]+)"/);
    if (!match?.[1]) {
      continue;
    }
    const lowerName = normalizeProcessNameForMatch(match[1]);
    if (lowerName) {
      names.add(lowerName);
    }
  }
  return names;
}

async function listRunningProcessNamesLowerUncached() {
  if (process.platform === "win32") {
    try {
      const result = await runCommandCapture("tasklist", ["/FO", "CSV", "/NH"], { timeoutMs: 7000 });
      if (result?.timedOut) {
        return new Set();
      }
      return parseWindowsTasklistCsvOutput(result?.output || "");
    } catch (_error) {
      return new Set();
    }
  }

  try {
    const result = await runCommandCapture("ps", ["-A", "-o", "comm="], { timeoutMs: 7000 });
    if (result?.timedOut) {
      return new Set();
    }
    const names = new Set();
    const lines = String(result?.output || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    for (const line of lines) {
      const lowerName = normalizeProcessNameForMatch(line);
      if (lowerName) {
        names.add(lowerName);
      }
    }
    return names;
  } catch (_error) {
    return new Set();
  }
}

async function getRunningProcessNamesLower() {
  const now = Date.now();
  if (
    runningProcessCache.namesLower.size > 0 &&
    now - runningProcessCache.fetchedAt >= 0 &&
    now - runningProcessCache.fetchedAt < RUNNING_PROCESS_CACHE_TTL_MS
  ) {
    return runningProcessCache.namesLower;
  }

  const names = await listRunningProcessNamesLowerUncached();
  runningProcessCache.fetchedAt = now;
  runningProcessCache.namesLower = names;
  return names;
}

async function terminateWindowsProcessByImageName(imageName) {
  return new Promise((resolve) => {
    const args = ["/IM", imageName, "/F", "/T"];
    const proc = spawn("taskkill", args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let output = "";
    proc.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    proc.on("error", () => {
      resolve({ imageName, closed: false, message: "" });
    });

    proc.on("close", (code) => {
      const lower = output.toLowerCase();
      const notRunning =
        lower.includes("not found") ||
        lower.includes("nenhuma inst") ||
        lower.includes("no running instance") ||
        lower.includes("nao existe") ||
        lower.includes("nao existe");

      resolve({
        imageName,
        closed: code === 0,
        message: notRunning ? "" : output.trim()
      });
    });
  });
}

async function terminateUnixProcessByImageName(imageName) {
  return new Promise((resolve) => {
    const proc = spawn("pkill", ["-f", imageName], {
      stdio: ["ignore", "ignore", "ignore"]
    });

    proc.on("error", () => resolve({ imageName, closed: false, message: "" }));
    proc.on("close", (code) => {
      resolve({ imageName, closed: code === 0, message: "" });
    });
  });
}

async function terminateProcessByImageName(imageName) {
  if (!imageName) return { imageName: "", closed: false, message: "" };
  if (process.platform === "win32") {
    return terminateWindowsProcessByImageName(imageName);
  }
  return terminateUnixProcessByImageName(imageName);
}

async function collectExecutableImageNamesForGame(game, installRootCandidates) {
  const strictNames = new Set();
  const fallbackNames = new Set();

  const addImageName = (collection, rawValue) => {
    const normalized = normalizeExecutableImageName(rawValue);
    if (normalized) {
      collection.add(normalized);
    }
  };

  addImageName(fallbackNames, game.launchExecutable);

  for (const installRoot of installRootCandidates) {
    const installDir = getGameInstallDir(game, installRoot);
    if (!(await isDirectory(installDir))) {
      continue;
    }

    const manifest = await readInstallManifest(installDir);
    addImageName(strictNames, manifest?.lastExecutableRelativePath);

    const resolved = await resolveGameExecutable(game, installRoot, true);
    addImageName(strictNames, resolved.relativePath);
    addImageName(strictNames, resolved.absolutePath);
  }

  const ordered = [...strictNames];
  for (const fallbackName of fallbackNames) {
    if (strictNames.has(fallbackName)) {
      continue;
    }
    if (isGenericExecutableName(fallbackName)) {
      continue;
    }
    ordered.push(fallbackName);
  }

  if (ordered.length === 0) {
    ordered.push(...fallbackNames);
  }

  return [...new Set(ordered)];
}

function getProcessCandidatesForInstalledGame(game, executable, manifest) {
  const allCandidates = new Set();
  const add = (rawValue) => {
    const normalized = normalizeExecutableImageName(rawValue);
    if (normalized) {
      allCandidates.add(normalized);
    }
  };

  add(game?.launchExecutable);
  add(manifest?.lastExecutableRelativePath);
  add(executable?.relativePath);
  add(executable?.absolutePath);

  const strictCandidates = [...allCandidates].filter((name) => !isGenericExecutableName(name));
  if (strictCandidates.length > 0) {
    return strictCandidates;
  }
  return [...allCandidates];
}

async function tryTerminateGameProcesses(game, installRootCandidates) {
  const executableImageNames = await collectExecutableImageNamesForGame(game, installRootCandidates);
  const closedProcesses = [];

  for (const imageName of executableImageNames) {
    const result = await terminateProcessByImageName(imageName);
    if (result.closed) {
      closedProcesses.push(imageName);
    }
  }

  return closedProcesses;
}

async function uninstallGame(gameId) {
  if (activeInstalls.has(gameId)) {
    throw new Error("Este jogo esta instalando agora. Aguarde para desinstalar.");
  }

  if (activeUninstalls.has(gameId)) {
    throw new Error("Este jogo ja esta sendo desinstalado.");
  }

  activeUninstalls.add(gameId);
  try {
    const { games, settings } = await readCatalogBundle();
    const game = games.find((entry) => entry.id === gameId);
    if (!game) {
      throw new Error("Jogo nao encontrado no catalogo.");
    }

    const installRootCandidates = getInstallRootCandidates(settings);
    const closedProcesses = await tryTerminateGameProcesses(game, installRootCandidates).catch(() => []);
    const removedDirs = [];

    for (const installRoot of installRootCandidates) {
      const installDir = getGameInstallDir(game, installRoot);
      if (!(await isDirectory(installDir))) {
        continue;
      }
      await fsp.rm(installDir, { recursive: true, force: true });
      const cacheKey = getInstallSizeCacheKey(installDir);
      if (cacheKey) {
        installSizeCache.delete(cacheKey);
      }
      removedDirs.push(installDir);
    }

    return {
      ok: true,
      removedDirs,
      closedProcesses
    };
  } finally {
    activeUninstalls.delete(gameId);
  }
}

function getSteamSessionSnapshot() {
  const stored = readPersistedAuthSessionSync();
  if (!stored || typeof stored !== "object") {
    return null;
  }

  const provider = String(stored.provider || stored.user?.provider || "").toLowerCase();
  if (provider !== "steam") {
    return null;
  }

  const steamId = normalizeSteamId(stored.steamId || stored.user?.id);
  if (!steamId) {
    return null;
  }

  return {
    steamId,
    user: stored.user || null
  };
}

function ensureSteamUserCacheScope(steamId) {
  const normalizedSteamId = normalizeSteamId(steamId);
  if (!normalizedSteamId) {
    clearSteamUserDataCache();
    return;
  }
  if (steamUserDataCache.steamId && steamUserDataCache.steamId !== normalizedSteamId) {
    clearSteamUserDataCache();
  }
  if (!steamUserDataCache.steamId) {
    steamUserDataCache.steamId = normalizedSteamId;
  }
}

function parseSteamAppId(value) {
  const direct = parsePositiveInteger(value);
  if (direct > 0) {
    return direct;
  }

  const text = String(value || "").trim();
  if (!text) {
    return 0;
  }

  try {
    const parsedUrl = new URL(text);
    const fromQuery = parsePositiveInteger(parsedUrl.searchParams.get("appid"));
    if (fromQuery > 0) {
      return fromQuery;
    }

    const pathname = String(parsedUrl.pathname || "");
    const appPathMatch = pathname.match(/\/app\/(\d+)/i);
    if (appPathMatch?.[1]) {
      const fromPath = parsePositiveInteger(appPathMatch[1]);
      if (fromPath > 0) {
        return fromPath;
      }
    }
  } catch (_error) {
    // Not a URL, fallback to regex extraction below.
  }

  const genericMatch = text.match(/(?:^|[^\d])(\d{3,10})(?:[^\d]|$)/);
  if (genericMatch?.[1]) {
    const extracted = parsePositiveInteger(genericMatch[1]);
    if (extracted > 0) {
      return extracted;
    }
  }

  return 0;
}

function resolveSteamAppIdForGame(game) {
  if (!game || typeof game !== "object") {
    return 0;
  }

  const candidates = [
    game.steamAppId,
    game.steam_app_id,
    game.steamGameId,
    game.steam_game_id,
    game.steamStoreUrl,
    game.steam_store_url,
    game.storeUrl,
    game.store_url,
    game.website,
    game.url
  ];

  for (const candidate of candidates) {
    const appId = parseSteamAppId(candidate);
    if (appId > 0) {
      return appId;
    }
  }

  return 0;
}

async function isSteamClientRunning() {
  const runningProcessNamesLower = await getRunningProcessNamesLower();
  for (const candidate of STEAM_CLIENT_PROCESS_NAMES) {
    if (runningProcessNamesLower.has(candidate)) {
      return true;
    }
  }
  return false;
}

async function fetchSteamOwnedGamesByAppId(steamId, steamWebApiKey) {
  const endpoint = `${STEAM_API_BASE_URL}/IPlayerService/GetOwnedGames/v0001/`;
  const response = await axios.get(endpoint, {
    params: {
      key: steamWebApiKey,
      steamid: steamId,
      include_played_free_games: 1,
      include_appinfo: 0,
      format: "json"
    },
    timeout: 20_000,
    validateStatus: (status) => status >= 200 && status < 500
  });

  if (response.status >= 400) {
    throw new Error(`[STEAM_OWNED_GAMES_HTTP_${response.status}]`);
  }

  const games = Array.isArray(response.data?.response?.games) ? response.data.response.games : [];
  const map = new Map();
  for (const game of games) {
    const appId = parseSteamAppId(game?.appid);
    if (!appId) continue;
    const playtimeMinutes = parsePositiveInteger(game?.playtime_forever);
    map.set(appId, playtimeMinutes);
  }
  return map;
}

async function getSteamOwnedGamesByAppIdCached(steamId, steamWebApiKey) {
  ensureSteamUserCacheScope(steamId);
  const ownedGamesMap =
    steamUserDataCache.ownedGamesByAppId instanceof Map ? steamUserDataCache.ownedGamesByAppId : new Map();
  const hasOwnedGames = ownedGamesMap.size > 0;
  const effectiveTtlMs = hasOwnedGames ? STEAM_OWNED_GAMES_CACHE_TTL_MS : STEAM_EMPTY_CACHE_RETRY_MS;
  const cacheAge = Date.now() - Number(steamUserDataCache.ownedGamesFetchedAt || 0);
  const hasFreshCache = cacheAge >= 0 && cacheAge < effectiveTtlMs;

  if (hasFreshCache) {
    return ownedGamesMap;
  }

  if (steamUserDataCache.ownedGamesInFlight) {
    return steamUserDataCache.ownedGamesInFlight;
  }

  steamUserDataCache.ownedGamesInFlight = fetchSteamOwnedGamesByAppId(steamId, steamWebApiKey)
    .then((ownedGamesMap) => {
      steamUserDataCache.ownedGamesByAppId = ownedGamesMap;
      steamUserDataCache.ownedGamesFetchedAt = Date.now();
      return ownedGamesMap;
    })
    .catch((error) => {
      if (!(steamUserDataCache.ownedGamesByAppId instanceof Map)) {
        steamUserDataCache.ownedGamesByAppId = new Map();
      }
      steamUserDataCache.ownedGamesFetchedAt = Date.now();
      if (steamUserDataCache.ownedGamesByAppId.size > 0) {
        return steamUserDataCache.ownedGamesByAppId;
      }
      throw error;
    })
    .finally(() => {
      steamUserDataCache.ownedGamesInFlight = null;
    });

  return steamUserDataCache.ownedGamesInFlight;
}

async function fetchSteamAchievementPercent(steamId, appId, steamWebApiKey) {
  const endpoint = `${STEAM_API_BASE_URL}/ISteamUserStats/GetPlayerAchievements/v0001/`;
  const response = await axios.get(endpoint, {
    params: {
      key: steamWebApiKey,
      steamid: steamId,
      appid: appId
    },
    timeout: 20_000,
    validateStatus: (status) => status >= 200 && status < 500
  });

  if (response.status >= 400) {
    throw new Error(`[STEAM_ACHIEV_HTTP_${response.status}]`);
  }

  const playerstats = response.data?.playerstats || {};
  const success = playerstats?.success !== false;
  if (!success) {
    return null;
  }

  const achievements = Array.isArray(playerstats?.achievements) ? playerstats.achievements : [];
  if (!achievements.length) {
    return null;
  }

  const unlocked = achievements.filter((entry) => Number(entry?.achieved) === 1 || entry?.achieved === true).length;
  const percent = (unlocked / achievements.length) * 100;
  if (!Number.isFinite(percent)) {
    return null;
  }
  return Math.max(0, Math.min(100, percent));
}

async function getSteamAchievementPercentCached(steamId, appId, steamWebApiKey) {
  ensureSteamUserCacheScope(steamId);
  const safeAppId = parseSteamAppId(appId);
  if (!safeAppId) {
    return null;
  }

  const current = steamUserDataCache.achievementsByAppId.get(safeAppId);
  const currentAge = Date.now() - Number(current?.fetchedAt || 0);
  const hasCurrentValue = Number.isFinite(current?.percent);
  const effectiveTtlMs = hasCurrentValue ? STEAM_ACHIEVEMENTS_CACHE_TTL_MS : STEAM_EMPTY_CACHE_RETRY_MS;
  if (current && currentAge >= 0 && currentAge < effectiveTtlMs) {
    return Number.isFinite(current.percent) ? current.percent : null;
  }

  const inFlight = steamUserDataCache.achievementsInFlight.get(safeAppId);
  if (inFlight) {
    return inFlight;
  }

  const nextPromise = fetchSteamAchievementPercent(steamId, safeAppId, steamWebApiKey)
    .then((percent) => {
      steamUserDataCache.achievementsByAppId.set(safeAppId, {
        percent: Number.isFinite(percent) ? percent : null,
        fetchedAt: Date.now()
      });
      return Number.isFinite(percent) ? percent : null;
    })
    .catch((_error) => {
      steamUserDataCache.achievementsByAppId.set(safeAppId, {
        percent: null,
        fetchedAt: Date.now()
      });
      return null;
    })
    .finally(() => {
      steamUserDataCache.achievementsInFlight.delete(safeAppId);
    });

  steamUserDataCache.achievementsInFlight.set(safeAppId, nextPromise);
  return nextPromise;
}

async function applySteamStatsToCatalogGames(games = []) {
  if (!Array.isArray(games) || games.length === 0) {
    return [];
  }

  const authConfig = resolveAuthConfig();
  const steamWebApiKey = normalizeSteamWebApiKey(authConfig.steamWebApiKey);
  if (!steamWebApiKey) {
    return games;
  }

  const steamSession = getSteamSessionSnapshot();
  if (!steamSession?.steamId) {
    return games;
  }

  ensureSteamUserCacheScope(steamSession.steamId);

  const appIds = [...new Set(games.map((game) => resolveSteamAppIdForGame(game)).filter((value) => value > 0))];
  if (appIds.length === 0) {
    return games;
  }

  const safeAppIds = appIds.slice(0, 40);
  let ownedGamesByAppId = new Map();
  try {
    ownedGamesByAppId = await getSteamOwnedGamesByAppIdCached(steamSession.steamId, steamWebApiKey);
  } catch (_error) {
    ownedGamesByAppId = new Map();
  }

  const achievementByAppId = new Map();
  await Promise.all(
    safeAppIds.map(async (appId) => {
      const percent = await getSteamAchievementPercentCached(steamSession.steamId, appId, steamWebApiKey);
      if (Number.isFinite(percent)) {
        achievementByAppId.set(appId, percent);
      }
    })
  );

  return games.map((game) => {
    const appId = resolveSteamAppIdForGame(game);
    if (!appId) {
      return game;
    }

    const hasOwnedGame = ownedGamesByAppId.has(appId);
    const playtimeMinutesRaw = Number(ownedGamesByAppId.get(appId));
    const playtimeMinutes = Number.isFinite(playtimeMinutesRaw) && playtimeMinutesRaw >= 0 ? Math.floor(playtimeMinutesRaw) : 0;
    const playtimeHours = playtimeMinutes / 60;
    const achievementPercent = achievementByAppId.get(appId);
    const hasPlaytime = hasOwnedGame;
    const hasAchievement = Number.isFinite(achievementPercent);

    if (!hasPlaytime && !hasAchievement) {
      return game;
    }

    return {
      ...game,
      userPlayTimeMinutes: hasPlaytime ? playtimeMinutes : null,
      userPlayTimeHours: hasPlaytime ? playtimeHours : null,
      userAchievementPercent: hasAchievement ? achievementPercent : null,
      averagePlayTime: hasPlaytime ? playtimeHours : game.averagePlayTime,
      averageAchievement: hasAchievement ? achievementPercent : game.averageAchievement
    };
  });
}

function resolveGamesStatusRequestOptions(rawOptions = {}) {
  const options = rawOptions && typeof rawOptions === "object" ? rawOptions : {};
  const lowSpecHost = resolveHostLowSpecProfile();
  const lightweightRequested = options.lightweight === true;
  const forceFullRequested = options.lightweight === false;
  const lightweight = lightweightRequested || (lowSpecHost && !forceFullRequested);

  return {
    lightweight,
    includeSteamStats: options.includeSteamStats === true && !lightweight,
    includeRunningState: options.includeRunningState !== false,
    measureInstalledSize: options.measureInstalledSize === true || !lightweight,
    persistMeasuredSize: options.persistMeasuredSize !== false && !lightweight
  };
}

async function getGamesWithStatus(rawOptions = {}) {
  const requestOptions = resolveGamesStatusRequestOptions(rawOptions);
  const { games, settings } = await readCatalogBundle();
  const installRoot = getCurrentInstallRoot(settings);
  const runningProcessNamesLower = requestOptions.includeRunningState ? await getRunningProcessNamesLower() : new Set();

  const gamesWithStatus = await Promise.all(
    games.map(async (game) => {
      const executable = await resolveGameExecutable(game, installRoot, false);
      const installed = Boolean(executable.absolutePath);
      let resolvedSizeBytes = parseSizeBytes(game.sizeBytes);
      let running = false;
      let manifest = null;

      if (installed) {
        manifest = await readInstallManifest(executable.installDir);
        const installedSnapshot = await getInstalledSizeSnapshot(executable.installDir, manifest, {
          skipMeasurement: !requestOptions.measureInstalledSize
        });
        if (installedSnapshot.sizeBytes > 0) {
          resolvedSizeBytes = installedSnapshot.sizeBytes;
        }

        const manifestSizeBytes = parseSizeBytes(manifest?.installedSizeBytes);
        const manifestMeasuredAt = Number(manifest?.sizeMeasuredAt || 0);
        const shouldPersistSize =
          requestOptions.persistMeasuredSize &&
          installedSnapshot.sizeBytes > 0 &&
          (manifestSizeBytes !== installedSnapshot.sizeBytes || manifestMeasuredAt !== installedSnapshot.measuredAt);

        if (shouldPersistSize) {
          await writeInstallManifest(executable.installDir, {
            ...(manifest && typeof manifest === "object" ? manifest : {}),
            gameId: game.id,
            gameName: game.name,
            installedAt: manifest?.installedAt || new Date().toISOString(),
            lastExecutableRelativePath:
              executable.relativePath || manifest?.lastExecutableRelativePath || game.launchExecutable,
            installedSizeBytes: installedSnapshot.sizeBytes,
            sizeMeasuredAt: installedSnapshot.measuredAt
          }).catch(() => {});
        }

        if (requestOptions.includeRunningState) {
          const processCandidates = getProcessCandidatesForInstalledGame(game, executable, manifest)
            .map((value) => normalizeProcessNameForMatch(value))
            .filter(Boolean);
          running = processCandidates.some((candidate) => runningProcessNamesLower.has(candidate));
        }
      }

      const resolvedSize = resolvedSizeBytes > 0 ? formatBytesShort(resolvedSizeBytes) : game.size;
      return {
        ...game,
        size: resolvedSize,
        sizeBytes: resolvedSizeBytes,
        installedSizeBytes: installed ? resolvedSizeBytes : 0,
        installed,
        running,
        installDir: executable.installDir,
        installRoot
      };
    })
  );

  if (!requestOptions.includeSteamStats) {
    return gamesWithStatus;
  }

  const gamesWithSteamStats = await applySteamStatsToCatalogGames(gamesWithStatus);
  return gamesWithSteamStats;
}

async function openInstallFolder() {
  const { settings } = await readCatalogBundle();
  const installRoot = await resolveInstallRoot(settings);
  const openResult = await shell.openPath(installRoot);
  if (openResult) {
    throw new Error(openResult);
  }
  return installRoot;
}

async function openExternalUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) {
    throw new Error("[OPEN_EXTERNAL_URL] URL vazia.");
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch (_error) {
    throw new Error("[OPEN_EXTERNAL_URL] URL invalida.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("[OPEN_EXTERNAL_URL] Protocolo nao suportado. Use http/https.");
  }

  await shell.openExternal(parsed.toString());
  return true;
}

async function openSteamClient() {
  try {
    await shell.openExternal("steam://open/main");
    return { ok: true };
  } catch (_error) {
    throw new Error("[STEAM_OPEN_FAILED] Nao foi possivel abrir a Steam automaticamente.");
  }
}

function isYoutubeHost(hostname) {
  const host = String(hostname || "").toLowerCase().trim();
  if (!host) return false;
  return (
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtu.be" ||
    host === "youtube-nocookie.com" ||
    host.endsWith(".youtube-nocookie.com")
  );
}

function isAllowedYoutubeWebviewNavigation(urlValue) {
  const value = String(urlValue || "").trim();
  if (!value) return false;

  try {
    const parsed = new URL(value);
    if (!isYoutubeHost(parsed.hostname)) {
      return false;
    }
    const pathValue = String(parsed.pathname || "");
    return pathValue === "/embed" || pathValue.startsWith("/embed/");
  } catch (_error) {
    return false;
  }
}

async function openGameInstallFolder(gameId) {
  const { games, settings } = await readCatalogBundle();
  const game = games.find((entry) => entry.id === gameId);
  if (!game) {
    throw new Error("Jogo nao encontrado no catalogo.");
  }

  const installRootCandidates = getInstallRootCandidates(settings);
  for (const installRoot of installRootCandidates) {
    const installDir = getGameInstallDir(game, installRoot);
    if (!(await isDirectory(installDir))) {
      continue;
    }

    const openResult = await shell.openPath(installDir);
    if (openResult) {
      throw new Error(openResult);
    }
    return installDir;
  }

  throw new Error("Este jogo ainda nao foi instalado.");
}

async function getInstallRootPath() {
  const { settings } = await readCatalogBundle();
  return getCurrentInstallRoot(settings);
}

async function chooseInstallBaseDirectory() {
  const { settings } = await readCatalogBundle();
  const currentInstallRoot = getCurrentInstallRoot(settings);
  const currentBaseDir = path.dirname(currentInstallRoot);

  const picked = await dialog.showOpenDialog(mainWindow, {
    title: `Escolha o diretorio base para ${INSTALL_ROOT_NAME}`,
    defaultPath: currentBaseDir,
    properties: ["openDirectory", "createDirectory"]
  });

  if (picked.canceled || !picked.filePaths?.[0]) {
    return {
      canceled: true,
      installRoot: currentInstallRoot
    };
  }

  const selectedBaseDir = normalizeAbsolutePath(picked.filePaths[0]);
  if (!selectedBaseDir) {
    throw new Error("Diretorio invalido.");
  }

  const nextInstallRoot = path.join(selectedBaseDir, INSTALL_ROOT_NAME);
  await writeRuntimeConfig({
    installBaseDir: selectedBaseDir,
    updatedAt: new Date().toISOString()
  });

  return {
    canceled: false,
    installBaseDir: selectedBaseDir,
    installRoot: nextInstallRoot
  };
}

async function playGame(gameId) {
  const { games, settings } = await readCatalogBundle();
  const game = games.find((entry) => entry.id === gameId);
  if (!game) {
    throw new Error("Jogo nao encontrado no catalogo.");
  }

  const installRoot = getCurrentInstallRoot(settings);
  const installDir = getGameInstallDir(game, installRoot);
  if (!(await isDirectory(installDir))) {
    throw new Error("Este jogo ainda nao foi instalado.");
  }

  const executable = await resolveGameExecutable(game, installRoot, true);
  if (!executable.absolutePath) {
    throw new Error("Nao consegui localizar o executavel automaticamente. Reinstale o jogo com zip contendo game.exe.");
  }

  const manifest = await readInstallManifest(installDir);
  const processCandidates = getProcessCandidatesForInstalledGame(game, executable, manifest)
    .map((value) => normalizeProcessNameForMatch(value))
    .filter(Boolean);
  if (processCandidates.length > 0) {
    const runningProcessNamesLower = await getRunningProcessNamesLower();
    const alreadyRunning = processCandidates.some((name) => runningProcessNamesLower.has(name));
    if (alreadyRunning) {
      return {
        ok: true,
        alreadyRunning: true
      };
    }
  }

  const resolvedSteamAppId = resolveSteamAppIdForGame(game);
  const requiresSteamClient = parseBoolean(game.requireSteamClient, resolvedSteamAppId > 0);
  if (requiresSteamClient) {
    const steamRunning = await isSteamClientRunning().catch(() => false);
    if (!steamRunning) {
      throw new Error(
        `[STEAM_NOT_RUNNING] A Steam nao esta aberta. Abra o cliente Steam e tente iniciar ${game.name} novamente.`
      );
    }
  }

  const launchResult = await shell.openPath(executable.absolutePath);
  if (launchResult) {
    throw new Error(launchResult);
  }

  runningProcessCache.fetchedAt = 0;
  runningProcessCache.namesLower = new Set();

  void publishSocialGameLaunchActivity({
    gameId: game.id,
    gameName: game.name
  }).catch(() => {});

  return {
    ok: true
  };
}

async function closeGame(gameId) {
  const { games, settings } = await readCatalogBundle();
  const game = games.find((entry) => entry.id === gameId);
  if (!game) {
    throw new Error("Jogo nao encontrado no catalogo.");
  }

  const installRootCandidates = getInstallRootCandidates(settings);
  const closedProcesses = await tryTerminateGameProcesses(game, installRootCandidates).catch(() => []);
  if (closedProcesses.length > 0) {
    runningProcessCache.fetchedAt = 0;
    runningProcessCache.namesLower = new Set();
    return {
      ok: true,
      alreadyStopped: false,
      closedProcesses
    };
  }

  const expectedProcessNames = await collectExecutableImageNamesForGame(game, installRootCandidates).catch(() => []);
  const expectedLower = expectedProcessNames
    .map((value) => normalizeProcessNameForMatch(value))
    .filter(Boolean);
  const runningProcessNamesLower = await getRunningProcessNamesLower();
  const hasExpectedProcessRunning = expectedLower.some((name) => runningProcessNamesLower.has(name));

  if (hasExpectedProcessRunning) {
    throw new Error("O jogo esta em execucao, mas nao foi possivel fechar automaticamente.");
  }

  return {
    ok: true,
    alreadyStopped: true,
    closedProcesses: []
  };
}

appendStartupLog("[APP] main bootstrap iniciado.");
const startupRuntimeInfo = resolveAutoUpdateRuntimeInfo();
const singleInstanceEnabled = runtimeChannel !== "dev";
const hasSingleInstanceLock = singleInstanceEnabled ? app.requestSingleInstanceLock() : true;
appendStartupLog(
  `[APP] runtime channel=${runtimeChannel} app.isPackaged=${startupRuntimeInfo.packagedByElectron} ` +
    `defaultApp=${startupRuntimeInfo.defaultApp} exec=${startupRuntimeInfo.execName || "unknown"}`
);
appendStartupLog(
  `[APP] startup safeMode=${runtimeStartupHealthState.safeMode} ` +
    `failures=${runtimeStartupHealthState.failureCount} reason=${runtimeStartupHealthState.reason || "none"}`
);
appendStartupLog(`[APP] singleInstanceEnabled=${singleInstanceEnabled} singleInstanceLock=${hasSingleInstanceLock}`);

if (!hasSingleInstanceLock) {
  appendStartupLog("[APP] encerrando por instancia secundaria.");
  markStartupLaunchHealthy("secondary-instance-exit");
  app.quit();
} else {
  authDeepLinkUrlBuffer = extractDeepLinkFromArgv(process.argv);

  app.on("second-instance", (_event, argv) => {
    focusMainWindowIfAvailable();

    const deepLink = extractDeepLinkFromArgv(argv);
    if (!deepLink) return;
    authDeepLinkUrlBuffer = deepLink;
    void handleAuthDeepLink(deepLink);
  });

  app.on("open-url", (event, urlValue) => {
    event.preventDefault();
    focusMainWindowIfAvailable();
    authDeepLinkUrlBuffer = String(urlValue || "");
    void handleAuthDeepLink(urlValue);
  });

  app.on("child-process-gone", (_event, details) => {
    const processType = String(details?.type || "unknown");
    const reason = String(details?.reason || "unknown");
    const exitCode = Number(details?.exitCode || 0);
    appendStartupLog(`[CHILD_PROCESS] gone type=${processType} reason=${reason} exitCode=${exitCode}`);
  });

  app.whenReady().then(async () => {
    appQuitRequested = false;
    ensureWindowsAppIdentity();
    appendStartupLog("[APP] whenReady iniciado.");
    await ensurePersistedAuthConfigFile().catch(() => {});
    await ensurePersistedUpdaterConfigFile().catch(() => {});
    ensureSocialActivityBackgroundMonitorStarted();
    await recoverInterruptedInstallSessionsOnStartup().catch((error) => {
      appendStartupLog(`[INSTALL_RECOVERY_FATAL] ${formatStartupErrorForLog(error)}`);
    });
    registerAuthProtocolClient();
    ensureYoutubeEmbedRequestHeaders();
    setupAutoUpdater();
    try {
      ensureWindowsShortcutsWithIcon();
    } catch (error) {
      appendStartupLog(`[SHORTCUT_FATAL_ERROR] ${formatStartupErrorForLog(error)}`);
    }
    createTray();

    if (runtimeStartupHealthState.safeMode) {
      appendStartupLog(
        `[SAFE_MODE] inicializacao protegida ativa. updates-on-launch desativado para este boot (${runtimeStartupHealthState.reason || "auto"}).`
      );
    }

    const shouldCheckUpdateOnLaunch = Boolean(
      autoUpdateConfigSnapshot?.enabled &&
        autoUpdateConfigSnapshot?.configured &&
        autoUpdateConfigSnapshot?.updateOnLaunch &&
        !runtimeStartupHealthState.safeMode
    );

    try {
      createWindow();
    } catch (error) {
      appendStartupLog(`[CREATE_WINDOW_ERROR] ${formatStartupErrorForLog(error)}`);
      try {
        dialog.showErrorBox(
          "Falha ao abrir o launcher",
          `Nao foi possivel abrir a interface do WPlay.\n\n${error?.message || "Erro desconhecido."}`
        );
      } catch (_dialogError) {
        // Ignore dialog failures.
      }
      appQuitRequested = true;
      app.quit();
      return;
    }

    if (shouldCheckUpdateOnLaunch) {
      const updateWarmupDelayMs = resolveHostLowSpecProfile() ? 7_000 : 2_500;
      setTimeout(() => {
        appendStartupLog("[AUTO_UPDATE] verificacao inicial em background.");
        void checkForLauncherUpdate("startup");
      }, updateWarmupDelayMs);
    }

    if (authDeepLinkUrlBuffer) {
      void handleAuthDeepLink(authDeepLinkUrlBuffer);
    }

    ipcMain.handle("launcher:get-games", (_event, options) => getGamesWithStatus(options));
    ipcMain.handle("launcher:get-active-installs", () => getActiveInstallProgressSnapshot());
    ipcMain.handle("launcher:get-install-root", () => getInstallRootPath());
    ipcMain.handle("launcher:choose-install-base-directory", () => chooseInstallBaseDirectory());
    ipcMain.handle("launcher:install-game", (_event, gameId) => installGame(gameId));
    ipcMain.handle("launcher:uninstall-game", (_event, gameId) => uninstallGame(gameId));
    ipcMain.handle("launcher:play-game", (_event, gameId) => playGame(gameId));
    ipcMain.handle("launcher:close-game", (_event, gameId) => closeGame(gameId));
    ipcMain.handle("launcher:open-downloads-folder", () => openInstallFolder());
    ipcMain.handle("launcher:open-game-install-folder", (_event, gameId) => openGameInstallFolder(gameId));
    ipcMain.handle("launcher:open-external-url", (_event, rawUrl) => openExternalUrl(rawUrl));
    ipcMain.handle("launcher:open-steam-client", () => openSteamClient());
    ipcMain.handle("launcher:show-game-start-toast", (_event, payload) => showGameStartedDesktopToast(payload));
    ipcMain.handle("launcher:auth-get-session", () => getAuthSessionState());
    ipcMain.handle("launcher:auth-login-steam", () => loginWithSteam());
    ipcMain.handle("launcher:auth-login-discord", () => loginWithSteam());
    ipcMain.handle("launcher:auth-logout", () => logoutAuthSession());
    ipcMain.handle("launcher:notifications-list", () => listNotificationsForCurrentUser());
    ipcMain.handle("launcher:notifications-create", (_event, payload) => createNotificationForCurrentUser(payload));
    ipcMain.handle("launcher:notifications-delete", (_event, notificationId) =>
      deleteNotificationForCurrentUser(notificationId)
    );
    ipcMain.handle("launcher:notifications-clear", () => clearNotificationsForCurrentUser());
    ipcMain.handle("launcher:social-list-friend-game-activities", (_event, options) =>
      listFriendGameActivitiesForCurrentUser(options)
    );
    ipcMain.handle("launcher:auto-update-get-state", () => getPublicAutoUpdateState());
    ipcMain.handle("launcher:auto-update-check", () => checkForLauncherUpdate("manual"));
    ipcMain.handle("launcher:auto-update-check-background", () => checkForLauncherUpdate("renderer-poll"));
    ipcMain.handle("launcher:auto-update-download", () => downloadLauncherUpdate());
    ipcMain.handle("launcher:auto-update-restart-and-install", () => restartAndInstallLauncherUpdate());
    ipcMain.handle("launcher:window-minimize", () => {
      if (!mainWindow || mainWindow.isDestroyed()) return false;
      mainWindow.minimize();
      return true;
    });
    ipcMain.handle("launcher:window-toggle-maximize", () => {
      if (!mainWindow || mainWindow.isDestroyed()) return false;
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
        return false;
      }
      mainWindow.maximize();
      return true;
    });
    ipcMain.handle("launcher:window-is-maximized", () => {
      if (!mainWindow || mainWindow.isDestroyed()) return false;
      return mainWindow.isMaximized();
    });
    ipcMain.handle("launcher:window-close", () => {
      if (!mainWindow || mainWindow.isDestroyed()) return false;
      mainWindow.close();
      return true;
    });

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0 || !mainWindow || mainWindow.isDestroyed()) {
        createWindow();
        return;
      }
      showAndFocusMainWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (appQuitRequested && process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("before-quit", () => {
    appQuitRequested = true;
    clearStartupBootWatchdog();
    clearAutoUpdaterInterval();
    stopSocialActivityBackgroundMonitor();
    flushActiveInstallSessionsSync();
    destroyUpdateSplashWindow();
    destroyTray();
    appendStartupLog("[APP] encerrando launcher.");
  });
}
