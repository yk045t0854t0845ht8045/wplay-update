const searchInput = document.getElementById("searchInput");
const searchWrap = searchInput.closest(".search-wrap");
const statusMessage = document.getElementById("statusMessage");
const viewTitle = document.getElementById("viewTitle");
const storeFilterRow = document.getElementById("storeFilterRow");
const topSearchToggle = document.getElementById("topSearchToggle");
const topNotificationsBtn = document.getElementById("topNotificationsBtn");
const topNotificationsBadge = document.getElementById("topNotificationsBadge");
const topUpdateBtn = document.getElementById("topUpdateBtn");
const topAccountBtn = document.getElementById("topAccountBtn");
const accountMenu = document.getElementById("accountMenu");
const accountMenuName = document.getElementById("accountMenuName");
const accountMenuEmail = document.getElementById("accountMenuEmail");
const accountStartupBtn = document.getElementById("accountStartupBtn");
const notificationsPanel = document.getElementById("notificationsPanel");
const notificationsList = document.getElementById("notificationsList");
const notificationsEmpty = document.getElementById("notificationsEmpty");
const notificationsClearBtn = document.getElementById("notificationsClearBtn");
const windowMinBtn = document.getElementById("windowMinBtn");
const windowMaxBtn = document.getElementById("windowMaxBtn");
const windowCloseBtn = document.getElementById("windowCloseBtn");
const sideHomeBtn = document.getElementById("sideHomeBtn");
const sideHomeLogo = document.getElementById("sideHomeLogo");

const navStoreBtn = document.getElementById("navStoreBtn");
const navLibraryBtn = document.getElementById("navLibraryBtn");
const railGamesList = document.getElementById("railGamesList");
const railDownloadsBtn = document.getElementById("railDownloadsBtn");
const railDownloadsCount = document.getElementById("railDownloadsCount");

const storeView = document.getElementById("storeView");
const detailsView = document.getElementById("detailsView");
const libraryView = document.getElementById("libraryView");
const downloadsView = document.getElementById("downloadsView");
const storeGrid = document.getElementById("storeGrid");
const libraryGrid = document.getElementById("libraryGrid");
const downloadsActiveSection = document.getElementById("downloadsActiveSection");
const downloadsActiveCount = document.getElementById("downloadsActiveCount");
const downloadsActiveList = document.getElementById("downloadsActiveList");
const downloadsEmptyState = document.getElementById("downloadsEmptyState");
const downloadsActiveCollapseBtn = document.getElementById("downloadsActiveCollapseBtn");
const downloadsInstallOptionsBtn = document.getElementById("downloadsInstallOptionsBtn");
const downloadsPauseAllBtn = document.getElementById("downloadsPauseAllBtn");
const downloadsResumeAllBtn = document.getElementById("downloadsResumeAllBtn");

const detailsBackBtn = document.getElementById("detailsBackBtn");
const detailsBreadcrumb = document.getElementById("detailsBreadcrumb");
const detailsHeroBackdrop = document.getElementById("detailsHeroBackdrop");
const detailsLogo = document.getElementById("detailsLogo");
const detailsTitle = document.getElementById("detailsTitle");
const detailsDescription = document.getElementById("detailsDescription");
const detailsLongDescription = document.getElementById("detailsLongDescription");
const detailsAddLibraryBtn = document.getElementById("detailsAddLibraryBtn");
const detailsActionBtn = document.getElementById("detailsActionBtn");
const detailsProgress = document.getElementById("detailsProgress");
const detailsProgressFill = document.getElementById("detailsProgressFill");
const detailsProgressText = document.getElementById("detailsProgressText");
const detailsStatPlayTime = document.getElementById("detailsStatPlayTime");
const detailsStatAchievement = document.getElementById("detailsStatAchievement");

const detailsVideoWrap = document.getElementById("detailsVideoWrap");
const detailsGallery = document.getElementById("detailsGallery");
const detailsDevelopedBy = document.getElementById("detailsDevelopedBy");
const detailsPublishedBy = document.getElementById("detailsPublishedBy");
const detailsReleaseDate = document.getElementById("detailsReleaseDate");
const detailsGenres = document.getElementById("detailsGenres");
const detailsStatus = document.getElementById("detailsStatus");
const detailsPlayBtn = document.getElementById("detailsPlayBtn");
const detailsUninstallBtn = document.getElementById("detailsUninstallBtn");
const detailsHeroUninstallBtn = document.getElementById("detailsHeroUninstallBtn");

const installPathModal = document.getElementById("installPathModal");
const installPathCurrent = document.getElementById("installPathCurrent");
const installPathKeepBtn = document.getElementById("installPathKeepBtn");
const installPathChangeBtn = document.getElementById("installPathChangeBtn");
const installPathCancelBtn = document.getElementById("installPathCancelBtn");
const updateRestartModal = document.getElementById("updateRestartModal");
const updateRestartText = document.getElementById("updateRestartText");
const updateRestartNowBtn = document.getElementById("updateRestartNowBtn");
const updateRestartLaterBtn = document.getElementById("updateRestartLaterBtn");
const uninstallConfirmModal = document.getElementById("uninstallConfirmModal");
const uninstallConfirmText = document.getElementById("uninstallConfirmText");
const uninstallConfirmNowBtn = document.getElementById("uninstallConfirmNowBtn");
const uninstallConfirmCancelBtn = document.getElementById("uninstallConfirmCancelBtn");
const steamRequiredModal = document.getElementById("steamRequiredModal");
const steamRequiredText = document.getElementById("steamRequiredText");
const steamRequiredOpenBtn = document.getElementById("steamRequiredOpenBtn");
const steamRequiredCancelBtn = document.getElementById("steamRequiredCancelBtn");
const authGate = document.getElementById("authGate");
const authGateStatus = document.getElementById("authGateStatus");
const authSteamLoginBtn = document.getElementById("authSteamLoginBtn");
const authRetryBtn = document.getElementById("authRetryBtn");

const FALLBACK_CARD_IMAGE = "https://placehold.co/640x360/0f0f0f/f2f2f2?text=Game";
const FALLBACK_BANNER_IMAGE = "https://placehold.co/1280x720/0f0f0f/f2f2f2?text=Game+Banner";
const LIBRARY_STORAGE_KEY = "wyzer.launcher.library.v1";
const hardwareConcurrency = Number(window?.navigator?.hardwareConcurrency || 0);
const deviceMemoryGb = Number(window?.navigator?.deviceMemory || 0);
const LOW_SPEC_DEVICE =
  (Number.isFinite(hardwareConcurrency) && hardwareConcurrency > 0 && hardwareConcurrency <= 4) ||
  (Number.isFinite(deviceMemoryGb) && deviceMemoryGb > 0 && deviceMemoryGb <= 8);
const REALTIME_SYNC_INTERVAL_MS = LOW_SPEC_DEVICE ? 10 * 1000 : 5 * 1000;
const RECENT_COMPLETED_DOWNLOAD_TTL_MS = 10 * 60 * 1000;
const RECENT_COMPLETED_DOWNLOAD_MAX_ITEMS = 24;
const NOTIFICATION_HISTORY_LIMIT = 15;
const NOTYF_STACK_VISIBLE = 5;
const NOTYF_STACK_OFFSET_Y = 18;
const PROGRESS_RENDER_MIN_INTERVAL_MS = 120;
const AUTO_UPDATE_STATE_POLL_INTERVAL_MS = LOW_SPEC_DEVICE ? 35 * 1000 : 15 * 1000;
const AUTO_UPDATE_BACKGROUND_CHECK_INTERVAL_MS = LOW_SPEC_DEVICE ? 2 * 60 * 1000 : 75 * 1000;
const AUTO_UPDATE_BACKGROUND_FOCUS_DEBOUNCE_MS = LOW_SPEC_DEVICE ? 7 * 1000 : 3 * 1000;
const CATALOG_CHANGED_REFRESH_DEBOUNCE_MS = LOW_SPEC_DEVICE ? 1500 : 800;
const FRIEND_ACTIVITY_POLL_INTERVAL_MS = LOW_SPEC_DEVICE ? 10 * 1000 : 6 * 1000;
const FRIEND_ACTIVITY_CURSOR_BACKTRACK_MS = 18 * 1000;
const FRIEND_ACTIVITY_MAX_EVENT_AGE_MS = 30 * 60 * 1000;
const FRIEND_ACTIVITY_SEEN_LIMIT = 320;
const ACTIVE_INSTALL_PHASES = new Set(["preparing", "downloading", "extracting"]);
const SIDEBAR_LOGO_FALLBACK_PATH = "./assets/logo-default.svg";
const notificationTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit"
});
const notificationDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit"
});
const releaseDateStatFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const motionApi = window.Motion || null;
const animate = motionApi && typeof motionApi.animate === "function" ? motionApi.animate : null;
const stagger = motionApi && typeof motionApi.stagger === "function" ? motionApi.stagger : null;
const confettiFx = typeof window.confetti === "function" ? window.confetti : null;
const notyf =
  typeof window.Notyf === "function"
    ? new window.Notyf({
        duration: 4200,
        dismissible: true,
        ripple: false,
        position: { x: "right", y: "bottom" },
        types: [
          {
            type: "success",
            background: "rgba(26, 26, 32, 0.98)",
            icon: false,
            className: "notyf-theme-success"
          },
          {
            type: "error",
            background: "rgba(29, 26, 31, 0.98)",
            icon: false,
            className: "notyf-theme-error"
          },
          {
            type: "info",
            background: "rgba(26, 26, 32, 0.98)",
            icon: false,
            className: "notyf-theme-info"
          }
        ]
      })
    : null;

const state = {
  games: [],
  search: "",
  searchOpen: false,
  selectedGameId: "",
  selectedGalleryByGameId: new Map(),
  installRootPath: "",
  installProgressByGameId: new Map(),
  uninstallingGameIds: new Set(),
  libraryGameIds: new Set(),
  openLibraryMenuGameId: "",
  unreadNotifications: 0,
  notificationHistory: [],
  notificationsOpen: false,
  accountMenuOpen: false,
  downloadSpeedByGameId: new Map(),
  downloadsSectionCollapsed: false,
  recentCompletedDownloadsByGameId: [],
  authChecking: false,
  authBusy: false,
  authConfigured: true,
  authSession: null,
  launchOnStartup: {
    supported: false,
    enabled: false,
    busy: false
  },
  autoUpdate: {
    supported: false,
    configured: false,
    enabled: false,
    status: "disabled",
    message: "",
    currentVersion: "",
    latestVersion: "",
    updateDownloaded: false,
    progressPercent: 0,
    bytesPerSecond: 0,
    transferredBytes: 0,
    totalBytes: 0,
    lastCheckedAt: "",
    error: "",
    runtimeChannel: "",
    runtimePackaged: false,
    runtimeExec: "",
    runtimeDebug: "",
    startupSafeMode: false,
    startupSafeModeReason: "",
    preferLatestFullInstaller: true
  },
  updateRestartModalOpen: false,
  uninstallConfirmModalOpen: false,
  steamRequiredModalOpen: false,
  lastAutoUpdateNotifiedVersion: "",
  startupSafeModeNoticeShown: false,
  appBootstrapped: false,
  view: "store",
  lastNonDetailView: "store",
  storeFilter: "popular",
  storeAdvancedFiltersOpen: false,
  storeModeFilter: "all",
  storeGenreFilter: "all",
  introPlayed: false,
  realtimeSyncStarted: false,
  autoUpdateRealtimeSyncStarted: false,
  friendActivityRealtimeSyncStarted: false
};

let refreshGamesInFlight = null;
let installPathModalResolver = null;
let notyfDeckObserver = null;
let notyfDeckBootstrapObserver = null;
let progressRenderTimer = null;
let progressRenderFrame = 0;
let lastProgressRenderAt = 0;
let previousStoreGridSignature = "";
let previousLibraryGridSignature = "";
let autoUpdateBackgroundCheckTimer = null;
let notificationRemoteQueue = Promise.resolve();
let friendActivityPollTimer = null;
let friendActivityPollInFlight = null;
let friendActivityCursorIso = "";
let friendActivitySeenIds = new Set();
let friendActivityCurrentUserId = "";
let friendActivityLifecycleBindingsReady = false;
let uninstallConfirmModalResolver = null;
let catalogChangedRefreshTimer = null;

function setStatus(text, isError = false) {
  statusMessage.textContent = text;
  statusMessage.classList.toggle("status-error", isError);
}

function getAuthDisplayName(session) {
  if (!session || typeof session !== "object") return "";
  return String(session?.user?.displayName || session?.user?.email || "").trim();
}

function getAuthEmail(session) {
  if (!session || typeof session !== "object") return "";
  return String(session?.user?.email || session?.user?.id || "").trim();
}

function getAuthAvatarUrl(session) {
  if (!session || typeof session !== "object") return "";
  return String(session?.user?.avatarUrl || "").trim();
}

async function showDesktopGameStartedToastPayload(payload = {}) {
  if (typeof window.launcherApi?.showGameStartedToast !== "function") {
    return;
  }

  try {
    await window.launcherApi.showGameStartedToast(payload);
  } catch (_error) {
    // Non-blocking UI event; ignore desktop toast failures.
  }
}

async function showDesktopGameStartedToast(gameName) {
  const safeGameName = String(gameName || "").trim() || "Jogo";
  await showDesktopGameStartedToastPayload({
    nickname: getAuthDisplayName(state.authSession) || "Jogador",
    avatarUrl: getAuthAvatarUrl(state.authSession),
    gameName: safeGameName
  });
}

function resetFriendActivityRealtimeState() {
  if (friendActivityPollTimer) {
    window.clearInterval(friendActivityPollTimer);
    friendActivityPollTimer = null;
  }
  state.friendActivityRealtimeSyncStarted = false;
  friendActivityPollInFlight = null;
  friendActivityCursorIso = "";
  friendActivitySeenIds = new Set();
  friendActivityCurrentUserId = "";
}

function rememberFriendActivitySeenId(activityId) {
  const normalized = String(activityId || "").trim();
  if (!normalized) return;
  friendActivitySeenIds.add(normalized);
  if (friendActivitySeenIds.size > FRIEND_ACTIVITY_SEEN_LIMIT) {
    const overflow = friendActivitySeenIds.size - FRIEND_ACTIVITY_SEEN_LIMIT;
    if (overflow <= 0) return;
    const iterator = friendActivitySeenIds.values();
    for (let index = 0; index < overflow; index += 1) {
      const next = iterator.next();
      if (next.done) break;
      friendActivitySeenIds.delete(next.value);
    }
  }
}

function setFriendActivityCursorFromTimestamp(timestampMs) {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return;
  const currentMs = Date.parse(friendActivityCursorIso || "");
  if (Number.isFinite(currentMs) && currentMs >= timestampMs) {
    return;
  }
  friendActivityCursorIso = new Date(timestampMs).toISOString();
}

function getFriendActivityPollSinceIso() {
  if (!friendActivityCursorIso) {
    return "";
  }
  const cursorMs = Date.parse(friendActivityCursorIso);
  if (!Number.isFinite(cursorMs)) {
    return "";
  }
  return new Date(Math.max(0, cursorMs - FRIEND_ACTIVITY_CURSOR_BACKTRACK_MS)).toISOString();
}

function normalizeFriendActivityEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const id = String(entry.id || "").trim();
  const actorSteamId = String(entry.actorSteamId || "").trim();
  const actorDisplayName = String(entry.actorDisplayName || "").trim() || "Jogador";
  const actorAvatarUrl = String(entry.actorAvatarUrl || "").trim();
  const gameId = String(entry.gameId || "").trim();
  const gameName = String(entry.gameName || "").trim() || "Jogo";
  const createdAtRaw = String(entry.createdAt || "").trim();
  const createdAtMs = Date.parse(createdAtRaw);
  const createdAt = Number.isFinite(createdAtMs) ? new Date(createdAtMs).toISOString() : new Date().toISOString();
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

function handleFriendActivityNotification(activity) {
  const safeName = String(activity.actorDisplayName || "").trim() || "Jogador";
  const safeGame = String(activity.gameName || "").trim() || "Jogo";
  notify("success", `${safeName} iniciou`, safeGame, 4600);
  void showDesktopGameStartedToastPayload({
    activityId: String(activity.id || "").trim(),
    nickname: safeName,
    avatarUrl: String(activity.actorAvatarUrl || "").trim(),
    gameName: safeGame
  });
}

async function pollFriendGameActivities(silent = true) {
  const pollSessionUserId = String(state.authSession?.user?.id || "").trim();
  if (!pollSessionUserId) {
    return;
  }
  if (typeof window.launcherApi?.socialListFriendGameActivities !== "function") {
    return;
  }
  if (friendActivityPollInFlight) {
    return friendActivityPollInFlight;
  }

  friendActivityPollInFlight = (async () => {
    const sinceIso = getFriendActivityPollSinceIso();
    const payload = await window.launcherApi.socialListFriendGameActivities({
      since: sinceIso,
      limit: 48
    });
    if (pollSessionUserId !== String(state.authSession?.user?.id || "").trim()) {
      return;
    }
    const entries = Array.isArray(payload?.entries) ? payload.entries : [];
    if (!entries.length) {
      return;
    }

    const now = Date.now();
    const normalized = entries
      .map((entry) => normalizeFriendActivityEntry(entry))
      .filter(Boolean)
      .sort((left, right) => left.createdAtMs - right.createdAtMs);

    for (const activity of normalized) {
      if (!activity.id || friendActivitySeenIds.has(activity.id)) {
        continue;
      }
      rememberFriendActivitySeenId(activity.id);
      setFriendActivityCursorFromTimestamp(activity.createdAtMs);

      if (!activity.actorSteamId || activity.actorSteamId === pollSessionUserId) {
        continue;
      }

      if (now - activity.createdAtMs > FRIEND_ACTIVITY_MAX_EVENT_AGE_MS) {
        continue;
      }

      handleFriendActivityNotification(activity);
    }
  })()
    .catch((error) => {
      if (!silent) {
        setStatus(`Falha ao sincronizar atividade de amigos: ${error?.message || "erro desconhecido"}`, true);
      }
    })
    .finally(() => {
      friendActivityPollInFlight = null;
    });

  return friendActivityPollInFlight;
}

function startFriendActivityRealtimeSync() {
  const currentUserId = String(state.authSession?.user?.id || "").trim();
  if (!currentUserId) {
    return;
  }

  if (friendActivityCurrentUserId && friendActivityCurrentUserId !== currentUserId) {
    resetFriendActivityRealtimeState();
  }
  friendActivityCurrentUserId = currentUserId;

  if (!friendActivityCursorIso) {
    friendActivityCursorIso = new Date(Date.now() - 3000).toISOString();
  }

  if (!state.friendActivityRealtimeSyncStarted) {
    state.friendActivityRealtimeSyncStarted = true;
    if (friendActivityPollTimer) {
      window.clearInterval(friendActivityPollTimer);
    }
    friendActivityPollTimer = window.setInterval(() => {
      if (document.hidden || !document.hasFocus()) {
        return;
      }
      void pollFriendGameActivities(true);
    }, FRIEND_ACTIVITY_POLL_INTERVAL_MS);
  }

  if (!friendActivityLifecycleBindingsReady) {
    friendActivityLifecycleBindingsReady = true;
    window.addEventListener("focus", () => {
      void pollFriendGameActivities(true);
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        void pollFriendGameActivities(true);
      }
    });
  }

  void pollFriendGameActivities(false);
}

function setAuthGateVisible(visible) {
  if (!authGate) return;
  const showGate = Boolean(visible);
  authGate.classList.toggle("is-hidden", !showGate);
  document.body.classList.toggle("auth-locked", showGate);
  if (showGate) {
    setAccountMenuOpen(false);
  }
}

function setAuthGateStatus(text, isError = false) {
  if (!authGateStatus) return;
  authGateStatus.textContent = text || "";
  authGateStatus.classList.toggle("is-error", Boolean(isError));
}

function renderTopAccountButton() {
  if (!topAccountBtn) return;

  const session = state.authSession;
  const loggedIn = Boolean(session?.user?.id);
  renderAccountMenuProfile();

  topAccountBtn.classList.toggle("is-authenticated", loggedIn);

  if (!loggedIn) {
    setAccountMenuOpen(false);
    topAccountBtn.setAttribute("aria-label", "Entrar com Steam");
    topAccountBtn.title = "Conta";
    topAccountBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8.6" r="3.3" stroke="currentColor" stroke-width="1.7"></circle>
        <path d="M6.7 18.2C7.5 15.9 9.5 14.8 12 14.8C14.5 14.8 16.5 15.9 17.3 18.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
      </svg>
    `;
    return;
  }

  const displayName = getAuthDisplayName(session) || "Conta";
  const avatarUrl = getAuthAvatarUrl(session);
  topAccountBtn.setAttribute("aria-label", `Conta de ${displayName}`);
  topAccountBtn.title = displayName;

  if (avatarUrl) {
    topAccountBtn.innerHTML = `<img class="top-user-avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(displayName)}" loading="lazy" />`;
    return;
  }

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";

  topAccountBtn.innerHTML = `<span class="top-user-initials">${escapeHtml(initials)}</span>`;
}

function renderAccountMenuProfile() {
  if (!accountMenuName || !accountMenuEmail) return;
  const session = state.authSession;
  const displayName = getAuthDisplayName(session) || "Conta";
  const email = getAuthEmail(session) || "Sem login";
  accountMenuName.textContent = displayName;
  accountMenuEmail.textContent = email;
}

function normalizeLaunchOnStartupState(source) {
  const payload = source && typeof source === "object" ? source : {};
  return {
    supported: Boolean(payload.supported),
    enabled: Boolean(payload.enabled)
  };
}

function renderLaunchOnStartupAccountMenuItem() {
  if (!accountStartupBtn) return;

  const startupState = state.launchOnStartup || {};
  const supported = Boolean(startupState.supported);
  const enabled = Boolean(startupState.enabled);
  const busy = Boolean(startupState.busy);

  accountStartupBtn.disabled = busy || !supported;
  accountStartupBtn.setAttribute("aria-disabled", accountStartupBtn.disabled ? "true" : "false");
  accountStartupBtn.setAttribute("aria-checked", supported && enabled ? "true" : "false");

  if (!supported) {
    accountStartupBtn.textContent = "INICIALIZAR COM SISTEMA (SO NO APP INSTALADO)";
    return;
  }

  accountStartupBtn.textContent = enabled
    ? "INICIALIZAR COM SISTEMA: ATIVADO"
    : "INICIALIZAR COM SISTEMA: DESATIVADO";
}

async function refreshLaunchOnStartupState() {
  if (typeof window.launcherApi.getLaunchOnStartup !== "function") {
    state.launchOnStartup.supported = false;
    state.launchOnStartup.enabled = false;
    state.launchOnStartup.busy = false;
    renderLaunchOnStartupAccountMenuItem();
    return state.launchOnStartup;
  }

  try {
    const payload = await window.launcherApi.getLaunchOnStartup();
    const normalized = normalizeLaunchOnStartupState(payload);
    state.launchOnStartup.supported = normalized.supported;
    state.launchOnStartup.enabled = normalized.enabled;
  } catch (_error) {
    state.launchOnStartup.supported = false;
    state.launchOnStartup.enabled = false;
  } finally {
    state.launchOnStartup.busy = false;
    renderLaunchOnStartupAccountMenuItem();
  }

  return state.launchOnStartup;
}

async function toggleLaunchOnStartupFromAccountMenu() {
  if (state.launchOnStartup.busy) {
    return;
  }
  if (typeof window.launcherApi.setLaunchOnStartup !== "function") {
    throw new Error("Opcao indisponivel nesta versao do launcher.");
  }
  if (!state.launchOnStartup.supported) {
    notify("info", "Inicializacao", "Opcao disponivel apenas no app instalado do Windows.");
    return;
  }

  const nextEnabled = !state.launchOnStartup.enabled;
  state.launchOnStartup.busy = true;
  renderLaunchOnStartupAccountMenuItem();

  try {
    const payload = await window.launcherApi.setLaunchOnStartup(nextEnabled);
    const normalized = normalizeLaunchOnStartupState(payload);
    state.launchOnStartup.supported = normalized.supported;
    state.launchOnStartup.enabled = normalized.enabled;
    setStatus(
      normalized.enabled
        ? "Inicializar com sistema ativado."
        : "Inicializar com sistema desativado."
    );
    notify(
      "success",
      "Inicializacao",
      normalized.enabled
        ? "WPlay vai iniciar junto com o Windows."
        : "WPlay nao vai iniciar junto com o Windows."
    );
  } catch (error) {
    setStatus(`Falha ao atualizar inicializacao com sistema: ${error?.message || "erro desconhecido"}`, true);
    notify("error", "Inicializacao", error?.message || "Nao foi possivel atualizar a opcao.");
  } finally {
    state.launchOnStartup.busy = false;
    renderLaunchOnStartupAccountMenuItem();
  }
}

function setAccountMenuOpen(open) {
  if (!accountMenu || !topAccountBtn) return;
  const nextOpen = Boolean(open) && Boolean(state.authSession?.user?.id);
  state.accountMenuOpen = nextOpen;
  accountMenu.classList.toggle("is-hidden", !nextOpen);
  topAccountBtn.classList.toggle("is-active", nextOpen);
  topAccountBtn.setAttribute("aria-expanded", nextOpen ? "true" : "false");
  renderLaunchOnStartupAccountMenuItem();
}

function setAuthButtonsState(loading) {
  const isLoading = Boolean(loading);
  if (authSteamLoginBtn) {
    authSteamLoginBtn.disabled = isLoading;
    authSteamLoginBtn.textContent = isLoading ? "Abrindo Steam..." : "Continuar com Steam";
  }
  if (authRetryBtn) {
    authRetryBtn.disabled = isLoading;
  }
}

async function bootstrapLauncherDataIfNeeded() {
  if (state.appBootstrapped) {
    await syncActiveInstallProgressSnapshot();
    await refreshGames();
    return;
  }
  state.appBootstrapped = true;

  state.libraryGameIds = loadLibraryFromStorage();
  await Promise.all([refreshInstallRoot(), refreshGames(), syncActiveInstallProgressSnapshot(), refreshLaunchOnStartupState()]);
  syncSearchVisibility();
  updateNotificationBadge();
  renderNotificationHistory();
  playIntroAnimations();
  startRealtimeSync();
  setStatus(`${state.games.length} jogo(s) carregado(s).`);
}

async function ensureAuthenticated() {
  if (state.authChecking) return;

  state.authChecking = true;
  setAuthGateVisible(true);
  setAuthGateStatus("Validando sessao...");
  setAuthButtonsState(true);

  try {
    if (typeof window.launcherApi.authGetSession !== "function") {
      throw new Error("API de autenticacao indisponivel. Atualize o launcher.");
    }

    const authState = await window.launcherApi.authGetSession();
    const authenticated = Boolean(authState?.authenticated && authState?.session?.user?.id);
    state.authConfigured = Boolean(authState?.configured);
    state.authSession = authenticated ? authState.session : null;
    renderTopAccountButton();

    if (!state.authConfigured) {
      resetNotificationState();
      resetFriendActivityRealtimeState();
      setAuthGateVisible(true);
      setAuthGateStatus(
        "Steam nao configurado. Preencha steamWebApiKey em config/auth.json antes de entrar.",
        true
      );
      if (authRetryBtn) {
        authRetryBtn.classList.remove("is-hidden");
      }
      setStatus("Configure Steam Web API Key para liberar login com Steam.", true);
      return;
    }

    if (!authenticated) {
      resetNotificationState();
      resetFriendActivityRealtimeState();
      setAuthGateVisible(true);
      setAuthGateStatus("Entre com Steam para continuar.");
      if (authRetryBtn) {
        authRetryBtn.classList.add("is-hidden");
      }
      setStatus("Login necessario. Use Continuar com Steam.");
      return;
    }

    setAuthGateVisible(false);
    await syncNotificationHistoryFromSupabase();
    startFriendActivityRealtimeSync();
    await bootstrapLauncherDataIfNeeded();
  } catch (error) {
    state.authSession = null;
    resetNotificationState();
    resetFriendActivityRealtimeState();
    renderTopAccountButton();
    setAuthGateVisible(true);
    setAuthGateStatus(error?.message || "Falha ao verificar login com Steam.", true);
    if (authRetryBtn) {
      authRetryBtn.classList.remove("is-hidden");
    }
    setStatus(`Falha de autenticacao: ${error?.message || "erro desconhecido"}`, true);
  } finally {
    state.authChecking = false;
    setAuthButtonsState(false);
  }
}

async function startSteamLogin() {
  if (state.authBusy) return;
  if (typeof window.launcherApi.authLoginSteam !== "function") {
    setAuthGateStatus("API de login indisponivel nesta versao.", true);
    return;
  }

  state.authBusy = true;
  setAuthGateStatus("Abrindo Steam para autenticacao...");
  setAuthButtonsState(true);

  try {
    const result = await window.launcherApi.authLoginSteam();
    const authenticated = Boolean(result?.authenticated && result?.session?.user?.id);
    if (!authenticated) {
      throw new Error("Nao foi possivel concluir login Steam.");
    }

    state.authSession = result.session;
    renderTopAccountButton();
    setAuthGateVisible(false);
    await syncNotificationHistoryFromSupabase();
    startFriendActivityRealtimeSync();
    notify("success", "Login concluido", `Bem-vindo, ${getAuthDisplayName(result.session) || "jogador"}!`);
    await bootstrapLauncherDataIfNeeded();
  } catch (error) {
    state.authSession = null;
    resetNotificationState();
    resetFriendActivityRealtimeState();
    renderTopAccountButton();
    setAuthGateVisible(true);
    setAuthGateStatus(error?.message || "Falha ao autenticar com Steam.", true);
    if (authRetryBtn) {
      authRetryBtn.classList.remove("is-hidden");
    }
    setStatus(`Erro de login: ${error?.message || "erro desconhecido"}`, true);
    notify("error", "Login falhou", error?.message || "Nao foi possivel autenticar com Steam.");
  } finally {
    state.authBusy = false;
    setAuthButtonsState(false);
  }
}

async function logoutSteamSession() {
  if (state.authBusy) return;
  const confirmed = window.confirm("Deseja sair da sua conta Steam no launcher?");
  if (!confirmed) return;

  state.authBusy = true;
  try {
    if (typeof window.launcherApi.authLogout === "function") {
      await window.launcherApi.authLogout();
    }
    state.authSession = null;
    resetNotificationState();
    resetFriendActivityRealtimeState();
    renderTopAccountButton();
    setAuthGateVisible(true);
    setAuthGateStatus("Sessao encerrada. Entre com Steam para continuar.");
    setStatus("Logout realizado.");
    notify("info", "Sessao encerrada", "Voce saiu da conta Steam.");
  } catch (error) {
    setStatus(`Falha ao sair: ${error?.message || "erro desconhecido"}`, true);
    notify("error", "Erro ao sair", error?.message || "Nao foi possivel encerrar sessao.");
  } finally {
    state.authBusy = false;
    setAuthButtonsState(false);
  }
}

async function handleAccountMenuAction(action) {
  const menuAction = String(action || "").trim().toLowerCase();
  if (!menuAction) return;

  if (menuAction === "store") {
    setView("store");
    state.searchOpen = false;
    syncSearchVisibility();
    renderAll();
    setStatus("Abrindo Jogos...");
    return;
  }

  if (menuAction === "library") {
    setView("library");
    state.searchOpen = false;
    syncSearchVisibility();
    renderAll();
    setStatus("Abrindo Library...");
    return;
  }

  if (menuAction === "folder") {
    if (typeof window.launcherApi.openDownloadsFolder !== "function") {
      throw new Error("Atalho da pasta local indisponivel.");
    }
    await window.launcherApi.openDownloadsFolder();
    setStatus("Abrindo pasta local dos jogos...");
    notify("info", "Pasta local", "Diretorio de instalacao aberto no Explorer.");
    return;
  }

  if (menuAction === "startup") {
    await toggleLaunchOnStartupFromAccountMenu();
    return;
  }

  if (menuAction === "logout") {
    await logoutSteamSession();
  }
}

async function openExternalUrl(urlValue) {
  const raw = String(urlValue || "").trim();
  if (!raw) return false;

  let parsed;
  try {
    parsed = new URL(raw);
  } catch (_error) {
    throw new Error("URL externa invalida.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Protocolo de URL nao suportado.");
  }

  if (typeof window.launcherApi.openExternalUrl === "function") {
    const opened = await window.launcherApi.openExternalUrl(parsed.toString());
    return Boolean(opened);
  }

  window.open(parsed.toString(), "_blank", "noopener,noreferrer");
  return true;
}

function updateNotificationBadge() {
  if (!topNotificationsBadge) return;
  topNotificationsBadge.classList.toggle("is-hidden", state.unreadNotifications <= 0);
}

function markNotificationsAsRead() {
  state.unreadNotifications = 0;
  updateNotificationBadge();
}

function resetNotificationState() {
  state.notificationHistory = [];
  markNotificationsAsRead();
  renderNotificationHistory();
}

function scheduleProgressRenderAll() {
  const run = () => {
    progressRenderFrame = 0;
    if (progressRenderTimer) {
      window.clearTimeout(progressRenderTimer);
      progressRenderTimer = null;
    }
    lastProgressRenderAt = Date.now();
    renderAll();
  };

  const now = Date.now();
  const elapsed = now - lastProgressRenderAt;
  if (elapsed >= PROGRESS_RENDER_MIN_INTERVAL_MS) {
    if (!progressRenderFrame) {
      progressRenderFrame = window.requestAnimationFrame(run);
    }
    return;
  }

  if (progressRenderTimer) return;
  const waitMs = Math.max(16, PROGRESS_RENDER_MIN_INTERVAL_MS - elapsed);
  progressRenderTimer = window.setTimeout(() => {
    progressRenderTimer = null;
    if (!progressRenderFrame) {
      progressRenderFrame = window.requestAnimationFrame(run);
    }
  }, waitMs);
}

function applyNotyfDeckLayout() {
  const container = document.querySelector(".notyf");
  if (!container) return;

  const toasts = Array.from(container.querySelectorAll(".notyf__toast"));
  if (!toasts.length) {
    container.classList.remove("has-toasts");
    return;
  }

  container.classList.add("has-toasts");

  toasts.forEach((toast) => {
    toast.classList.remove("notyf-stack-top", "notyf-stack-hidden");
    toast.style.removeProperty("--stack-index");
    toast.style.removeProperty("--stack-z");
    toast.style.removeProperty("--stack-shift-y");
    toast.style.removeProperty("--stack-scale");
    toast.style.removeProperty("--stack-opacity");
    toast.style.removeProperty("--stack-brightness");
  });

  const newestFirst = [...toasts].reverse();
  newestFirst.forEach((toast, index) => {
    const shiftY = index * NOTYF_STACK_OFFSET_Y;
    const scale = Math.max(0.86, 1 - index * 0.032);
    const opacity = Math.max(0.24, 1 - index * 0.17);
    const brightness = Math.max(0.78, 1 - index * 0.06);

    toast.style.setProperty("--stack-index", String(index));
    toast.style.setProperty("--stack-z", String(420 - index));
    toast.style.setProperty("--stack-shift-y", `${shiftY}px`);
    toast.style.setProperty("--stack-scale", scale.toFixed(3));
    toast.style.setProperty("--stack-opacity", opacity.toFixed(3));
    toast.style.setProperty("--stack-brightness", brightness.toFixed(3));

    if (index === 0) {
      toast.classList.add("notyf-stack-top");
    }
    if (index >= NOTYF_STACK_VISIBLE) {
      toast.classList.add("notyf-stack-hidden");
    }
  });
}

function ensureNotyfDeckStack() {
  if (!notyf || typeof window.MutationObserver !== "function") return;

  const attachDeckObserver = () => {
    const container = document.querySelector(".notyf");
    if (!container) return false;

    if (!notyfDeckObserver) {
      notyfDeckObserver = new window.MutationObserver(() => {
        window.requestAnimationFrame(() => {
          applyNotyfDeckLayout();
        });
      });
      notyfDeckObserver.observe(container, { childList: true });
    }

    window.requestAnimationFrame(() => {
      applyNotyfDeckLayout();
    });
    return true;
  };

  if (attachDeckObserver()) {
    if (notyfDeckBootstrapObserver) {
      notyfDeckBootstrapObserver.disconnect();
      notyfDeckBootstrapObserver = null;
    }
    return;
  }

  if (notyfDeckBootstrapObserver) return;
  notyfDeckBootstrapObserver = new window.MutationObserver(() => {
    if (attachDeckObserver() && notyfDeckBootstrapObserver) {
      notyfDeckBootstrapObserver.disconnect();
      notyfDeckBootstrapObserver = null;
    }
  });
  notyfDeckBootstrapObserver.observe(document.body, { childList: true, subtree: true });
}

function setupSidebarLogo() {
  if (!sideHomeBtn || !sideHomeLogo) return;

  const setHasLogo = (value) => {
    sideHomeBtn.classList.toggle("has-logo", Boolean(value));
  };

  const applyFallbackLogo = () => {
    if (sideHomeLogo.dataset.fallbackApplied === "1") {
      setHasLogo(false);
      return;
    }
    sideHomeLogo.dataset.fallbackApplied = "1";
    sideHomeLogo.src = SIDEBAR_LOGO_FALLBACK_PATH;
  };

  sideHomeLogo.addEventListener("load", () => {
    setHasLogo(true);
  });

  sideHomeLogo.addEventListener("error", () => {
    applyFallbackLogo();
  });

  if (sideHomeLogo.complete) {
    if (sideHomeLogo.naturalWidth > 0) {
      setHasLogo(true);
    } else {
      applyFallbackLogo();
    }
  }
}

function applyWindowMaximizedState(isMaximized) {
  const isMax = Boolean(isMaximized);
  document.body.classList.toggle("window-maximized", isMax);
  if (windowMaxBtn) {
    windowMaxBtn.classList.toggle("is-maximized", isMax);
    windowMaxBtn.setAttribute("aria-label", isMax ? "Restaurar" : "Maximizar");
  }
}

function getNotificationType(type) {
  if (type === "error") return "error";
  if (type === "success") return "success";
  return "info";
}

function getNotificationTypeLabel(type) {
  if (type === "error") return "Erro";
  if (type === "success") return "Sucesso";
  return "Info";
}

function getNotificationIconSvg(type, iconClass = "notification-icon-svg") {
  if (type === "error") {
    return `
      <svg class="${iconClass}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.2" stroke="currentColor" stroke-width="1.85"></circle>
        <path d="M12 7.9V12.4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>
        <circle cx="12" cy="15.9" r="1.1" fill="currentColor"></circle>
      </svg>
    `;
  }

  if (type === "success") {
    return `
      <svg class="${iconClass}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.2" stroke="currentColor" stroke-width="1.85"></circle>
        <path d="M8.5 12.3L10.8 14.6L15.6 9.8" stroke="currentColor" stroke-width="1.95" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `;
  }

  return `
    <svg class="${iconClass}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" stroke-width="1.85"></circle>
      <path d="M12 9.4V12.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>
      <circle cx="12" cy="7.6" r="1.1" fill="currentColor"></circle>
      <path d="M9.2 15.7H14.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
    </svg>
  `;
}

function formatNotificationTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return notificationTimeFormatter.format(date);
  }

  return `${notificationDateFormatter.format(date)} ${notificationTimeFormatter.format(date)}`;
}

function getNotificationEntryTimeMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = new Date(value).getTime();
  if (Number.isFinite(parsed)) return parsed;
  return Date.now();
}

function normalizeNotificationHistoryEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const title = String(entry.title || "").trim() || "Notificacao";
  const message = String(entry.message || "").trim();
  const createdAtRaw = entry.createdAt || entry.created_at || Date.now();
  const createdAtMs = getNotificationEntryTimeMs(createdAtRaw);
  const createdAtIso = new Date(createdAtMs).toISOString();
  const id = String(entry.id || "").trim() || `local-${createdAtMs}-${Math.floor(Math.random() * 1_000_000)}`;
  return {
    id,
    type: getNotificationType(entry.type),
    title,
    message,
    createdAt: createdAtIso
  };
}

function replaceNotificationHistory(entries) {
  const normalized = Array.isArray(entries)
    ? entries
        .map((entry) => normalizeNotificationHistoryEntry(entry))
        .filter(Boolean)
        .sort((left, right) => getNotificationEntryTimeMs(right.createdAt) - getNotificationEntryTimeMs(left.createdAt))
    : [];

  state.notificationHistory = normalized.slice(0, NOTIFICATION_HISTORY_LIMIT);
  renderNotificationHistory();
}

function enqueueNotificationRemoteTask(task) {
  const runTask = async () => task();
  const queued = notificationRemoteQueue.then(runTask, runTask);
  notificationRemoteQueue = queued.catch(() => {});
  return queued;
}

async function syncNotificationHistoryFromSupabase() {
  if (!state.authSession?.user?.id) {
    resetNotificationState();
    return;
  }

  if (typeof window.launcherApi?.notificationsList !== "function") {
    return;
  }

  try {
    const payload = await enqueueNotificationRemoteTask(() => window.launcherApi.notificationsList());
    if (Array.isArray(payload?.entries)) {
      replaceNotificationHistory(payload.entries);
    }
  } catch (_error) {
    // Keep current history when remote sync fails.
  }
}

function renderNotificationHistory() {
  if (!notificationsList || !notificationsEmpty) return;

  const entries = state.notificationHistory || [];
  const hasEntries = entries.length > 0;
  notificationsList.classList.toggle("is-hidden", !hasEntries);
  notificationsEmpty.classList.toggle("is-hidden", hasEntries);

  if (!hasEntries) {
    notificationsList.innerHTML = "";
    return;
  }

  notificationsList.innerHTML = entries
    .map((entry) => {
      const safeTitle = escapeHtml(entry.title || "Notificacao");
      const safeMessage = escapeHtml(entry.message || "");
      const type = getNotificationType(entry.type);
      const typeLabel = getNotificationTypeLabel(type);
      const timestamp = formatNotificationTimestamp(entry.createdAt);
      const notificationId = escapeHtml(entry.id || "");

      return `
        <article class="notification-item is-${type}" data-notification-id="${notificationId}">
          <span class="notification-icon-wrap" aria-hidden="true">
            ${getNotificationIconSvg(type)}
          </span>
          <div class="notification-main">
            <div class="notification-item-top">
              <span class="notification-type">${escapeHtml(typeLabel)}</span>
              <time class="notification-time">${escapeHtml(timestamp)}</time>
            </div>
            <strong class="notification-title">${safeTitle}</strong>
            ${safeMessage ? `<p class="notification-message">${safeMessage}</p>` : ""}
          </div>
          <button
            class="notification-dismiss-btn"
            type="button"
            aria-label="Remover notificacao"
            data-notification-dismiss="${notificationId}"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M8.2 8.2L15.8 15.8M15.8 8.2L8.2 15.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
            </svg>
          </button>
        </article>
      `;
    })
    .join("");
}

function pushNotificationHistoryLocal(type, title, message, createdAt = Date.now(), entryId = "") {
  const safeType = getNotificationType(type);
  const safeTitle = String(title || "").trim() || "Notificacao";
  const safeMessage = String(message || "").trim();
  const normalized = normalizeNotificationHistoryEntry({
    id: entryId,
    type: safeType,
    title: safeTitle,
    message: safeMessage,
    createdAt
  });
  if (!normalized) return null;

  const current = Array.isArray(state.notificationHistory) ? state.notificationHistory : [];
  replaceNotificationHistory([normalized, ...current]);
  return normalized;
}

function pushNotificationHistory(type, title, message) {
  const localEntry = pushNotificationHistoryLocal(type, title, message);
  if (!localEntry) return;

  if (!state.authSession?.user?.id) {
    return;
  }

  if (typeof window.launcherApi?.notificationsCreate !== "function") {
    return;
  }

  void enqueueNotificationRemoteTask(async () => {
    try {
      const payload = await window.launcherApi.notificationsCreate({
        type: localEntry.type,
        title: localEntry.title,
        message: localEntry.message
      });
      if (Array.isArray(payload?.entries)) {
        replaceNotificationHistory(payload.entries);
      }
    } catch (_error) {
      // Keep optimistic local entry if remote write fails.
    }
  });
}

function removeNotificationHistoryEntry(notificationId) {
  const normalizedId = String(notificationId || "").trim();
  if (!normalizedId) return;

  state.notificationHistory = (state.notificationHistory || []).filter((entry) => entry.id !== normalizedId);
  renderNotificationHistory();
  updateNotificationBadge();

  if (!state.authSession?.user?.id) {
    return;
  }

  if (typeof window.launcherApi?.notificationsDelete !== "function") {
    return;
  }

  void enqueueNotificationRemoteTask(async () => {
    try {
      const payload = await window.launcherApi.notificationsDelete(normalizedId);
      if (Array.isArray(payload?.entries)) {
        replaceNotificationHistory(payload.entries);
      }
    } catch (_error) {
      // Keep local remove even if remote delete fails.
    }
  });
}

function clearNotificationHistory() {
  resetNotificationState();

  if (!state.authSession?.user?.id) {
    return;
  }

  if (typeof window.launcherApi?.notificationsClear !== "function") {
    return;
  }

  void enqueueNotificationRemoteTask(async () => {
    try {
      const payload = await window.launcherApi.notificationsClear();
      if (Array.isArray(payload?.entries)) {
        replaceNotificationHistory(payload.entries);
      } else {
        resetNotificationState();
      }
    } catch (_error) {
      // Keep local clear even if remote clear fails.
    }
  });
}

function setNotificationsPanelOpen(open) {
  if (!notificationsPanel || !topNotificationsBtn) return;

  state.notificationsOpen = Boolean(open);
  if (state.notificationsOpen) {
    setAccountMenuOpen(false);
  }
  notificationsPanel.classList.toggle("is-hidden", !state.notificationsOpen);
  topNotificationsBtn.classList.toggle("is-active", state.notificationsOpen);
  topNotificationsBtn.setAttribute("aria-expanded", state.notificationsOpen ? "true" : "false");

  if (state.notificationsOpen) {
    markNotificationsAsRead();
    renderNotificationHistory();
    void syncNotificationHistoryFromSupabase();
  }
}

function showToast(type, title, message, timeoutMs = 3600) {
  const normalizedType = getNotificationType(type);
  const rawTitle = String(title || "").trim();
  const rawMessage = String(message || "").trim();
  const fallbackTitle = rawTitle || "Notificacao";
  const fallbackMessage = rawMessage;
  const composedMessage = fallbackMessage ? `${fallbackTitle}: ${fallbackMessage}` : fallbackTitle;
  const safeTitle = escapeHtml(fallbackTitle);
  const safeDescription = escapeHtml(fallbackMessage);
  const toastMarkup = `
    <div class="toast-shell">
      <span class="toast-icon-wrap toast-icon-${normalizedType}" aria-hidden="true">
        ${getNotificationIconSvg(normalizedType, "toast-icon-svg")}
      </span>
      <div class="toast-content">
        <strong class="toast-title">${safeTitle}</strong>
        ${safeDescription ? `<p class="toast-description">${safeDescription}</p>` : ""}
      </div>
    </div>
  `;
  const durationMs = Number.isFinite(Number(timeoutMs)) ? Math.max(1200, Number(timeoutMs)) : 3600;

  if (notyf && typeof notyf.open === "function") {
    try {
      notyf.open({
        type: normalizedType,
        message: toastMarkup,
        duration: durationMs,
        dismissible: true
      });
      ensureNotyfDeckStack();
      window.requestAnimationFrame(() => {
        applyNotyfDeckLayout();
      });
      return;
    } catch (_error) {
      // Fallback below if library fails unexpectedly.
    }
  }

  setStatus(composedMessage, normalizedType === "error");
}

function notify(type, title, message, timeoutMs = 3600) {
  pushNotificationHistory(type, title, message);
  showToast(type, title, message, timeoutMs);
  if (!state.notificationsOpen) {
    state.unreadNotifications += 1;
  }
  updateNotificationBadge();
}

function normalizeAutoUpdatePayload(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  return {
    supported: Boolean(source.supported),
    configured: Boolean(source.configured),
    enabled: Boolean(source.enabled),
    status: String(source.status || "disabled").trim().toLowerCase() || "disabled",
    message: String(source.message || "").trim(),
    currentVersion: String(source.currentVersion || "").trim(),
    latestVersion: String(source.latestVersion || "").trim(),
    updateDownloaded: Boolean(source.updateDownloaded),
    progressPercent: Number(source.progressPercent) || 0,
    bytesPerSecond: Number(source.bytesPerSecond) || 0,
    transferredBytes: Number(source.transferredBytes) || 0,
    totalBytes: Number(source.totalBytes) || 0,
    lastCheckedAt: String(source.lastCheckedAt || "").trim(),
    error: String(source.error || "").trim(),
    runtimeChannel: String(source.runtimeChannel || "").trim().toLowerCase(),
    runtimePackaged: Boolean(source.runtimePackaged),
    runtimeExec: String(source.runtimeExec || "").trim(),
    runtimeDebug: String(source.runtimeDebug || "").trim(),
    startupSafeMode: Boolean(source.startupSafeMode),
    startupSafeModeReason: String(source.startupSafeModeReason || "").trim(),
    preferLatestFullInstaller: source.preferLatestFullInstaller !== false
  };
}

function formatVersionTag(versionText) {
  const clean = String(versionText || "").trim();
  if (!clean) return "";
  return clean.startsWith("v") ? clean : `v${clean}`;
}

function hasAutoUpdateApiSupport() {
  return (
    typeof window.launcherApi?.autoUpdateGetState === "function" &&
    typeof window.launcherApi?.autoUpdateCheck === "function"
  );
}

function scheduleAutoUpdateBackgroundCheckSoon(delayMs = AUTO_UPDATE_BACKGROUND_FOCUS_DEBOUNCE_MS) {
  if (!hasAutoUpdateApiSupport()) {
    return;
  }
  if (autoUpdateBackgroundCheckTimer) {
    window.clearTimeout(autoUpdateBackgroundCheckTimer);
  }
  autoUpdateBackgroundCheckTimer = window.setTimeout(() => {
    autoUpdateBackgroundCheckTimer = null;
    void checkForAutoUpdateInBackground();
  }, Math.max(1200, Number(delayMs) || AUTO_UPDATE_BACKGROUND_FOCUS_DEBOUNCE_MS));
}

function setUpdateRestartModalOpen(open) {
  if (!updateRestartModal) return;
  const nextOpen = Boolean(open) && Boolean(state.autoUpdate.updateDownloaded);
  state.updateRestartModalOpen = nextOpen;
  updateRestartModal.classList.toggle("is-hidden", !nextOpen);
  updateRestartModal.setAttribute("aria-hidden", nextOpen ? "false" : "true");

  if (!nextOpen || !updateRestartText) {
    return;
  }

  const latest = formatVersionTag(state.autoUpdate.latestVersion);
  updateRestartText.textContent = latest
    ? `A versao ${latest} do launcher foi baixada.\nDeseja reiniciar agora para aplicar a atualizacao sem reinstalar seus jogos?`
    : "Uma nova versao do launcher foi baixada. Deseja reiniciar agora para aplicar sem reinstalar jogos?";
}

function closeUninstallConfirmModal(confirmed) {
  if (uninstallConfirmModalResolver) {
    uninstallConfirmModalResolver(Boolean(confirmed));
    uninstallConfirmModalResolver = null;
  }
  state.uninstallConfirmModalOpen = false;
  if (!uninstallConfirmModal) return;
  uninstallConfirmModal.classList.add("is-hidden");
  uninstallConfirmModal.setAttribute("aria-hidden", "true");
}

function setUninstallConfirmModalOpen(open, gameName = "") {
  if (!uninstallConfirmModal) return;
  const nextOpen = Boolean(open);
  state.uninstallConfirmModalOpen = nextOpen;
  uninstallConfirmModal.classList.toggle("is-hidden", !nextOpen);
  uninstallConfirmModal.setAttribute("aria-hidden", nextOpen ? "false" : "true");

  if (!nextOpen || !uninstallConfirmText) {
    return;
  }

  const safeName = String(gameName || "").trim();
  uninstallConfirmText.textContent = safeName
    ? `Tem certeza que deseja desinstalar ${safeName}?\n\nIsso remove os arquivos do jogo do computador.`
    : "Tem certeza que deseja desinstalar este jogo?\n\nIsso remove os arquivos do jogo do computador.";
}

async function askUninstallConfirmation(game) {
  const safeName = String(game?.name || "").trim();
  if (!uninstallConfirmModal || !uninstallConfirmNowBtn || !uninstallConfirmCancelBtn) {
    return window.confirm(
      safeName
        ? `Desinstalar ${safeName}?\n\nIsso remove os arquivos do computador.`
        : "Desinstalar este jogo?\n\nIsso remove os arquivos do computador."
    );
  }

  if (uninstallConfirmModalResolver) {
    uninstallConfirmModalResolver(false);
    uninstallConfirmModalResolver = null;
  }

  setUninstallConfirmModalOpen(true, safeName);
  return new Promise((resolve) => {
    uninstallConfirmModalResolver = resolve;
  });
}

function parseLauncherError(message) {
  const raw = String(message || "").trim();
  if (!raw) return { code: "", message: "" };
  const match = raw.match(/^\[([A-Z0-9_:-]+)\]\s*(.*)$/i);
  if (!match) {
    return { code: "", message: raw };
  }
  return {
    code: String(match[1] || "").toUpperCase(),
    message: String(match[2] || "").trim() || raw
  };
}

function setSteamRequiredModalOpen(open, gameName = "") {
  if (!steamRequiredModal) return;
  const nextOpen = Boolean(open);
  state.steamRequiredModalOpen = nextOpen;
  steamRequiredModal.classList.toggle("is-hidden", !nextOpen);
  steamRequiredModal.setAttribute("aria-hidden", nextOpen ? "false" : "true");

  if (!nextOpen || !steamRequiredText) {
    return;
  }

  const safeName = String(gameName || "").trim();
  steamRequiredText.textContent = safeName
    ? `Para iniciar ${safeName}, voce precisa abrir a Steam primeiro. Abra o cliente Steam e tente novamente.`
    : "Para iniciar este jogo, voce precisa abrir a Steam primeiro. Abra o cliente Steam e tente novamente.";
}

async function openSteamClientFromModal() {
  if (typeof window.launcherApi?.openSteamClient !== "function") {
    notify("error", "Steam", "API para abrir Steam indisponivel nesta versao.");
    return;
  }

  try {
    await window.launcherApi.openSteamClient();
    setSteamRequiredModalOpen(false);
    setStatus("Steam aberta. Tente iniciar o jogo novamente.");
    notify("info", "Steam", "Cliente Steam aberto. Agora tente iniciar o jogo novamente.");
  } catch (error) {
    notify("error", "Steam", error?.message || "Nao foi possivel abrir Steam automaticamente.");
  }
}

function renderAutoUpdateButton() {
  if (!topUpdateBtn) return;

  const autoUpdate = state.autoUpdate;
  const visible = hasAutoUpdateApiSupport() || autoUpdate.supported || autoUpdate.enabled || autoUpdate.configured;
  const hasUpdatePending =
    autoUpdate.status === "available" ||
    autoUpdate.status === "downloading" ||
    autoUpdate.status === "downloaded" ||
    autoUpdate.status === "installing" ||
    autoUpdate.updateDownloaded;

  topUpdateBtn.classList.toggle("is-hidden", !visible);
  topUpdateBtn.classList.toggle("has-update", hasUpdatePending);
  topUpdateBtn.classList.toggle(
    "is-checking",
    autoUpdate.status === "downloading" || autoUpdate.status === "checking" || autoUpdate.status === "installing"
  );
  topUpdateBtn.classList.toggle("is-ready", autoUpdate.status === "downloaded" || autoUpdate.updateDownloaded);
  topUpdateBtn.classList.toggle("is-active", state.updateRestartModalOpen);
  topUpdateBtn.disabled = false;

  let label = "Atualizacao do launcher";
  if (autoUpdate.status === "downloading") {
    const percent = Number(autoUpdate.progressPercent);
    const rounded = Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : 0;
    label = `Baixando atualizacao (${rounded}%)`;
  } else if (autoUpdate.status === "checking") {
    label = autoUpdate.message || "Verificando atualizacoes do launcher...";
  } else if (autoUpdate.status === "downloaded" || autoUpdate.updateDownloaded) {
    label = "Atualizacao pronta. Clique para reiniciar e instalar.";
  } else if (autoUpdate.status === "installing") {
    label = autoUpdate.message || "Aplicando atualizacao do launcher...";
  } else if (autoUpdate.status === "available") {
    label = autoUpdate.message || "Nova atualizacao encontrada.";
  } else if (autoUpdate.status === "idle") {
    label = autoUpdate.message || "Launcher atualizado. Clique para verificar novamente.";
  } else if (autoUpdate.status === "disabled") {
    label = autoUpdate.error || autoUpdate.message || "Atualizador desativado ou nao configurado.";
  } else if (autoUpdate.status === "error") {
    label = autoUpdate.error || autoUpdate.message || "Falha no atualizador. Clique para tentar novamente.";
  }

  topUpdateBtn.setAttribute("aria-label", label);
  topUpdateBtn.title = label;
}

function applyAutoUpdatePayload(payload, fromEvent = false) {
  const previous = state.autoUpdate;
  const next = normalizeAutoUpdatePayload(payload);
  state.autoUpdate = next;
  renderAutoUpdateButton();

  if (next.startupSafeMode && !state.startupSafeModeNoticeShown) {
    state.startupSafeModeNoticeShown = true;
    const reasonSuffix = next.startupSafeModeReason ? ` (${next.startupSafeModeReason})` : "";
    notify(
      "info",
      "Inicializacao protegida",
      `Modo de seguranca ativo para estabilidade neste boot${reasonSuffix}.`
    );
  }

  if (!next.updateDownloaded && state.updateRestartModalOpen) {
    setUpdateRestartModalOpen(false);
  }

  const latestVersionTag = formatVersionTag(next.latestVersion);
  const transitionedToAvailable = previous.status !== "available" && next.status === "available";
  if (transitionedToAvailable) {
    notify(
      "info",
      "Atualizacao disponivel",
      latestVersionTag
        ? `${latestVersionTag} encontrada. Clique no icone de update para baixar.`
        : "Nova versao encontrada. Clique no icone de update para baixar."
    );
  }

  const transitionedToDownloaded = !previous.updateDownloaded && next.updateDownloaded;
  if (transitionedToDownloaded) {
    if (state.lastAutoUpdateNotifiedVersion !== latestVersionTag) {
      state.lastAutoUpdateNotifiedVersion = latestVersionTag;
      notify(
        "success",
        "Atualizacao pronta",
        latestVersionTag
          ? `${latestVersionTag} foi baixada. Clique no icone verde para reiniciar e atualizar.`
          : "Atualizacao baixada. Clique no icone verde para reiniciar e atualizar."
      );
    }
    return;
  }

  if (fromEvent && previous.status !== "error" && next.status === "error") {
    const errorText = next.error || next.message || "Falha ao verificar atualizacoes.";
    notify("error", "Atualizacao", errorText);
  }
}

async function bootstrapAutoUpdateState() {
  if (!hasAutoUpdateApiSupport()) {
    renderAutoUpdateButton();
    return;
  }

  try {
    const payload = await window.launcherApi.autoUpdateGetState();
    applyAutoUpdatePayload(payload, false);
  } catch (error) {
    setStatus(`Falha ao consultar atualizador: ${error?.message || "erro desconhecido"}`, true);
    applyAutoUpdatePayload(
      {
        supported: true,
        configured: true,
        enabled: true,
        status: "idle",
        message: "Atualizador indisponivel no momento. Tentando novamente em segundo plano.",
        error: ""
      },
      false
    );
  }

  if (typeof window.launcherApi.onAutoUpdateState === "function") {
    window.launcherApi.onAutoUpdateState((payload) => {
      applyAutoUpdatePayload(payload, true);
    });
  }
}

async function checkForAutoUpdateInBackground() {
  if (!hasAutoUpdateApiSupport()) {
    return;
  }

  try {
    if (typeof window.launcherApi.autoUpdateCheckBackground === "function") {
      const payload = await window.launcherApi.autoUpdateCheckBackground();
      applyAutoUpdatePayload(payload, false);
      return;
    }

    const payload = await window.launcherApi.autoUpdateCheck();
    applyAutoUpdatePayload(payload, false);
  } catch (_error) {
    // Silent on background checks to avoid noisy notifications.
  }
}

function startAutoUpdateRealtimeSync() {
  if (state.autoUpdateRealtimeSyncStarted) {
    return;
  }
  state.autoUpdateRealtimeSyncStarted = true;

  if (!hasAutoUpdateApiSupport()) {
    renderAutoUpdateButton();
    return;
  }

  window.setInterval(() => {
    void (async () => {
      if (document.hidden) {
        return;
      }
      try {
        const payload = await window.launcherApi.autoUpdateGetState();
        applyAutoUpdatePayload(payload, false);
      } catch (_error) {
        // Silent polling failure.
      }
    })();
  }, AUTO_UPDATE_STATE_POLL_INTERVAL_MS);

  window.setInterval(() => {
    if (document.hidden) {
      return;
    }
    void checkForAutoUpdateInBackground();
  }, AUTO_UPDATE_BACKGROUND_CHECK_INTERVAL_MS);

  window.addEventListener("focus", () => {
    scheduleAutoUpdateBackgroundCheckSoon();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      scheduleAutoUpdateBackgroundCheckSoon();
    }
  });

  scheduleAutoUpdateBackgroundCheckSoon(1500);
}

async function checkForAutoUpdateManually() {
  if (!hasAutoUpdateApiSupport()) {
    notify("error", "Atualizacao", "API de atualizacao indisponivel nesta versao.");
    return;
  }

  try {
    const payload = await window.launcherApi.autoUpdateCheck();
    applyAutoUpdatePayload(payload, false);
    const status = String(payload?.status || "").toLowerCase();

    if (status === "idle") {
      const idleMessage = String(payload?.message || "").trim();
      const hasTransientSignal =
        /temporari|indisponivel|limit/i.test(idleMessage) &&
        /update|atualiza|github|feed/i.test(idleMessage);
      notify(
        "info",
        "Atualizacao",
        hasTransientSignal && idleMessage ? idleMessage : "Voce ja esta na versao mais recente."
      );
      return;
    }

    if (status === "disabled") {
      notify("info", "Atualizacao", payload?.error || payload?.message || "Atualizador desativado.");
      return;
    }

    if (status === "downloading" || status === "available") {
      notify("info", "Atualizacao", payload?.message || "Nova atualizacao encontrada.");
      return;
    }

    if (status === "error") {
      notify("error", "Atualizacao", payload?.error || payload?.message || "Falha ao verificar atualizacoes.");
    }
  } catch (error) {
    notify("error", "Atualizacao", error?.message || "Falha ao verificar atualizacoes.");
  }
}

async function downloadAutoUpdateNow() {
  if (typeof window.launcherApi.autoUpdateDownload !== "function") {
    notify("error", "Atualizacao", "API de download do updater indisponivel.");
    return;
  }

  try {
    const payload = await window.launcherApi.autoUpdateDownload();
    applyAutoUpdatePayload(payload, false);
    const status = String(payload?.status || "").toLowerCase();

    if (status === "downloading") {
      notify("info", "Atualizacao", payload?.message || "Download da atualizacao iniciado.");
      return;
    }

    if (status === "downloaded") {
      notify("success", "Atualizacao pronta", "Clique no icone verde para reiniciar e aplicar.");
      return;
    }

    if (status === "error") {
      notify("error", "Atualizacao", payload?.error || payload?.message || "Falha ao baixar atualizacao.");
      return;
    }
  } catch (error) {
    notify("error", "Atualizacao", error?.message || "Falha ao baixar atualizacao.");
  }
}

async function restartAndInstallAutoUpdate() {
  if (typeof window.launcherApi.autoUpdateRestartAndInstall !== "function") {
    notify("error", "Atualizacao", "API de reinicio para update indisponivel.");
    return;
  }

  try {
    await window.launcherApi.autoUpdateRestartAndInstall();
    setStatus("Reiniciando launcher para aplicar atualizacao...");
  } catch (error) {
    const message = error?.message || "Nao foi possivel reiniciar para atualizar.";
    setStatus(`Erro de atualizacao: ${message}`, true);
    notify("error", "Atualizacao", message);
  }
}

async function handleTopUpdateButtonClick() {
  if (state.autoUpdate.updateDownloaded || state.autoUpdate.status === "downloaded") {
    setUpdateRestartModalOpen(true);
    return;
  }

  if (state.autoUpdate.status === "available") {
    await downloadAutoUpdateNow();
    return;
  }

  if (
    state.autoUpdate.status === "downloading" ||
    state.autoUpdate.status === "checking" ||
    state.autoUpdate.status === "installing"
  ) {
    const message = state.autoUpdate.message || "Atualizacao em andamento.";
    notify("info", "Atualizacao", message);
    return;
  }

  await checkForAutoUpdateManually();
}

function setButtonLabel(button, text) {
  if (!button) return;
  const labelNode = button.querySelector("[data-btn-label]");
  if (labelNode) {
    labelNode.textContent = text;
    return;
  }
  button.textContent = text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeCssUrl(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

function shortPath(pathValue) {
  const value = String(pathValue || "");
  if (!value) return "";
  if (value.length <= 32) return value;
  return `${value.slice(0, 3)}...${value.slice(-25)}`;
}

function formatGameSizeStat(game) {
  const sizeBytes = Number(game?.sizeBytes);
  if (Number.isFinite(sizeBytes) && sizeBytes > 0) {
    const sizeGb = sizeBytes / (1024 ** 3);
    return `${sizeGb.toFixed(sizeGb >= 10 ? 1 : 2).replace(/\.?0+$/, "")} GB`;
  }

  const fallbackText = String(game?.size || "").trim();
  if (!fallbackText || fallbackText.toLowerCase() === "tamanho nao informado") {
    return "--";
  }
  return fallbackText;
}

function formatReleaseDateStat(game) {
  const releaseDateRaw = String(game?.releaseDate || "").trim();
  if (!releaseDateRaw) {
    return "--";
  }

  const parsed = Date.parse(releaseDateRaw);
  if (!Number.isFinite(parsed)) {
    return releaseDateRaw;
  }

  return releaseDateStatFormatter.format(new Date(parsed));
}

function getInstallRootDisplayPath() {
  return state.installRootPath || "C:\\wyzer_games";
}

function closeInstallPathModal(choice = "cancel") {
  installPathModal.classList.add("is-hidden");
  installPathModal.setAttribute("aria-hidden", "true");

  if (installPathModalResolver) {
    installPathModalResolver(choice);
    installPathModalResolver = null;
  }
}

async function askInstallPathChoice() {
  try {
    await refreshInstallRoot();
  } catch (_error) {
    // Keep last known path.
  }

  const currentPath = getInstallRootDisplayPath();
  installPathCurrent.textContent = currentPath;
  installPathCurrent.title = currentPath;
  installPathModal.classList.remove("is-hidden");
  installPathModal.setAttribute("aria-hidden", "false");

  return new Promise((resolve) => {
    installPathModalResolver = resolve;
  });
}

function loadLibraryFromStorage() {
  try {
    const raw = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((entry) => typeof entry === "string" && entry.trim()));
  } catch (_error) {
    return new Set();
  }
}

function saveLibraryToStorage() {
  window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify([...state.libraryGameIds]));
}

function hasPersistedLibrary() {
  return window.localStorage.getItem(LIBRARY_STORAGE_KEY) !== null;
}

function isInLibrary(gameId) {
  return state.libraryGameIds.has(gameId);
}

function addToLibrary(gameId) {
  if (!gameId) return;
  if (state.libraryGameIds.has(gameId)) return;
  state.libraryGameIds.add(gameId);
  saveLibraryToStorage();
}

function removeFromLibrary(gameId) {
  if (!gameId) return;
  if (!state.libraryGameIds.has(gameId)) return;
  state.libraryGameIds.delete(gameId);
  saveLibraryToStorage();
}

function syncLibraryWithInstalled() {
  let changed = false;
  for (const game of state.games) {
    if (game.installed && !state.libraryGameIds.has(game.id)) {
      state.libraryGameIds.add(game.id);
      changed = true;
    }
  }
  if (changed) {
    saveLibraryToStorage();
  }
}

function getCardImage(game) {
  return game.cardImageUrl || game.bannerUrl || game.imageUrl || FALLBACK_CARD_IMAGE;
}

function getBannerImage(game) {
  return game.bannerUrl || game.cardImageUrl || game.imageUrl || FALLBACK_BANNER_IMAGE;
}

function getLogoImage(game) {
  return game.logoUrl || "";
}

function getGameById(gameId) {
  return state.games.find((game) => game.id === gameId);
}

function getInstallProgress(gameId) {
  return state.installProgressByGameId.get(gameId);
}

function isGameUninstalling(gameId) {
  return state.uninstallingGameIds.has(gameId);
}

function isGameBusy(gameId) {
  if (isGameUninstalling(gameId)) return true;
  const progress = getInstallProgress(gameId);
  if (!progress) return false;
  return ACTIVE_INSTALL_PHASES.has(String(progress.phase || "").toLowerCase());
}

function normalizeInstallProgressPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const gameId = String(payload.gameId || "").trim();
  if (!gameId) {
    return null;
  }

  const phase = String(payload.phase || "").trim().toLowerCase() || "preparing";
  const percentRaw = Number(payload.percent);
  const percent = Number.isFinite(percentRaw) ? Math.max(0, Math.min(100, percentRaw)) : 0;

  return {
    ...payload,
    gameId,
    phase,
    percent
  };
}

function getProgressText(progress) {
  if (!progress) return "";
  if (progress.phase === "downloading" && progress.totalBytes > 0) {
    const downloadedMb = (progress.downloadedBytes / 1024 / 1024).toFixed(1);
    const totalMb = (progress.totalBytes / 1024 / 1024).toFixed(1);
    return `${progress.message} (${downloadedMb} MB / ${totalMb} MB)`;
  }
  return progress.message || "";
}

function getActionState(game) {
  if (isGameUninstalling(game.id)) {
    return { action: "busy", label: "Removing...", disabled: true };
  }

  const progress = getInstallProgress(game.id);
  const busy = isGameBusy(game.id);

  if (busy) {
    let label = "Processing...";
    if (progress?.phase === "downloading") {
      const hasKnownPercent = Number.isFinite(progress.percent) && Number.isFinite(progress.totalBytes) && progress.totalBytes > 0;
      if (hasKnownPercent) {
        const percent = Math.max(0, Math.min(100, Math.round(progress.percent)));
        label = `Baixando ${percent}%`;
      } else if (Number.isFinite(progress.downloadedBytes) && progress.downloadedBytes > 0) {
        const downloadedMb = (progress.downloadedBytes / 1024 / 1024).toFixed(1);
        label = `Baixando ${downloadedMb} MB`;
      } else {
        label = "Baixando...";
      }
    }
    if (progress?.phase === "extracting") label = "Extraindo...";
    if (progress?.phase === "preparing") label = "Preparando...";
    return { action: "busy", label, disabled: true };
  }

  if (game.installed) {
    if (game.running) {
      return { action: "close", label: "PARAR JOGO", disabled: false };
    }
    return { action: "play", label: "PLAY GAME", disabled: false };
  }

  if (game.comingSoon) {
    return { action: "soon", label: "Coming Soon", disabled: true };
  }

  return { action: "install", label: "Download Game", disabled: false };
}

function getGalleryImages(game) {
  const fromCatalog = Array.isArray(game.gallery) ? game.gallery : [];
  const list = [...fromCatalog, getBannerImage(game), getCardImage(game)].filter(Boolean);
  return [...new Set(list.map((item) => String(item).trim()).filter(Boolean))];
}

function getGenres(game) {
  if (Array.isArray(game.genres) && game.genres.length > 0) {
    return game.genres.filter(Boolean).map((entry) => String(entry));
  }

  if (typeof game.genre === "string" && game.genre.trim()) {
    return [game.genre.trim()];
  }

  if (typeof game.section === "string" && game.section.trim()) {
    return [game.section.trim()];
  }

  return ["Action", "Adventure"];
}

function getGameGenreFilterEntries(game) {
  const rawValues = [];
  if (Array.isArray(game?.genres)) {
    rawValues.push(...game.genres);
  }
  if (Array.isArray(game?.tags)) {
    rawValues.push(...game.tags);
  }
  if (typeof game?.genre === "string") {
    rawValues.push(game.genre);
  }
  if (typeof game?.tags === "string") {
    rawValues.push(...String(game.tags).split(","));
  }
  if (typeof game?.category === "string") {
    rawValues.push(game.category);
  }
  if (Array.isArray(game?.categories)) {
    rawValues.push(...game.categories);
  }

  const entries = [];
  const used = new Set();
  for (const rawValue of rawValues) {
    const label = String(rawValue || "").trim();
    if (!label) continue;
    const value = normalizeSearchText(label);
    if (!value || used.has(value)) continue;
    used.add(value);
    entries.push({ value, label });
  }
  return entries;
}

function getStoreGenreFilterOptions() {
  const optionsByValue = new Map();
  for (const game of state.games) {
    const entries = getGameGenreFilterEntries(game);
    const sourceEntries = entries.length > 0 ? entries : getGenres(game).map((genre) => ({ label: genre }));
    for (const entry of sourceEntries) {
      const label = String(entry?.label || "").trim();
      if (!label) continue;
      const value = String(entry?.value || normalizeSearchText(label)).trim();
      if (!value || optionsByValue.has(value)) continue;
      optionsByValue.set(value, label);
    }
  }

  return [...optionsByValue.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
}

function getGameModeFlags(game) {
  const parts = [
    game?.mode,
    game?.playMode,
    game?.gameMode,
    game?.playerMode,
    game?.description,
    game?.longDescription,
    ...(Array.isArray(game?.genres) ? game.genres : []),
    ...(Array.isArray(game?.tags) ? game.tags : [])
  ]
    .map((entry) => normalizeSearchText(entry))
    .filter(Boolean);
  const sourceText = parts.join(" ");

  const multiplayerKeywords = [
    "multiplayer",
    "multi player",
    "co op",
    "coop",
    "cooperative",
    "co operative",
    "online coop",
    "online co op",
    "pvp",
    "mmo",
    "squad",
    "players",
    "up to"
  ];
  const soloKeywords = [
    "solo",
    "single player",
    "singleplayer",
    "um jogador",
    "campanha",
    "campaign",
    "story mode",
    "offline"
  ];

  let hasMultiplayer = multiplayerKeywords.some((keyword) => sourceText.includes(keyword));
  let hasSolo = soloKeywords.some((keyword) => sourceText.includes(keyword));

  const maxPlayers = Number(
    game?.maxPlayers ?? game?.max_players ?? game?.playersMax ?? game?.playerCountMax ?? game?.player_count_max ?? 0
  );
  const minPlayers = Number(
    game?.minPlayers ?? game?.min_players ?? game?.playersMin ?? game?.playerCountMin ?? game?.player_count_min ?? 0
  );
  if (Number.isFinite(maxPlayers) && maxPlayers > 1) {
    hasMultiplayer = true;
  }
  if (Number.isFinite(maxPlayers) && maxPlayers === 1) {
    hasSolo = true;
  }
  if (Number.isFinite(minPlayers) && minPlayers === 1 && !hasMultiplayer) {
    hasSolo = true;
  }

  return { hasMultiplayer, hasSolo };
}

function hasStoreAdvancedFiltersActive() {
  return state.storeModeFilter !== "all" || state.storeGenreFilter !== "all";
}

function applyStoreAdvancedFilters(games) {
  let filtered = [...games];

  if (state.storeModeFilter === "multiplayer") {
    filtered = filtered.filter((game) => getGameModeFlags(game).hasMultiplayer);
  } else if (state.storeModeFilter === "solo") {
    filtered = filtered.filter((game) => getGameModeFlags(game).hasSolo);
  }

  if (state.storeGenreFilter !== "all") {
    filtered = filtered.filter((game) =>
      getGameGenreFilterEntries(game).some((entry) => String(entry.value || "").trim() === state.storeGenreFilter)
    );
  }

  return filtered;
}

function parseYoutubeStartSeconds(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return 0;

  if (/^\d+$/.test(raw)) {
    const fromNumber = Number(raw);
    return Number.isFinite(fromNumber) && fromNumber > 0 ? Math.floor(fromNumber) : 0;
  }

  let total = 0;
  const tokens = [...raw.matchAll(/(\d+)\s*(h|m|s)/g)];
  if (!tokens.length) return 0;

  for (const token of tokens) {
    const amount = Number(token?.[1] || 0);
    const unit = token?.[2] || "";
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (unit === "h") total += amount * 3600;
    if (unit === "m") total += amount * 60;
    if (unit === "s") total += amount;
  }

  return total > 0 ? Math.floor(total) : 0;
}

function parseYoutubeSource(urlValue) {
  const rawInput = String(urlValue || "").trim();
  if (!rawInput) return null;

  const idOnlyMatch = rawInput.match(/^[a-zA-Z0-9_-]{11}$/);
  if (idOnlyMatch) {
    return {
      videoId: idOnlyMatch[0],
      list: "",
      startSeconds: 0
    };
  }

  const candidateUrl = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//i.test(rawInput)
    ? rawInput
    : `https://${rawInput.replace(/^\/+/, "")}`;

  try {
    const parsed = new URL(candidateUrl);
    const host = parsed.hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/^m\./, "")
      .replace(/^music\./, "");
    const pathParts = parsed.pathname.split("/").filter(Boolean);

    let videoId = "";

    if (host === "youtu.be") {
      videoId = pathParts[0] || "";
    }

    if (!videoId && (host === "youtube.com" || host === "youtube-nocookie.com")) {
      videoId = parsed.searchParams.get("v") || parsed.searchParams.get("vi") || "";
    }

    if (!videoId && (host === "youtube.com" || host === "youtube-nocookie.com")) {
      const embedIndex = pathParts.indexOf("embed");
      if (embedIndex >= 0 && pathParts[embedIndex + 1]) {
        videoId = pathParts[embedIndex + 1];
      }
    }

    if (!videoId && (host === "youtube.com" || host === "youtube-nocookie.com")) {
      if (["shorts", "live", "v"].includes(pathParts[0]) && pathParts[1]) {
        videoId = pathParts[1];
      }
    }

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return null;
    }

    const list = String(parsed.searchParams.get("list") || "").trim();
    const startSeconds = parseYoutubeStartSeconds(parsed.searchParams.get("t") || parsed.searchParams.get("start"));

    return {
      videoId,
      list,
      startSeconds
    };
  } catch (_error) {
    return null;
  }
}

function toYoutubeEmbed(urlValue) {
  const source = parseYoutubeSource(urlValue);
  if (!source?.videoId) return "";

  const params = new URLSearchParams();
  params.set("rel", "0");
  params.set("playsinline", "1");
  params.set("modestbranding", "1");
  params.set("controls", "1");
  params.set("iv_load_policy", "3");
  params.set("fs", "1");

  if (source.list) {
    params.set("list", source.list);
  }

  if (source.startSeconds > 0) {
    params.set("start", String(source.startSeconds));
  }

  return `https://www.youtube.com/embed/${source.videoId}?${params.toString()}`;
}

function toYoutubeWatchUrl(urlValue) {
  const source = parseYoutubeSource(urlValue);
  if (!source?.videoId) return "";

  const params = new URLSearchParams();
  params.set("v", source.videoId);

  if (source.list) {
    params.set("list", source.list);
  }

  if (source.startSeconds > 0) {
    params.set("t", String(source.startSeconds));
  }

  return `https://www.youtube.com/watch?${params.toString()}`;
}

const DIRECT_VIDEO_EXTENSIONS = new Set(["mp4", "webm", "ogg", "mov", "m4v"]);

function tryDecodeUriComponent(value) {
  const raw = String(value || "");
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch (_error) {
    return raw;
  }
}

function extractDirectVideoExtension(value) {
  const raw = String(value || "");
  if (!raw) return "";

  const candidates = [raw, tryDecodeUriComponent(raw)];
  for (const candidate of candidates) {
    const match = candidate.match(/\.([a-z0-9]{3,4})(?=$|[^a-z0-9])/i);
    const ext = String(match?.[1] || "").toLowerCase();
    if (DIRECT_VIDEO_EXTENSIONS.has(ext)) {
      return ext;
    }
  }

  return "";
}

function extensionToVideoMimeType(extension) {
  const ext = String(extension || "").toLowerCase();
  if (ext === "mp4") return "video/mp4";
  if (ext === "webm") return "video/webm";
  if (ext === "ogg") return "video/ogg";
  if (ext === "mov") return "video/quicktime";
  if (ext === "m4v") return "video/x-m4v";
  return "";
}

function parseDirectVideoInfo(urlValue) {
  const value = String(urlValue || "").trim();
  if (!value) {
    return {
      isDirect: false,
      mimeType: ""
    };
  }

  const rawExtension = extractDirectVideoExtension(value);
  if (rawExtension) {
    return {
      isDirect: true,
      mimeType: extensionToVideoMimeType(rawExtension)
    };
  }

  const lower = value.toLowerCase();
  if (lower.includes("response-content-type=video%2f") || lower.includes("response-content-type=video/")) {
    const mimeMatch = lower.match(/response-content-type=([^&#]+)/i);
    const decodedMime = tryDecodeUriComponent(mimeMatch?.[1] || "").toLowerCase();
    const mimeType = decodedMime.startsWith("video/") ? decodedMime : "";
    return { isDirect: true, mimeType };
  }
  if (lower.includes("content-type=video%2f") || lower.includes("content-type=video/")) {
    const mimeMatch = lower.match(/content-type=([^&#]+)/i);
    const decodedMime = tryDecodeUriComponent(mimeMatch?.[1] || "").toLowerCase();
    const mimeType = decodedMime.startsWith("video/") ? decodedMime : "";
    return { isDirect: true, mimeType };
  }

  const candidateUrl = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//i.test(value)
    ? value
    : `https://${value.replace(/^\/+/, "")}`;

  try {
    const parsed = new URL(candidateUrl);
    const pathExtension = extractDirectVideoExtension(parsed.pathname);
    if (pathExtension) {
      return {
        isDirect: true,
        mimeType: extensionToVideoMimeType(pathExtension)
      };
    }

    const queryValues = [];
    for (const [key, queryValue] of parsed.searchParams.entries()) {
      const lowerKey = String(key || "").toLowerCase();
      if (
        [
          "filename",
          "file",
          "name",
          "download",
          "attachment",
          "response-content-disposition",
          "response-content-type",
          "content-type"
        ].includes(lowerKey)
      ) {
        queryValues.push(queryValue);
      }
    }

    for (const queryValue of queryValues) {
      const maybeMime = tryDecodeUriComponent(queryValue).toLowerCase();
      if (maybeMime.startsWith("video/")) {
        return { isDirect: true, mimeType: maybeMime };
      }
      const queryExtension = extractDirectVideoExtension(queryValue);
      if (queryExtension) {
        return {
          isDirect: true,
          mimeType: extensionToVideoMimeType(queryExtension)
        };
      }
    }

    const hashExtension = extractDirectVideoExtension(parsed.hash);
    if (hashExtension) {
      return {
        isDirect: true,
        mimeType: extensionToVideoMimeType(hashExtension)
      };
    }
  } catch (_error) {
    // Non-URL values fall back to false.
  }

  return {
    isDirect: false,
    mimeType: ""
  };
}

function isDirectVideo(urlValue) {
  return parseDirectVideoInfo(urlValue).isDirect;
}

function hasGameVideoSource(game) {
  if (!game || typeof game !== "object") return false;
  return Boolean(String(game.trailerUrl || game.videoUrl || "").trim());
}

function setDetailsVideoMarkup(mediaKey, html) {
  if (!detailsVideoWrap) return;
  const key = String(mediaKey || "");
  if (detailsVideoWrap.dataset.mediaKey === key) {
    return;
  }
  detailsVideoWrap.dataset.mediaKey = key;
  detailsVideoWrap.innerHTML = html;
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function collapseRepeatedChars(value) {
  return String(value || "").replace(/(.)\1+/g, "$1");
}

function toCompactSearchText(value) {
  return String(value || "").replace(/\s+/g, "");
}

function isEditDistanceWithin(sourceRaw, targetRaw, maxDistance) {
  const source = String(sourceRaw || "");
  const target = String(targetRaw || "");
  const limit = Number(maxDistance);
  if (!source || !target) return false;
  if (!Number.isFinite(limit) || limit < 0) return false;

  const sourceLength = source.length;
  const targetLength = target.length;
  if (Math.abs(sourceLength - targetLength) > limit) return false;

  let previousRow = Array.from({ length: targetLength + 1 }, (_item, index) => index);
  let currentRow = new Array(targetLength + 1);

  for (let i = 1; i <= sourceLength; i += 1) {
    currentRow[0] = i;
    let rowMin = currentRow[0];

    for (let j = 1; j <= targetLength; j += 1) {
      const substitutionCost = source[i - 1] === target[j - 1] ? 0 : 1;
      const value = Math.min(
        previousRow[j] + 1,
        currentRow[j - 1] + 1,
        previousRow[j - 1] + substitutionCost
      );
      currentRow[j] = value;
      if (value < rowMin) rowMin = value;
    }

    if (rowMin > limit) return false;
    [previousRow, currentRow] = [currentRow, previousRow];
  }

  return previousRow[targetLength] <= limit;
}

function getTypoDistanceBudget(lengthValue) {
  const length = Number(lengthValue) || 0;
  if (length <= 4) return 1;
  if (length <= 8) return 2;
  return 3;
}

function buildGameSearchIndex(game) {
  const values = [
    game.id,
    game.name,
    game.description,
    game.longDescription,
    game.section,
    game.developedBy,
    game.publishedBy,
    game.releaseDate,
    ...(Array.isArray(game.genres) ? game.genres : [])
  ];

  const normalizedParts = values.map((entry) => normalizeSearchText(entry)).filter(Boolean);
  const normalizedText = normalizedParts.join(" ");
  const compactText = toCompactSearchText(normalizedText);
  const compactCollapsed = collapseRepeatedChars(compactText);
  const tokens = [...new Set(normalizedText.split(" ").filter(Boolean))];
  const collapsedTokens = [...new Set(tokens.map((token) => collapseRepeatedChars(token)).filter(Boolean))];

  return {
    normalizedText,
    compactText,
    compactCollapsed,
    tokens,
    collapsedTokens
  };
}

function doesSearchTokenMatchIndex(queryTokenRaw, searchIndex) {
  const queryToken = normalizeSearchText(queryTokenRaw);
  if (!queryToken) return true;

  const queryCompact = toCompactSearchText(queryToken);
  const queryCollapsed = collapseRepeatedChars(queryCompact);
  const queryForDistance = queryCollapsed || queryCompact;

  if (queryToken.length >= 2 && searchIndex.normalizedText.includes(queryToken)) {
    return true;
  }

  if (queryCompact.length >= 2 && searchIndex.compactText.includes(queryCompact)) {
    return true;
  }

  if (queryCollapsed.length >= 2 && searchIndex.compactCollapsed.includes(queryCollapsed)) {
    return true;
  }

  if (queryForDistance.length < 3) {
    return false;
  }

  const distanceBudget = getTypoDistanceBudget(queryForDistance.length);
  for (const token of searchIndex.tokens) {
    if (Math.abs(token.length - queryForDistance.length) > distanceBudget) {
      continue;
    }
    if (isEditDistanceWithin(queryForDistance, token, distanceBudget)) {
      return true;
    }
  }

  for (const token of searchIndex.collapsedTokens) {
    if (Math.abs(token.length - queryForDistance.length) > distanceBudget) {
      continue;
    }
    if (isEditDistanceWithin(queryForDistance, token, distanceBudget)) {
      return true;
    }
  }

  return false;
}

function isGameMatchingSmartSearch(game, rawQuery) {
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (!normalizedQuery) return true;

  const searchIndex = buildGameSearchIndex(game);
  if (normalizedQuery.length === 1) {
    return searchIndex.normalizedText.includes(normalizedQuery);
  }

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const longTokens = queryTokens.filter((token) => token.length >= 2);
  const allTokensMatch = longTokens.every((token) => doesSearchTokenMatchIndex(token, searchIndex));

  if (longTokens.length > 1) {
    if (allTokensMatch) return true;
  }

  const compactQuery = toCompactSearchText(normalizedQuery);
  if (compactQuery.length >= 2 && doesSearchTokenMatchIndex(compactQuery, searchIndex)) {
    return true;
  }

  const collapsedCompactQuery = collapseRepeatedChars(compactQuery);
  if (
    collapsedCompactQuery &&
    collapsedCompactQuery !== compactQuery &&
    doesSearchTokenMatchIndex(collapsedCompactQuery, searchIndex)
  ) {
    return true;
  }

  if (longTokens.length === 1) {
    return doesSearchTokenMatchIndex(longTokens[0], searchIndex);
  }

  if (longTokens.length > 1) {
    return allTokensMatch;
  }

  return false;
}

function getSearchFilteredGames(games) {
  const query = state.search.trim();
  if (!query) return [...games];
  return games.filter((game) => isGameMatchingSmartSearch(game, query));
}

function getStoreGames() {
  let games = getSearchFilteredGames(state.games);

  if (state.storeFilter === "downloaded") {
    games = games.filter((game) => game.installed || isInLibrary(game.id));
  }

  games = applyStoreAdvancedFilters(games);

  if (state.storeFilter === "top") {
    games.sort((a, b) => {
      const scoreA = Number(Boolean(a.installed)) + Number(Boolean(isInLibrary(a.id)));
      const scoreB = Number(Boolean(b.installed)) + Number(Boolean(isInLibrary(b.id)));
      if (scoreB !== scoreA) return scoreB - scoreA;
      return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR", { sensitivity: "base" });
    });
  }

  return games;
}

function getLibraryGames() {
  return getLibraryGamesBySearchMode(true);
}

function getLibraryGamesBySearchMode(applySearch = true) {
  const libraryIds = new Set([...state.libraryGameIds]);
  const result = [];
  for (const gameId of libraryIds) {
    const game = getGameById(gameId);
    if (game) result.push(game);
  }

  const games = applySearch ? getSearchFilteredGames(result) : [...result];
  games.sort((a, b) => {
    if (Boolean(b.installed) !== Boolean(a.installed)) {
      return Number(Boolean(b.installed)) - Number(Boolean(a.installed));
    }
    return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR", { sensitivity: "base" });
  });

  return games;
}

function updateHeaderForView() {
  if (state.view === "store") {
    if (state.storeFilter === "popular") viewTitle.textContent = "Jogos";
    if (state.storeFilter === "downloaded") viewTitle.textContent = "Most Downloaded";
    if (state.storeFilter === "top") viewTitle.textContent = "Top Rated";
    return;
  }

  if (state.view === "library") {
    viewTitle.textContent = "Library";
    return;
  }

  if (state.view === "downloads") {
    viewTitle.textContent = "Downloads";
    return;
  }

  const selected = getGameById(state.selectedGameId);
  viewTitle.textContent = selected?.name || "Game";
}

function syncSearchVisibility() {
  const canUseSearch = state.view === "store" || state.view === "library";
  const shouldOpen = canUseSearch && (state.searchOpen || state.search.trim().length > 0);
  searchWrap.classList.toggle("is-hidden", !canUseSearch);
  searchWrap.classList.toggle("is-open", shouldOpen);
  searchWrap.classList.toggle("is-collapsed", !shouldOpen);
  if (topSearchToggle) {
    topSearchToggle.classList.toggle("is-active", shouldOpen);
  }
}

function closeSearch(clearQuery = true) {
  state.searchOpen = false;
  if (clearQuery) {
    state.search = "";
    searchInput.value = "";
    renderStoreGrid();
    renderLibraryGrid();
  }
  syncSearchVisibility();
}

function setView(nextView) {
  if (!["store", "details", "library", "downloads"].includes(nextView)) {
    return;
  }

  if (nextView !== "details") {
    state.lastNonDetailView = nextView;
  } else {
    state.searchOpen = false;
  }

  state.view = nextView;
  setAccountMenuOpen(false);
  if (nextView !== "library") {
    closeLibraryCardMenu();
  }
  if (nextView !== "store") {
    state.storeAdvancedFiltersOpen = false;
  }
  document.body.classList.toggle("view-details", nextView === "details");
  document.body.classList.toggle("view-downloads", nextView === "downloads");

  storeView.classList.toggle("is-active", nextView === "store");
  detailsView.classList.toggle("is-active", nextView === "details");
  libraryView.classList.toggle("is-active", nextView === "library");
  downloadsView.classList.toggle("is-active", nextView === "downloads");

  const activeTopView = nextView === "details" ? state.lastNonDetailView : nextView;
  navStoreBtn.classList.toggle("is-active", activeTopView === "store");
  navLibraryBtn.classList.toggle("is-active", activeTopView === "library");

  storeFilterRow.style.display = nextView === "store" ? "inline-flex" : "none";
  syncSearchVisibility();

  updateHeaderForView();
}

function getCoverDotStateClass(game) {
  if (isGameBusy(game.id)) return "state-busy";
  if (game.installed) return "state-installed";
  if (game.comingSoon) return "state-soon";
  return "";
}

function getStoreShelfTitle() {
  if (state.storeFilter === "downloaded") return "Mais baixados";
  if (state.storeFilter === "top") return "Mais bem avaliados";
  return "Descubra algo novo";
}

function getStoreCardKind(game) {
  const value = String(game.storeType || game.productType || game.storeKind || game.cardKind || "").trim();
  return value || "WPlay Games - Gratuito";
}

function getStoreFeatureTag(game) {
  const explicit = String(game.storeTag || game.badge || game.highlightTag || "").trim();
  if (explicit) return explicit;
  if (game.exclusive === true) return "Exclusividades";
  return "";
}

function parseLooseNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  const raw = String(value || "").trim();
  if (!raw) return NaN;

  let normalized = raw.replace(/[^\d,.\-]/g, "");
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");
  if (hasComma && hasDot) {
    if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : NaN;
}

function formatCurrencyBRL(value) {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function normalizePriceLabel(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? formatCurrencyBRL(value) : "";
  }

  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/[A-Za-z]/.test(raw) || raw.includes("R$")) return raw;

  const numeric = parseLooseNumber(raw);
  if (Number.isFinite(numeric) && numeric > 0) {
    return formatCurrencyBRL(numeric);
  }

  return raw;
}

function getStorePriceInfo(game) {
  if (game.comingSoon) {
    return {
      mode: "soon",
      current: "Em breve"
    };
  }

  const freeFlag = game.isFree === true || game.free === true;
  const currentLabel = normalizePriceLabel(game.currentPrice || game.salePrice || game.price);
  const originalLabel = normalizePriceLabel(game.originalPrice || game.listPrice || game.basePrice);

  let discountPercent = parseLooseNumber(game.discountPercent ?? game.discount ?? "");
  if (!Number.isFinite(discountPercent) || discountPercent <= 0) {
    const currentNumeric = parseLooseNumber(currentLabel);
    const originalNumeric = parseLooseNumber(originalLabel);
    if (Number.isFinite(currentNumeric) && Number.isFinite(originalNumeric) && originalNumeric > currentNumeric) {
      discountPercent = Math.round(((originalNumeric - currentNumeric) / originalNumeric) * 100);
    }
  }

  if (freeFlag || (!currentLabel && !originalLabel)) {
    return {
      mode: "free",
      current: ""
    };
  }

  if (
    currentLabel &&
    originalLabel &&
    currentLabel !== originalLabel &&
    Number.isFinite(discountPercent) &&
    discountPercent > 0
  ) {
    return {
      mode: "discount",
      current: currentLabel,
      original: originalLabel,
      discount: `-${Math.round(discountPercent)}%`
    };
  }

  return {
    mode: "price",
    current: currentLabel || originalLabel || ""
  };
}

function getStorePriceMarkup(game) {
  const priceInfo = getStorePriceInfo(game);
  if (priceInfo.mode === "discount") {
    return `
      <span class="store-card-price-row">
        <span class="store-card-discount-badge">${escapeHtml(priceInfo.discount)}</span>
        <span class="store-card-original-price">${escapeHtml(priceInfo.original)}</span>
        <span class="store-card-current-price">${escapeHtml(priceInfo.current)}</span>
      </span>
    `;
  }

  if (priceInfo.mode === "free") {
    return "";
  }

  const rowClass = priceInfo.mode === "free" ? "store-card-price-row is-free" : "store-card-price-row";
  return `
    <span class="${rowClass}">
      <span class="store-card-current-price">${escapeHtml(priceInfo.current)}</span>
    </span>
  `;
}

function getDownloadPhaseLabel(progress) {
  if (!progress) return "Processando";
  if (progress.phase === "preparing") return "Preparando";
  if (progress.phase === "downloading") return "Baixando";
  if (progress.phase === "extracting") return "Extraindo";
  if (progress.phase === "completed") return "Pronto";
  return "Processando";
}

function getActiveDownloadEntries() {
  const entries = [];
  for (const [gameId, progress] of state.installProgressByGameId.entries()) {
    if (!progress || !["preparing", "downloading", "extracting"].includes(progress.phase)) {
      continue;
    }

    const game = getGameById(gameId);
    entries.push({
      gameId,
      name: game?.name || "Jogo",
      progress
    });
  }

  entries.sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR", { sensitivity: "base" }));
  return entries;
}

function pruneRecentCompletedDownloads() {
  const now = Date.now();
  const sourceEntries = Array.isArray(state.recentCompletedDownloadsByGameId)
    ? state.recentCompletedDownloadsByGameId
    : [];
  const nextEntries = [];

  for (const meta of sourceEntries) {
    const gameId = String(meta?.gameId || "").trim();
    const completedAt = Number(meta?.completedAt || 0);
    if (!gameId) {
      continue;
    }
    if (!Number.isFinite(completedAt) || completedAt <= 0) {
      continue;
    }
    if (now - completedAt > RECENT_COMPLETED_DOWNLOAD_TTL_MS) {
      continue;
    }

    const game = getGameById(gameId);
    const fallbackName = String(meta?.name || "").trim();
    if (!game && !fallbackName) {
      continue;
    }

    nextEntries.push({
      gameId,
      completedAt,
      name: fallbackName,
      cardImageUrl: String(meta?.cardImageUrl || "").trim(),
      bannerUrl: String(meta?.bannerUrl || "").trim(),
      imageUrl: String(meta?.imageUrl || "").trim()
    });
  }

  nextEntries.sort((a, b) => b.completedAt - a.completedAt);
  const dedupedEntries = [];
  const seenGameIds = new Set();
  for (const entry of nextEntries) {
    if (seenGameIds.has(entry.gameId)) {
      continue;
    }
    seenGameIds.add(entry.gameId);
    dedupedEntries.push(entry);
    if (dedupedEntries.length >= RECENT_COMPLETED_DOWNLOAD_MAX_ITEMS) {
      break;
    }
  }

  state.recentCompletedDownloadsByGameId = dedupedEntries;
}

function rememberRecentCompletedDownload(gameId) {
  const normalizedGameId = String(gameId || "").trim();
  if (!normalizedGameId) return;

  const game = getGameById(normalizedGameId);
  const nextEntry = {
    gameId: normalizedGameId,
    name: game?.name ? String(game.name || "").trim() : "",
    cardImageUrl: game ? String(getCardImage(game) || "").trim() : "",
    bannerUrl: game ? String(game.bannerUrl || "").trim() : "",
    imageUrl: game ? String(game.imageUrl || "").trim() : "",
    completedAt: Date.now()
  };

  const previousEntries = Array.isArray(state.recentCompletedDownloadsByGameId)
    ? state.recentCompletedDownloadsByGameId
    : [];
  state.recentCompletedDownloadsByGameId = [
    nextEntry,
    ...previousEntries.filter((entry) => String(entry?.gameId || "").trim() !== normalizedGameId)
  ];
  pruneRecentCompletedDownloads();
}

function clearRecentCompletedDownload(gameId) {
  const normalizedGameId = String(gameId || "").trim();
  if (!normalizedGameId) return;
  const previousEntries = Array.isArray(state.recentCompletedDownloadsByGameId)
    ? state.recentCompletedDownloadsByGameId
    : [];
  state.recentCompletedDownloadsByGameId = previousEntries.filter(
    (entry) => String(entry?.gameId || "").trim() !== normalizedGameId
  );
}

function getRecentCompletedDownloadEntries() {
  pruneRecentCompletedDownloads();
  const entries = [];
  const sourceEntries = Array.isArray(state.recentCompletedDownloadsByGameId)
    ? state.recentCompletedDownloadsByGameId
    : [];

  for (const meta of sourceEntries) {
    const gameId = String(meta?.gameId || "").trim();
    if (!gameId) {
      continue;
    }

    const game = getGameById(gameId);
    const name = game?.name || String(meta?.name || "").trim() || "Jogo";
    const cardImageUrl = game
      ? getCardImage(game)
      : String(meta?.cardImageUrl || meta?.bannerUrl || meta?.imageUrl || FALLBACK_CARD_IMAGE).trim() ||
        FALLBACK_CARD_IMAGE;

    let action = "details";
    let actionLabel = "VER JOGO";
    if (game) {
      const actionState = getActionState(game);
      if (actionState.action === "close" || actionState.action === "play") {
        action = actionState.action;
        actionLabel = actionState.action === "close" ? "PARAR JOGO" : "JOGAR";
      }
    }

    const completedAt = Number(meta?.completedAt || 0);
    if (!Number.isFinite(completedAt) || completedAt <= 0) {
      continue;
    }

    entries.push({
      gameId,
      completedAt,
      game,
      name,
      cardImageUrl,
      action,
      actionLabel
    });
  }
  entries.sort((a, b) => b.completedAt - a.completedAt);
  return entries;
}

function formatBytesPerSecond(bytesPerSecond) {
  const value = Number(bytesPerSecond);
  if (!Number.isFinite(value) || value <= 0) return "0 bps";
  if (value < 1024) return `${Math.round(value)} B/s`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB/s`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB/s`;
}

function getDownloadSpeedForGame(gameId) {
  const speedData = state.downloadSpeedByGameId.get(gameId);
  if (!speedData) return 0;
  const speed = Number(speedData.bps || 0);
  return Number.isFinite(speed) && speed > 0 ? speed : 0;
}

function renderRailDownloads() {
  if (!railDownloadsBtn || !railDownloadsCount) return;

  const activeDownloads = getActiveDownloadEntries();
  const hasActiveDownloads = activeDownloads.length > 0;

  railDownloadsBtn.classList.remove("is-hidden");
  railDownloadsBtn.classList.toggle("is-busy", hasActiveDownloads);
  railDownloadsBtn.classList.toggle("is-active", state.view === "downloads");
  railDownloadsBtn.setAttribute("aria-expanded", state.view === "downloads" ? "true" : "false");
  railDownloadsCount.classList.toggle("is-hidden", !hasActiveDownloads);
  railDownloadsCount.textContent = String(Math.min(activeDownloads.length, 99));
}

function renderDownloadsView() {
  if (!downloadsView || !downloadsActiveSection || !downloadsActiveList || !downloadsEmptyState) return;

  const activeDownloads = getActiveDownloadEntries();
  const recentCompletedDownloads = getRecentCompletedDownloadEntries();
  const hasActiveDownloads = activeDownloads.length > 0;
  const hasRecentCompleted = recentCompletedDownloads.length > 0;
  const hasEntries = hasActiveDownloads || hasRecentCompleted;

  downloadsActiveSection.classList.toggle("is-hidden", !hasEntries);
  downloadsActiveSection.classList.toggle("is-collapsed", state.downloadsSectionCollapsed);
  downloadsEmptyState.classList.toggle("is-hidden", hasEntries);
  if (downloadsActiveCollapseBtn) {
    downloadsActiveCollapseBtn.setAttribute(
      "aria-label",
      state.downloadsSectionCollapsed ? "Expandir downloads ativos" : "Recolher downloads ativos"
    );
  }
  if (downloadsActiveCount) {
    downloadsActiveCount.textContent = String(activeDownloads.length);
  }

  if (!hasEntries) {
    state.downloadsSectionCollapsed = false;
    downloadsActiveList.innerHTML = "";
    return;
  }

  const activeMarkup = activeDownloads
    .map(({ gameId, name, progress }) => {
      const game = getGameById(gameId);
      const hasKnownTotalBytes = Number.isFinite(progress?.totalBytes) && progress.totalBytes > 0;
      const hasKnownPercent = Number.isFinite(progress?.percent);
      const percent = hasKnownPercent
        ? Math.max(0, Math.min(100, progress.percent))
        : progress?.phase === "extracting"
          ? 96
          : progress?.phase === "preparing"
            ? 72
            : 0;
      const percentText = `${Math.round(percent)}%`;
      const isIndeterminate =
        progress?.phase === "preparing" ||
        progress?.phase === "extracting" ||
        (progress?.phase === "downloading" && !hasKnownTotalBytes);
      const indeterminateClass = isIndeterminate ? "is-indeterminate" : "";
      const phaseText = getDownloadPhaseLabel(progress);
      const sourceLabel = String(progress?.sourceLabel || "").trim();
      const speedText = progress?.phase === "downloading" ? formatBytesPerSecond(getDownloadSpeedForGame(gameId)) : "--";
      const phaseLabel = sourceLabel ? `${phaseText} • ${sourceLabel}` : phaseText;

      return `
        <article class="downloads-item" data-open-game="${escapeHtml(gameId)}" aria-label="Download de ${escapeHtml(name)}">
          <div class="downloads-item-cover-wrap">
            <img class="downloads-item-cover" src="${escapeHtml(getCardImage(game || {}))}" alt="Capa de ${escapeHtml(name)}" loading="lazy" />
          </div>

          <div class="downloads-item-content">
            <div class="downloads-item-top">
              <strong>${escapeHtml(name)}</strong>
              <div class="downloads-item-right">
                <span class="downloads-item-speed">${escapeHtml(speedText)}</span>
                <span class="downloads-item-percent">${escapeHtml(percentText)}</span>
              </div>
            </div>

            <span class="downloads-item-phase">${escapeHtml(phaseLabel)}</span>

            <div class="downloads-item-progress ${indeterminateClass}" aria-hidden="true">
              <div class="downloads-item-progress-fill" style="width: ${percent}%"></div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  const recentMarkup = recentCompletedDownloads
    .map(({ gameId, name, cardImageUrl, action, actionLabel }) => {
      return `
        <article class="downloads-item is-completed" data-open-game="${escapeHtml(gameId)}" aria-label="Instalacao concluida de ${escapeHtml(name)}">
          <div class="downloads-item-cover-wrap">
            <img class="downloads-item-cover" src="${escapeHtml(cardImageUrl || FALLBACK_CARD_IMAGE)}" alt="Capa de ${escapeHtml(name)}" loading="lazy" />
          </div>

          <div class="downloads-item-content">
            <div class="downloads-item-top">
              <strong>${escapeHtml(name)}</strong>
              <div class="downloads-item-right">
                <span class="downloads-item-speed">Pronto</span>
                <span class="downloads-item-percent">100%</span>
              </div>
            </div>

            <span class="downloads-item-phase">Instalacao concluida</span>

            <div class="downloads-item-progress" aria-hidden="true">
              <div class="downloads-item-progress-fill" style="width: 100%"></div>
            </div>

            <div class="downloads-item-actions">
              <button
                type="button"
                class="downloads-item-action-btn"
                data-download-action="${escapeHtml(action)}"
                data-game-id="${escapeHtml(gameId)}"
              >
                ${escapeHtml(actionLabel)}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  const readyBlock = hasRecentCompleted
    ? `
      <div class="downloads-subsection-title">Prontos para jogar</div>
      ${recentMarkup}
    `
    : "";

  downloadsActiveList.innerHTML = `${activeMarkup}${readyBlock}`;
}

function renderStoreGrid() {
  const genreOptions = getStoreGenreFilterOptions();
  if (state.storeGenreFilter !== "all" && !genreOptions.some((entry) => entry.value === state.storeGenreFilter)) {
    state.storeGenreFilter = "all";
  }
  const games = getStoreGames();
  const trimmedSearch = state.search.trim();
  const hasSearch = trimmedSearch.length > 0;
  const hasAdvancedFilters = hasStoreAdvancedFiltersActive();
  const currentStoreSignature = `${state.storeFilter}|${state.search.trim().toLowerCase()}|${games
    .map((game) => game.id)
    .join("|")}`;
  const shouldAnimateIn = currentStoreSignature !== previousStoreGridSignature;
  previousStoreGridSignature = currentStoreSignature;

  if (games.length === 0) {
    const safeQuery = escapeHtml(trimmedSearch);
    const emptyMessage = hasSearch
      ? `Nenhum jogo encontrado para "${safeQuery}".`
      : "Nenhum jogo encontrado com os filtros atuais.";
    const clearFiltersButton = hasAdvancedFilters
      ? `<button class="store-empty-reset-btn" type="button" data-store-advanced-filter-reset="true">Limpar filtros</button>`
      : "";
    storeGrid.innerHTML = `
      <div class="store-empty-state">
        <p class="store-empty-text">${emptyMessage}</p>
        ${clearFiltersButton}
      </div>
    `;
    return;
  }

  const shelfTitle = getStoreShelfTitle();
  const modeOptions = [
    { value: "all", label: "Todos" },
    { value: "multiplayer", label: "Multiplayer" },
    { value: "solo", label: "Solo" }
  ];
  const modeOptionsMarkup = modeOptions
    .map((option) => {
      const activeClass = state.storeModeFilter === option.value ? "is-active" : "";
      return `
        <button
          class="store-shelf-filter-chip ${activeClass}"
          type="button"
          data-store-mode-filter="${escapeHtml(option.value)}"
        >
          ${escapeHtml(option.label)}
        </button>
      `;
    })
    .join("");
  const genreOptionsMarkup = [{ value: "all", label: "Todos" }, ...genreOptions]
    .map((option) => {
      const activeClass = state.storeGenreFilter === option.value ? "is-active" : "";
      return `
        <button
          class="store-shelf-filter-chip ${activeClass}"
          type="button"
          data-store-genre-filter="${escapeHtml(option.value)}"
        >
          ${escapeHtml(option.label)}
        </button>
      `;
    })
    .join("");
  const filterMenuOpenClass = state.storeAdvancedFiltersOpen ? "is-open" : "";
  const filterButtonOpenClass = state.storeAdvancedFiltersOpen ? "is-open" : "";
  const filterButtonActiveClass = hasAdvancedFilters ? "is-active" : "";
  const filterExpanded = state.storeAdvancedFiltersOpen ? "true" : "false";
  const cardsMarkup = games
    .map((game) => {
      const busyClass = isGameBusy(game.id) ? "is-busy" : "";
      const progress = getInstallProgress(game.id);
      const downloadingClass = progress?.phase === "downloading" ? "is-downloading" : "";
      const dotStateClass = getCoverDotStateClass(game);
      const cardKind = getStoreCardKind(game);
      const featureTag = getStoreFeatureTag(game);
      const hasKnownTotalBytes = Number.isFinite(progress?.totalBytes) && progress.totalBytes > 0;
      const progressPercent =
        Number.isFinite(progress?.percent) && hasKnownTotalBytes ? Math.max(0, Math.min(100, progress.percent)) : 34;
      const indeterminateClass =
        progress?.phase === "downloading" && !hasKnownTotalBytes ? "is-indeterminate" : "";
      const progressHtml = isGameBusy(game.id)
        ? `
          <span class="store-card-progress-track ${indeterminateClass}" aria-hidden="true">
            <span class="store-card-progress-fill" style="width: ${progressPercent}%"></span>
          </span>
        `
        : "";
      const downloadStatusText = isGameBusy(game.id)
        ? `
          <span class="store-card-download-state">
            ${escapeHtml(
              hasKnownTotalBytes && Number.isFinite(progress?.percent)
                ? `${getDownloadPhaseLabel(progress)} ${Math.round(progress.percent)}%`
                : `${getDownloadPhaseLabel(progress)}...`
            )}
          </span>
        `
        : "";

      return `
        <button
          class="store-card ${busyClass} ${downloadingClass}"
          type="button"
          data-open-game="${escapeHtml(game.id)}"
          aria-label="Abrir ${escapeHtml(game.name)}"
        >
          <span class="store-card-poster">
            <img src="${escapeHtml(getCardImage(game))}" alt="Capa de ${escapeHtml(game.name)}" loading="lazy" />
            <span class="store-card-state-dot ${dotStateClass}" aria-hidden="true"></span>
            ${progressHtml}
          </span>
          <span class="store-card-meta" aria-hidden="true">
            <span class="store-card-kind">${escapeHtml(cardKind)}</span>
            <span class="store-card-name">${escapeHtml(game.name)}</span>
            ${
              featureTag
                ? `
                  <span class="store-card-feature-badge">
                    <span class="store-card-feature-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M6 17.5H18L19.2 8.8L14.9 12.1L12 7.3L9.1 12.1L4.8 8.8L6 17.5Z" fill="currentColor"></path>
                      </svg>
                    </span>
                    ${escapeHtml(featureTag)}
                  </span>
                `
                : ""
            }
            ${getStorePriceMarkup(game)}
            ${downloadStatusText}
          </span>
          <span class="visually-hidden">${escapeHtml(game.name)}</span>
        </button>
      `;
    })
    .join("");

  storeGrid.innerHTML = `
    <section class="store-shelf" aria-label="${escapeHtml(shelfTitle)}">
      <header class="store-shelf-head">
        <h2 class="store-shelf-title">
          ${escapeHtml(shelfTitle)}
          <span class="store-shelf-title-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M9 6.8L14.2 12L9 17.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
          </span>
        </h2>

        <div class="store-shelf-nav" aria-label="Navegar pela vitrine">
          <div class="store-shelf-filter-wrap" data-store-advanced-filter-wrap>
            <button
              class="store-shelf-nav-btn store-shelf-filter-btn ${filterButtonOpenClass} ${filterButtonActiveClass}"
              type="button"
              data-store-advanced-filter-toggle="true"
              aria-label="Filtros avancados"
              aria-haspopup="menu"
              aria-expanded="${filterExpanded}"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5.5 7.5H18.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
                <circle cx="9" cy="7.5" r="1.7" stroke="currentColor" stroke-width="1.5"></circle>
                <path d="M5.5 12H18.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
                <circle cx="15" cy="12" r="1.7" stroke="currentColor" stroke-width="1.5"></circle>
                <path d="M5.5 16.5H18.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
                <circle cx="11.5" cy="16.5" r="1.7" stroke="currentColor" stroke-width="1.5"></circle>
              </svg>
              <span class="store-shelf-filter-indicator ${hasAdvancedFilters ? "is-visible" : ""}" aria-hidden="true"></span>
            </button>

            <section class="store-shelf-filter-menu ${filterMenuOpenClass}" data-store-advanced-filter-menu role="menu">
              <div class="store-shelf-filter-group">
                <p class="store-shelf-filter-group-title">Modo</p>
                <div class="store-shelf-filter-options">
                  ${modeOptionsMarkup}
                </div>
              </div>

              <div class="store-shelf-filter-group">
                <p class="store-shelf-filter-group-title">Genero</p>
                <div class="store-shelf-filter-options">
                  ${genreOptionsMarkup}
                </div>
              </div>

              <button class="store-shelf-filter-reset" type="button" data-store-advanced-filter-reset="true">
                Limpar filtros
              </button>
            </section>
          </div>

          <button class="store-shelf-nav-btn" type="button" data-store-scroll="-1" aria-label="Scroll para esquerda">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M14.8 6.6L9.4 12L14.8 17.4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
          </button>
          <button class="store-shelf-nav-btn" type="button" data-store-scroll="1" aria-label="Scroll para direita">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9.2 6.6L14.6 12L9.2 17.4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
          </button>
        </div>
      </header>

      <div class="store-shelf-track-wrap">
        <div class="store-shelf-track" data-store-track>
          ${cardsMarkup}
        </div>
      </div>
    </section>
  `;

  if (animate && shouldAnimateIn) {
    const cards = storeGrid.querySelectorAll(".store-card");
    animate(
      cards,
      { opacity: [0, 1], y: [18, 0] },
      { duration: 0.36, delay: stagger ? stagger(0.04) : 0, easing: [0.22, 1, 0.36, 1] }
    );
  }
}

function getLibraryCardSubtitle(game) {
  if (isGameUninstalling(game.id)) return "Removendo...";
  if (isGameBusy(game.id)) return `${getDownloadPhaseLabel(getInstallProgress(game.id))}...`;
  if (game.running) return "Em execucao";
  if (game.installed) {
    return game.size && game.size !== "Tamanho nao informado" ? `Instalado • ${game.size}` : "Instalado";
  }
  if (game.comingSoon) return "Em breve";
  return "Na biblioteca";
}

function getLibraryCardActionLabel(game) {
  if (isGameUninstalling(game.id)) return "Removendo";
  if (isGameBusy(game.id)) return getDownloadPhaseLabel(getInstallProgress(game.id));
  if (game.running) return "Fechar jogo";
  if (game.installed) return "Jogar";
  return "Abrir jogo";
}

function getLibraryGridSignature(libraryGames) {
  const searchKey = state.search.trim().toLowerCase();
  if (!Array.isArray(libraryGames) || libraryGames.length === 0) {
    return `${searchKey}|empty`;
  }

  const cardsKey = libraryGames
    .map((game) =>
      [
        game.id,
        getCardImage(game),
        isGameBusy(game.id) ? "busy" : "idle",
        isGameUninstalling(game.id) ? "removing" : "stable",
        getLibraryCardActionLabel(game),
        getLibraryCardSubtitle(game)
      ].join("~")
    )
    .join("|");

  return `${searchKey}|${cardsKey}`;
}

function syncLibraryCardMenus() {
  if (!libraryGrid) return;
  const openGameId = String(state.openLibraryMenuGameId || "");

  const menuToggles = libraryGrid.querySelectorAll("[data-library-menu-toggle]");
  menuToggles.forEach((toggle) => {
    const gameId = String(toggle.getAttribute("data-library-menu-toggle") || "");
    const isOpen = openGameId && gameId === openGameId;
    toggle.classList.toggle("is-open", Boolean(isOpen));
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  const menus = libraryGrid.querySelectorAll("[data-library-menu]");
  menus.forEach((menu) => {
    const gameId = String(menu.getAttribute("data-library-menu") || "");
    const isOpen = openGameId && gameId === openGameId;
    menu.classList.toggle("is-open", Boolean(isOpen));
  });
}

function closeLibraryCardMenu() {
  if (!state.openLibraryMenuGameId) return;
  state.openLibraryMenuGameId = "";
  syncLibraryCardMenus();
}

function toggleLibraryCardMenu(gameId) {
  const safeGameId = String(gameId || "");
  if (!safeGameId) {
    closeLibraryCardMenu();
    return;
  }

  state.openLibraryMenuGameId = state.openLibraryMenuGameId === safeGameId ? "" : safeGameId;
  syncLibraryCardMenus();
}

function renderLibraryGrid() {
  const fullLibraryGames = getLibraryGamesBySearchMode(false);
  const libraryGames = getLibraryGames();
  const trimmedSearch = state.search.trim();
  const hasSearch = trimmedSearch.length > 0;
  const gameIds = new Set(libraryGames.map((game) => game.id));
  if (state.openLibraryMenuGameId && !gameIds.has(state.openLibraryMenuGameId)) {
    state.openLibraryMenuGameId = "";
  }

  const currentLibrarySignature = getLibraryGridSignature(libraryGames);
  if (currentLibrarySignature === previousLibraryGridSignature) {
    syncLibraryCardMenus();
    return;
  }
  previousLibraryGridSignature = currentLibrarySignature;

  if (libraryGames.length === 0) {
    if (hasSearch && fullLibraryGames.length > 0) {
      libraryGrid.classList.add("is-empty");
      libraryGrid.innerHTML = `
        <div class="library-empty-state">
          <div class="library-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4.8 8.5C4.8 7.2 5.8 6.2 7.1 6.2H16.9C18.2 6.2 19.2 7.2 19.2 8.5V17.1C19.2 18.4 18.2 19.4 16.9 19.4H7.1C5.8 19.4 4.8 18.4 4.8 17.1V8.5Z" stroke="currentColor" stroke-width="1.7"></path>
              <path d="M9.1 4.8H14.9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
              <path d="M8.4 11.1H15.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path>
              <path d="M8.4 14.2H13.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path>
            </svg>
          </div>
          <p class="library-empty-text">Nenhum jogo encontrado para "${escapeHtml(trimmedSearch)}".</p>
          <button class="library-empty-btn" type="button" data-clear-search="true">Limpar busca</button>
        </div>
      `;
      syncLibraryCardMenus();
      return;
    }

    libraryGrid.classList.add("is-empty");
    libraryGrid.innerHTML = `
      <div class="library-empty-state">
        <div class="library-empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4.8 8.5C4.8 7.2 5.8 6.2 7.1 6.2H16.9C18.2 6.2 19.2 7.2 19.2 8.5V17.1C19.2 18.4 18.2 19.4 16.9 19.4H7.1C5.8 19.4 4.8 18.4 4.8 17.1V8.5Z" stroke="currentColor" stroke-width="1.7"></path>
            <path d="M9.1 4.8H14.9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
            <path d="M8.4 11.1H15.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path>
            <path d="M8.4 14.2H13.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path>
          </svg>
        </div>
        <p class="library-empty-text">Sua biblioteca esta vazia. Clique em Add to Library ou Download Game.</p>
        <button class="library-empty-btn" type="button" data-go-store="true">Ir para Jogos</button>
      </div>
    `;
    syncLibraryCardMenus();
    return;
  }

  libraryGrid.classList.remove("is-empty");
  libraryGrid.innerHTML = libraryGames
    .map((game) => {
      const isMenuOpen = state.openLibraryMenuGameId === game.id;
      const menuButtonExpanded = isMenuOpen ? "true" : "false";
      const menuOpenClass = isMenuOpen ? "is-open" : "";
      const showMenu = game.installed || isGameUninstalling(game.id);
      const uninstallDisabled = !game.installed || isGameBusy(game.id) ? "disabled" : "";
      const openFolderDisabled = !game.installed || isGameUninstalling(game.id) ? "disabled" : "";

      return `
        <article class="library-card">
          <button class="library-card-open" type="button" data-open-game="${escapeHtml(game.id)}" aria-label="Abrir ${escapeHtml(game.name)}">
            <div class="library-card-thumb">
              <img src="${escapeHtml(getCardImage(game))}" alt="Capa de ${escapeHtml(game.name)}" loading="lazy" />
            </div>
          </button>
          <div class="library-card-body">
            <div class="library-card-head">
              <button class="library-card-title-btn" type="button" data-open-game="${escapeHtml(game.id)}">
                <strong>${escapeHtml(game.name)}</strong>
              </button>
              ${
                showMenu
                  ? `
                    <div class="library-card-menu-wrap">
                      <button
                        class="library-card-menu-btn ${menuOpenClass}"
                        type="button"
                        data-library-menu-toggle="${escapeHtml(game.id)}"
                        aria-haspopup="menu"
                        aria-expanded="${menuButtonExpanded}"
                        aria-label="Opcoes de ${escapeHtml(game.name)}"
                      >
                        <span aria-hidden="true">...</span>
                      </button>
                      <div class="library-card-menu ${menuOpenClass}" data-library-menu="${escapeHtml(game.id)}" role="menu">
                        <button
                          class="library-card-menu-item"
                          type="button"
                          role="menuitem"
                          data-library-menu-action="open-folder"
                          data-game-id="${escapeHtml(game.id)}"
                          ${openFolderDisabled}
                        >
                          ABRIR NA PASTA
                        </button>
                        <button
                          class="library-card-menu-item is-danger"
                          type="button"
                          role="menuitem"
                          data-library-menu-action="uninstall"
                          data-game-id="${escapeHtml(game.id)}"
                          ${uninstallDisabled}
                        >
                          DESINSTALAR
                        </button>
                      </div>
                    </div>
                  `
                  : ""
              }
            </div>
            <span class="library-card-action">${escapeHtml(getLibraryCardActionLabel(game))}</span>
            <span class="library-card-subtitle">${escapeHtml(getLibraryCardSubtitle(game))}</span>
          </div>
        </article>
      `;
    })
    .join("");

  syncLibraryCardMenus();
}

function renderRailGames() {
  const games = state.games.filter((game) => game.installed);
  if (games.length === 0) {
    railGamesList.innerHTML = "";
    return;
  }

  railGamesList.innerHTML = games
    .map((game) => {
      const selectedClass = game.id === state.selectedGameId && state.view === "details" ? "is-selected" : "";
      return `
        <button
          class="rail-game-btn ${selectedClass}"
          type="button"
          data-open-game="${escapeHtml(game.id)}"
          style="background-image: url('${escapeCssUrl(getCardImage(game))}');"
          aria-label="Abrir ${escapeHtml(game.name)}"
        ></button>
      `;
    })
    .join("");
}

function renderVideo(game) {
  if (!detailsVideoWrap) return;
  const galleryImages = getGalleryImages(game);
  const selectedGalleryIndexRaw = Number(state.selectedGalleryByGameId.get(game.id));
  const selectedGalleryIndex = Number.isFinite(selectedGalleryIndexRaw) ? selectedGalleryIndexRaw : -1;

  if (selectedGalleryIndex >= 0 && selectedGalleryIndex < galleryImages.length) {
    const selectedImage = galleryImages[selectedGalleryIndex];
    setDetailsVideoMarkup(`gallery:${game.id}:${selectedGalleryIndex}:${selectedImage}`, `
      <div class="video-fallback media-preview-image-wrap">
        <img class="media-preview-image" src="${escapeHtml(selectedImage)}" alt="Preview ${selectedGalleryIndex + 1} de ${escapeHtml(game.name)}" />
      </div>
    `);
    return;
  }

  const source = String(game.trailerUrl || game.videoUrl || "").trim();

  if (!source) {
    setDetailsVideoMarkup(`fallback:${game.id}:${getBannerImage(game)}`, `
      <div class="video-fallback">
        <img src="${escapeHtml(getBannerImage(game))}" alt="Preview de ${escapeHtml(game.name)}" />
      </div>
    `);
    return;
  }

  const youtubeEmbed = toYoutubeEmbed(source);
  if (youtubeEmbed) {
    const youtubeWatchUrl = toYoutubeWatchUrl(source);
    const embedPlayerUrl = youtubeEmbed
      ? `${youtubeEmbed}${youtubeEmbed.includes("?") ? "&" : "?"}autoplay=0&hl=pt-BR`
      : "";
    const videoActions = youtubeWatchUrl
      ? `
          <div class="video-actions-floating">
            <button class="video-open-youtube-btn" type="button" data-open-youtube-url="${escapeHtml(youtubeWatchUrl)}">
              YouTube
            </button>
          </div>
        `
      : "";

    setDetailsVideoMarkup(`youtube:${game.id}:${youtubeEmbed}`, `
      <div class="video-embed-shell video-youtube-shell">
        ${
          embedPlayerUrl
            ? `
              <webview
                class="video-youtube-webview"
                src="${escapeHtml(embedPlayerUrl)}"
                partition="persist:wplay-youtube"
                allowfullscreen
              ></webview>
            `
            : `
              <iframe
                src="${escapeHtml(youtubeEmbed)}"
                title="Trailer de ${escapeHtml(game.name)}"
                loading="lazy"
                referrerpolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
            `
        }
        ${videoActions}
      </div>
    `);
    return;
  }

  const directVideoInfo = parseDirectVideoInfo(source);
  if (directVideoInfo.isDirect) {
    const sourceType = directVideoInfo.mimeType
      ? ` type="${escapeHtml(directVideoInfo.mimeType)}"`
      : "";
    setDetailsVideoMarkup(`video:${game.id}:${source}`, `
      <video controls playsinline preload="metadata" poster="${escapeHtml(getBannerImage(game))}">
        <source src="${escapeHtml(source)}"${sourceType} />
      </video>
    `);
    return;
  }

  setDetailsVideoMarkup(`iframe:${game.id}:${source}`, `
    <iframe
      src="${escapeHtml(source)}"
      title="Video de ${escapeHtml(game.name)}"
      loading="lazy"
      allowfullscreen
    ></iframe>
  `);
}

function renderGallery(game) {
  const images = getGalleryImages(game);
  const hasVideo = hasGameVideoSource(game);
  if (!images.length && !hasVideo) {
    detailsGallery.innerHTML = "";
    state.selectedGalleryByGameId.set(game.id, -1);
    return;
  }

  const selectedIndexRaw = Number(state.selectedGalleryByGameId.get(game.id));
  let selectedIndex = -1;
  if (Number.isFinite(selectedIndexRaw)) {
    if (selectedIndexRaw >= 0 && selectedIndexRaw < images.length) {
      selectedIndex = selectedIndexRaw;
    } else if (selectedIndexRaw === -1) {
      selectedIndex = -1;
    }
  }

  if (!hasVideo && selectedIndex < 0 && images.length > 0) {
    selectedIndex = 0;
  }
  state.selectedGalleryByGameId.set(game.id, selectedIndex);

  const cardsMarkup = [];
  if (hasVideo) {
    const videoActiveClass = selectedIndex < 0 ? "is-active" : "";
    cardsMarkup.push(`
      <button class="gallery-thumb gallery-thumb-video ${videoActiveClass}" type="button" data-gallery-index="-1" aria-label="Exibir trailer de ${escapeHtml(game.name)}">
        <img src="${escapeHtml(getBannerImage(game))}" alt="Trailer de ${escapeHtml(game.name)}" loading="lazy" />
        <span class="gallery-video-badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M9 7.6V16.4L16 12L9 7.6Z" fill="currentColor"></path>
          </svg>
          VIDEO
        </span>
      </button>
    `);
  }

  cardsMarkup.push(
    ...images.map((imageUrl, index) => {
      const activeClass = index === selectedIndex ? "is-active" : "";
      return `
        <button class="gallery-thumb ${activeClass}" type="button" data-gallery-index="${index}" aria-label="Exibir imagem ${index + 1} de ${escapeHtml(game.name)}">
          <img src="${escapeHtml(imageUrl)}" alt="Imagem ${index + 1} de ${escapeHtml(game.name)}" loading="lazy" />
        </button>
      `;
    })
  );

  detailsGallery.innerHTML = cardsMarkup.join("");
}

function renderGenres(game) {
  const genres = getGenres(game);
  detailsGenres.innerHTML = genres.map((genre) => `<span class="genre-tag">${escapeHtml(genre)}</span>`).join("");
}

function renderDetailsProgress(game) {
  const progress = getInstallProgress(game.id);
  if (!progress || !isGameBusy(game.id)) {
    detailsProgress.classList.add("is-hidden");
    detailsProgress.classList.remove("is-indeterminate");
    detailsProgressFill.style.width = "0%";
    detailsProgressText.textContent = "";
    return;
  }

  const hasKnownTotalBytes = Number.isFinite(progress.totalBytes) && progress.totalBytes > 0;
  const hasKnownPercent = Number.isFinite(progress.percent);
  const percent = hasKnownPercent
    ? Math.max(0, Math.min(100, progress.percent))
    : progress.phase === "extracting"
      ? 96
      : progress.phase === "preparing"
        ? 72
        : 34;
  const indeterminate =
    progress.phase === "preparing" ||
    progress.phase === "extracting" ||
    (progress.phase === "downloading" && !hasKnownTotalBytes);
  detailsProgress.classList.remove("is-hidden");
  detailsProgress.classList.toggle("is-indeterminate", indeterminate);
  detailsProgressFill.style.width = `${percent}%`;
  detailsProgressText.textContent = getProgressText(progress);
}

function getDetailsStatusLabel(game) {
  if (isGameUninstalling(game.id)) return "Removendo";
  if (isGameBusy(game.id)) return getDownloadPhaseLabel(getInstallProgress(game.id));
  if (game.running) return "Em execucao";
  if (game.installed) {
    return game.size && game.size !== "Tamanho nao informado" ? `Instalado • ${game.size}` : "Instalado";
  }
  if (game.comingSoon) return "Em breve";
  if (isInLibrary(game.id)) return "Na biblioteca";
  return "Nao instalado";
}

function renderDetailsActions(game) {
  if (game.installed && !isInLibrary(game.id)) {
    addToLibrary(game.id);
  }

  const actionState = getActionState(game);
  detailsActionBtn.dataset.gameId = game.id;
  detailsActionBtn.dataset.action = actionState.action;
  setButtonLabel(detailsActionBtn, actionState.label);
  detailsActionBtn.disabled = actionState.disabled;

  const inLibrary = isInLibrary(game.id);
  const shouldShowLibraryToggle = !game.installed && !isGameUninstalling(game.id);
  const canToggleLibrary = !isGameBusy(game.id) && !isGameUninstalling(game.id);
  detailsAddLibraryBtn.dataset.gameId = game.id;
  detailsAddLibraryBtn.classList.toggle("is-active", inLibrary);
  detailsAddLibraryBtn.classList.toggle("is-hidden", !shouldShowLibraryToggle);
  setButtonLabel(detailsAddLibraryBtn, inLibrary ? "Remove from Library" : "Add to Library");
  detailsAddLibraryBtn.disabled = !shouldShowLibraryToggle || !canToggleLibrary;

  if (detailsHeroUninstallBtn) {
    const showHeroUninstall = game.installed || isGameUninstalling(game.id);
    detailsHeroUninstallBtn.classList.toggle("is-hidden", !showHeroUninstall);
    detailsHeroUninstallBtn.dataset.gameId = showHeroUninstall ? game.id : "";
    detailsHeroUninstallBtn.disabled = isGameBusy(game.id) || isGameUninstalling(game.id);
    setButtonLabel(detailsHeroUninstallBtn, isGameUninstalling(game.id) ? "Removendo..." : "Desinstalar");
  }

  const showPlay = game.installed && !isGameBusy(game.id) && !isGameUninstalling(game.id);
  const playAction = showPlay ? (game.running ? "close" : "play") : "";
  detailsPlayBtn.classList.toggle("is-hidden", !showPlay);
  detailsPlayBtn.dataset.gameId = showPlay ? game.id : "";
  detailsPlayBtn.dataset.action = playAction;
  detailsPlayBtn.textContent = playAction === "close" ? "PARAR JOGO" : "PLAY GAME";

  const showUninstall = game.installed || isGameUninstalling(game.id);
  detailsUninstallBtn.classList.toggle("is-hidden", !showUninstall);
  detailsUninstallBtn.disabled = isGameBusy(game.id);
  detailsUninstallBtn.dataset.gameId = showUninstall ? game.id : "";
  detailsUninstallBtn.textContent = isGameUninstalling(game.id) ? "REMOVENDO..." : "DESINSTALAR";

  detailsStatus.textContent = getDetailsStatusLabel(game);
}

function renderDetails(game) {
  const longDescription = game.longDescription || game.description || "Sem descricao.";
  detailsBreadcrumb.textContent = game.name || "Game";
  detailsTitle.textContent = game.name || "Game";
  detailsDescription.textContent = game.description || "Sem descricao.";
  detailsLongDescription.textContent = longDescription;
  detailsHeroBackdrop.style.backgroundImage = `url('${escapeCssUrl(getBannerImage(game))}')`;

  detailsStatPlayTime.textContent = formatGameSizeStat(game);
  detailsStatAchievement.textContent = formatReleaseDateStat(game);

  const logoUrl = getLogoImage(game);
  if (logoUrl) {
    detailsLogo.src = logoUrl;
    detailsLogo.alt = `Logo do jogo ${game.name}`;
    detailsLogo.classList.remove("is-hidden");
  } else {
    detailsLogo.classList.add("is-hidden");
    detailsLogo.removeAttribute("src");
  }

  detailsDevelopedBy.textContent = game.developedBy || "Nao informado";
  detailsPublishedBy.textContent = game.publishedBy || "Nao informado";
  detailsReleaseDate.textContent = game.releaseDate || "Nao informado";

  renderGenres(game);
  renderGallery(game);
  renderVideo(game);
  renderDetailsProgress(game);
  renderDetailsActions(game);
}

function renderAll() {
  renderStoreGrid();
  renderLibraryGrid();
  renderDownloadsView();
  renderRailGames();
  renderRailDownloads();
  updateHeaderForView();

  if (!state.selectedGameId) return;
  const selected = getGameById(state.selectedGameId);
  if (!selected) {
    state.selectedGameId = "";
    if (state.view === "details") {
      setView(state.lastNonDetailView || "store");
    }
    return;
  }

  renderDetails(selected);
}

function openDetails(gameId) {
  const game = getGameById(gameId);
  if (!game) return;
  state.selectedGameId = gameId;

  if (state.view !== "details") {
    state.lastNonDetailView = state.view;
  }

  if (!state.selectedGalleryByGameId.has(gameId)) {
    state.selectedGalleryByGameId.set(gameId, -1);
  }

  setView("details");
  renderDetails(game);
  renderRailGames();
}

function closeDetails() {
  setView(state.lastNonDetailView || "store");
}

async function refreshGames(options = {}) {
  if (refreshGamesInFlight) {
    return refreshGamesInFlight;
  }

  refreshGamesInFlight = (async () => {
    const hasExplicitLightweight = Object.prototype.hasOwnProperty.call(options, "lightweight");
    const hasExplicitRunningState = Object.prototype.hasOwnProperty.call(options, "includeRunningState");
    const hasExplicitSteamStats = Object.prototype.hasOwnProperty.call(options, "includeSteamStats");
    const hasExplicitInstalledSize = Object.prototype.hasOwnProperty.call(options, "measureInstalledSize");
    const normalizedLightweight = hasExplicitLightweight ? options.lightweight === true : undefined;
    const requestPayload = {};
    if (hasExplicitLightweight) {
      requestPayload.lightweight = normalizedLightweight;
    }
    if (hasExplicitRunningState) {
      requestPayload.includeRunningState = options.includeRunningState !== false;
    }
    if (hasExplicitSteamStats) {
      requestPayload.includeSteamStats = options.includeSteamStats === true && normalizedLightweight !== true;
    }
    if (hasExplicitInstalledSize) {
      requestPayload.measureInstalledSize = options.measureInstalledSize === true && normalizedLightweight !== true;
    }

    const previousInstalledById = new Map(state.games.map((game) => [game.id, Boolean(game.installed)]));
    const selectedGameId = state.selectedGameId;

    state.games = await window.launcherApi.getGames(requestPayload);
    syncLibraryWithInstalled();
    pruneRecentCompletedDownloads();
    renderAll();

    if (!selectedGameId) {
      return;
    }

    const previousInstalled = previousInstalledById.get(selectedGameId);
    const selectedGame = getGameById(selectedGameId);
    if (!selectedGame) {
      return;
    }

    if (
      previousInstalled === true &&
      selectedGame.installed === false &&
      !isGameBusy(selectedGameId) &&
      !isGameUninstalling(selectedGameId)
    ) {
      setStatus(`${selectedGame.name} nao foi encontrado no disco. Clique em Download Game para instalar novamente.`);
    }
  })()
    .catch((error) => {
      throw error;
    })
    .finally(() => {
      refreshGamesInFlight = null;
    });

  return refreshGamesInFlight;
}

async function refreshInstallRoot() {
  try {
    state.installRootPath = await window.launcherApi.getInstallRoot();
  } catch (_error) {
    state.installRootPath = "C:\\wyzer_games";
  }
}

function scheduleCatalogChangedRefresh(reason = "supabase-change") {
  if (catalogChangedRefreshTimer) {
    clearTimeout(catalogChangedRefreshTimer);
    catalogChangedRefreshTimer = null;
  }

  catalogChangedRefreshTimer = window.setTimeout(() => {
    catalogChangedRefreshTimer = null;
    void (async () => {
      try {
        await refreshGames({
          lightweight: false,
          includeRunningState: true
        });
      } catch (_error) {
        // Silent refresh failures for background catalog hints.
      }
    })();
  }, CATALOG_CHANGED_REFRESH_DEBOUNCE_MS);
}

function applyActiveInstallSnapshot(entries = []) {
  const snapshotEntries = Array.isArray(entries) ? entries : [];
  const activeGameIds = new Set();

  for (const entry of snapshotEntries) {
    const normalized = normalizeInstallProgressPayload(entry);
    if (!normalized) continue;
    if (!ACTIVE_INSTALL_PHASES.has(normalized.phase)) continue;

    state.installProgressByGameId.set(normalized.gameId, normalized);
    activeGameIds.add(normalized.gameId);

    if (normalized.phase === "downloading") {
      const speedBps = Number(normalized.speedBps);
      if (Number.isFinite(speedBps) && speedBps >= 0) {
        state.downloadSpeedByGameId.set(normalized.gameId, {
          lastBytes: Number(normalized.downloadedBytes) || 0,
          lastAt: Date.now(),
          bps: speedBps
        });
      }
    }
  }

  let removedStaleEntries = false;
  for (const [gameId, progress] of state.installProgressByGameId.entries()) {
    const phase = String(progress?.phase || "").toLowerCase();
    if (!ACTIVE_INSTALL_PHASES.has(phase)) {
      continue;
    }
    if (activeGameIds.has(gameId)) {
      continue;
    }
    state.installProgressByGameId.delete(gameId);
    state.downloadSpeedByGameId.delete(gameId);
    removedStaleEntries = true;
  }

  if (activeGameIds.size > 0) {
    scheduleProgressRenderAll();
    return;
  }

  if (removedStaleEntries) {
    renderAll();
  }
}

async function syncActiveInstallProgressSnapshot() {
  if (typeof window.launcherApi?.getActiveInstalls !== "function") {
    return;
  }

  try {
    const payload = await window.launcherApi.getActiveInstalls();
    const entries = Array.isArray(payload?.entries) ? payload.entries : Array.isArray(payload) ? payload : [];
    applyActiveInstallSnapshot(entries);
  } catch (_error) {
    // Ignore snapshot sync failures and rely on realtime install events.
  }
}

function fireConfettiFromElement(element, strong = false) {
  if (!confettiFx || !element) return;
  const rect = element.getBoundingClientRect();
  const origin = {
    x: (rect.left + rect.width / 2) / window.innerWidth,
    y: Math.max(0, (rect.top + rect.height * 0.2) / window.innerHeight)
  };

  confettiFx({
    particleCount: strong ? 120 : 70,
    spread: 70,
    startVelocity: 42,
    gravity: 1,
    ticks: 220,
    origin,
    colors: ["#ffffff", "#d4e8ff", "#a5c7ff", "#e8f0ff"],
    scalar: strong ? 1 : 0.9
  });
}

async function handleGameAction(gameId, action) {
  if (action === "details") {
    openDetails(gameId);
    return;
  }

  if (!state.authSession?.user?.id) {
    setAuthGateVisible(true);
    setAuthGateStatus("Entre com Steam para continuar.");
    setStatus("Login necessario para continuar.");
    return;
  }

  if (!gameId || ["busy", "soon"].includes(action)) return;

  const game = getGameById(gameId);
  if (!game) return;

  try {
    if (action === "play") {
      try {
        const result = await window.launcherApi.playGame(gameId);
        await refreshGames();
        if (result?.alreadyRunning) {
          setStatus(`${game.name} ja esta em execucao.`);
          notify("info", "Jogo em execucao", `${game.name} ja estava aberto.`);
          return;
        }
        setStatus(`Jogo iniciado: ${game.name}.`);
        notify("success", "Jogo iniciado", `${game.name} foi aberto com sucesso.`);
        void showDesktopGameStartedToast(game.name);
      } catch (error) {
        await refreshGames();
        const refreshedGame = getGameById(gameId);
        if (!refreshedGame?.installed) {
          setStatus(`${game.name} nao foi encontrado. Clique em Download Game para instalar novamente.`);
          notify("error", "Arquivo nao encontrado", `${game.name} nao foi encontrado no disco.`);
          return;
        }
        const parsedPlayError = parseLauncherError(error?.message || "");
        if (parsedPlayError.code === "STEAM_NOT_RUNNING") {
          setSteamRequiredModalOpen(true, game.name);
          setStatus(parsedPlayError.message || "Steam nao esta aberta.", true);
          notify("error", "Steam fechada", parsedPlayError.message || "Abra a Steam para iniciar o jogo.");
          return;
        }
        throw error;
      }
      return;
    }

    if (action === "close") {
      if (typeof window.launcherApi.closeGame !== "function") {
        throw new Error("Fechar jogo nao esta disponivel nesta versao do launcher.");
      }

      const result = await window.launcherApi.closeGame(gameId);
      await refreshGames();
      if (result?.alreadyStopped) {
        setStatus(`${game.name} ja estava fechado.`);
        notify("info", "Jogo ja fechado", `${game.name} nao estava em execucao.`);
        return;
      }
      setStatus(`Jogo fechado: ${game.name}.`);
      notify("success", "Jogo fechado", `${game.name} foi encerrado com sucesso.`);
      return;
    }

    if (action === "open-folder") {
      if (typeof window.launcherApi.openGameInstallFolder !== "function") {
        throw new Error("Este atalho nao esta disponivel nesta versao do launcher.");
      }

      const openedPath = await window.launcherApi.openGameInstallFolder(gameId);
      setStatus(`Pasta do jogo aberta: ${shortPath(openedPath || game.installDir || game.name)}.`);
      notify("info", "Pasta aberta", `Abrindo arquivos instalados de ${game.name}.`);
      return;
    }

    if (action === "install") {
      const installChoice = await askInstallPathChoice();
      if (installChoice === "cancel") {
        setStatus("Instalacao cancelada.");
        notify("info", "Instalacao cancelada", "A instalacao foi cancelada antes do download.");
        return;
      }

      if (installChoice === "change") {
        const selected = await window.launcherApi.chooseInstallBaseDirectory();
        if (selected?.canceled) {
          setStatus("Instalacao cancelada.");
          notify("info", "Instalacao cancelada", "Nenhum diretorio foi selecionado.");
          return;
        }
        state.installRootPath = selected?.installRoot || state.installRootPath;
        await refreshGames();
      }

      addToLibrary(gameId);
      renderAll();
      setStatus(`Iniciando download de ${game.name} em ${shortPath(getInstallRootDisplayPath())}...`);
      notify("info", "Download iniciado", `${game.name} esta sendo baixado.`);
      setView("downloads");
      state.searchOpen = false;
      syncSearchVisibility();
      renderAll();
      await window.launcherApi.installGame(gameId);
      await refreshGames();
      return;
    }

    if (action === "uninstall") {
      const confirmed = await askUninstallConfirmation(game);
      if (!confirmed) return;

      state.uninstallingGameIds.add(gameId);
      renderAll();
      setStatus(`Removendo ${game.name}...`);
      notify("info", "Desinstalando", `Removendo ${game.name} do computador.`);

      try {
        await window.launcherApi.uninstallGame(gameId);
        removeFromLibrary(gameId);
        clearRecentCompletedDownload(gameId);
        await refreshGames();
        setStatus(`${game.name} removido do computador e da biblioteca.`);
        notify("success", "Jogo removido", `${game.name} foi removido com sucesso.`);
      } finally {
        state.uninstallingGameIds.delete(gameId);
        renderAll();
      }
    }
  } catch (error) {
    setStatus(`Erro: ${error.message}`, true);
    const installFailedByProgress = action === "install" && getInstallProgress(gameId)?.phase === "failed";
    if (!installFailedByProgress) {
      notify("error", "Operacao falhou", error.message || "Erro inesperado.");
    }
  }
}

function playIntroAnimations() {
  if (!animate || state.introPlayed) return;
  state.introPlayed = true;

  animate(".side-rail", { opacity: [0, 1], x: [-20, 0] }, { duration: 0.46, easing: [0.22, 1, 0.36, 1] });
  animate(".top-header", { opacity: [0, 1], y: [-10, 0] }, { duration: 0.38, delay: 0.03, easing: [0.22, 1, 0.36, 1] });
  animate(".stage-header", { opacity: [0, 1], y: [15, 0] }, { duration: 0.4, delay: 0.08, easing: [0.22, 1, 0.36, 1] });
}

function startRealtimeSync() {
  if (state.realtimeSyncStarted) {
    return;
  }

  state.realtimeSyncStarted = true;

  const syncNow = async () => {
    if (document.hidden) {
      return;
    }
    try {
      await refreshGames({ lightweight: true, includeRunningState: true });
    } catch (_error) {
      // Silent background sync failure.
    }
  };

  window.setInterval(() => {
    void syncNow();
  }, REALTIME_SYNC_INTERVAL_MS);

  window.addEventListener("focus", () => {
    void syncNow();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      void syncNow();
    }
  });
}

async function loadInitialData() {
  await ensureAuthenticated();
}

function installEventBindings() {
  setupSidebarLogo();
  applyWindowMaximizedState(false);
  ensureNotyfDeckStack();
  renderTopAccountButton();
  renderAutoUpdateButton();
  void bootstrapAutoUpdateState();
  startAutoUpdateRealtimeSync();
  scheduleAutoUpdateBackgroundCheckSoon(2500);

  if (authSteamLoginBtn) {
    authSteamLoginBtn.addEventListener("click", () => {
      void startSteamLogin();
    });
  }

  if (authRetryBtn) {
    authRetryBtn.addEventListener("click", () => {
      void ensureAuthenticated();
    });
  }

  searchInput.addEventListener("input", () => {
    state.search = searchInput.value || "";
    if (state.search.trim()) {
      state.searchOpen = true;
    }
    syncSearchVisibility();
    renderStoreGrid();
    renderLibraryGrid();
  });

  if (topSearchToggle) {
    topSearchToggle.addEventListener("click", () => {
      if (state.view === "details") {
        setView(state.lastNonDetailView || "store");
        renderAll();
      }

      if (state.searchOpen) {
        closeSearch(true);
        return;
      }

      state.searchOpen = true;
      syncSearchVisibility();
      searchInput.focus();
    });
  }

  if (topAccountBtn) {
    topAccountBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!state.authSession?.user?.id) {
        setAuthGateVisible(true);
        setAuthGateStatus("Entre com Steam para continuar.");
        return;
      }

      if (state.notificationsOpen) {
        setNotificationsPanelOpen(false);
      }
      renderAccountMenuProfile();
      if (!state.accountMenuOpen) {
        void refreshLaunchOnStartupState();
      }
      setAccountMenuOpen(!state.accountMenuOpen);
    });
  }

  if (accountMenu) {
    accountMenu.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    accountMenu.addEventListener("click", async (event) => {
      const actionButton = event.target.closest("[data-account-action]");
      if (!actionButton) return;

      event.preventDefault();
      const action = actionButton.dataset.accountAction || "";
      setAccountMenuOpen(false);

      try {
        await handleAccountMenuAction(action);
      } catch (error) {
        setStatus(`Erro no menu da conta: ${error?.message || "erro desconhecido"}`, true);
        notify("error", "Conta", error?.message || "Falha ao executar acao da conta.");
      }
    });
  }

  if (windowMinBtn) {
    windowMinBtn.addEventListener("click", async () => {
      try {
        await window.launcherApi.minimizeWindow();
      } catch (_error) {
        // No-op.
      }
    });
  }

  if (windowMaxBtn) {
    windowMaxBtn.addEventListener("click", async () => {
      try {
        const result = await window.launcherApi.toggleMaximizeWindow();
        applyWindowMaximizedState(Boolean(result));
      } catch (_error) {
        // No-op.
      }
    });
  }

  if (windowCloseBtn) {
    windowCloseBtn.addEventListener("click", async () => {
      try {
        await window.launcherApi.closeWindow();
      } catch (_error) {
        // No-op.
      }
    });
  }

  if (topNotificationsBtn) {
    topNotificationsBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const willOpen = !state.notificationsOpen;
      setNotificationsPanelOpen(willOpen);
      if (willOpen) {
        setStatus("Notificacoes recentes abertas.");
      }
    });
  }

  if (topUpdateBtn) {
    topUpdateBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (state.notificationsOpen) {
        setNotificationsPanelOpen(false);
      }

      if (state.accountMenuOpen) {
        setAccountMenuOpen(false);
      }

      await handleTopUpdateButtonClick();
    });
  }

  if (notificationsPanel) {
    notificationsPanel.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  if (notificationsClearBtn) {
    notificationsClearBtn.addEventListener("click", (event) => {
      event.preventDefault();
      clearNotificationHistory();
      setStatus("Historico de notificacoes limpo.");
    });
  }

  if (notificationsList) {
    notificationsList.addEventListener("click", (event) => {
      const dismissButton = event.target.closest("[data-notification-dismiss]");
      if (!dismissButton) return;
      event.preventDefault();
      event.stopPropagation();
      const notificationId = dismissButton.getAttribute("data-notification-dismiss") || "";
      removeNotificationHistoryEntry(notificationId);
    });
  }

  if (railDownloadsBtn) {
    railDownloadsBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setView("downloads");
      state.searchOpen = false;
      syncSearchVisibility();
      renderAll();
      setStatus("Abrindo downloads...");
    });
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      if (state.searchOpen) {
        closeSearch(true);
      }
      if (state.notificationsOpen) {
        setNotificationsPanelOpen(false);
      }
      if (state.openLibraryMenuGameId) {
        closeLibraryCardMenu();
      }
      if (state.accountMenuOpen) {
        setAccountMenuOpen(false);
      }
      if (state.storeAdvancedFiltersOpen) {
        state.storeAdvancedFiltersOpen = false;
        renderStoreGrid();
      }
      return;
    }

    if (state.searchOpen) {
      if (!(searchWrap && searchWrap.contains(target))) {
        closeSearch(true);
      }
    }

    if (state.storeAdvancedFiltersOpen && !target.closest("[data-store-advanced-filter-wrap]")) {
      state.storeAdvancedFiltersOpen = false;
      renderStoreGrid();
    }

    if (state.notificationsOpen) {
      if (topNotificationsBtn && topNotificationsBtn.contains(target)) return;
      if (notificationsPanel && notificationsPanel.contains(target)) return;
      setNotificationsPanelOpen(false);
    }

    if (state.openLibraryMenuGameId && !target.closest(".library-card-menu-wrap")) {
      closeLibraryCardMenu();
    }

    if (state.accountMenuOpen) {
      if (topAccountBtn && topAccountBtn.contains(target)) return;
      if (accountMenu && accountMenu.contains(target)) return;
      setAccountMenuOpen(false);
    }
  });

  storeFilterRow.addEventListener("click", (event) => {
    const filterBtn = event.target.closest("[data-filter]");
    if (!filterBtn) return;

    state.storeFilter = filterBtn.dataset.filter || "popular";
    const allButtons = storeFilterRow.querySelectorAll("[data-filter]");
    allButtons.forEach((button) => {
      button.classList.toggle("is-active", button === filterBtn);
    });

    updateHeaderForView();
    renderStoreGrid();
  });

  navStoreBtn.addEventListener("click", () => {
    setView("store");
    state.searchOpen = false;
    syncSearchVisibility();
    renderAll();
  });

  if (sideHomeBtn) {
    sideHomeBtn.addEventListener("click", () => {
      setView("store");
      state.searchOpen = false;
      syncSearchVisibility();
      if (state.notificationsOpen) {
        setNotificationsPanelOpen(false);
      }
      renderAll();
      setStatus("Abrindo Jogos...");
    });
  }

  navLibraryBtn.addEventListener("click", () => {
    setView("library");
    state.searchOpen = false;
    syncSearchVisibility();
    renderAll();
  });

  if (downloadsInstallOptionsBtn) {
    downloadsInstallOptionsBtn.addEventListener("click", async () => {
      const installChoice = await askInstallPathChoice();
      if (installChoice === "cancel" || installChoice === "keep") {
        setStatus("Configuracao de instalacao mantida.");
        return;
      }

      const selected = await window.launcherApi.chooseInstallBaseDirectory();
      if (selected?.canceled) {
        setStatus("Alteracao de pasta cancelada.");
        return;
      }

      state.installRootPath = selected?.installRoot || state.installRootPath;
      await refreshGames();
      setStatus(`Pasta de instalacao atualizada para ${shortPath(getInstallRootDisplayPath())}.`);
      notify("success", "Instalacao", "Pasta padrao de instalacao atualizada.");
    });
  }

  if (downloadsActiveCollapseBtn) {
    downloadsActiveCollapseBtn.addEventListener("click", () => {
      state.downloadsSectionCollapsed = !state.downloadsSectionCollapsed;
      renderDownloadsView();
    });
  }

  if (downloadsPauseAllBtn) {
    downloadsPauseAllBtn.addEventListener("click", () => {
      notify("info", "Downloads", "Pausar todos sera disponibilizado em breve.");
    });
  }

  if (downloadsResumeAllBtn) {
    downloadsResumeAllBtn.addEventListener("click", () => {
      notify("info", "Downloads", "Retomar todos sera disponibilizado em breve.");
    });
  }

  storeGrid.addEventListener("click", (event) => {
    const advancedToggleButton = event.target.closest("[data-store-advanced-filter-toggle]");
    if (advancedToggleButton) {
      event.preventDefault();
      state.storeAdvancedFiltersOpen = !state.storeAdvancedFiltersOpen;
      renderStoreGrid();
      return;
    }

    const modeFilterButton = event.target.closest("[data-store-mode-filter]");
    if (modeFilterButton) {
      event.preventDefault();
      const nextMode = String(modeFilterButton.dataset.storeModeFilter || "all")
        .trim()
        .toLowerCase();
      if (!["all", "multiplayer", "solo"].includes(nextMode)) {
        return;
      }
      state.storeModeFilter = nextMode;
      renderStoreGrid();
      return;
    }

    const genreFilterButton = event.target.closest("[data-store-genre-filter]");
    if (genreFilterButton) {
      event.preventDefault();
      const nextGenre = String(genreFilterButton.dataset.storeGenreFilter || "all")
        .trim()
        .toLowerCase();
      state.storeGenreFilter = nextGenre || "all";
      renderStoreGrid();
      return;
    }

    const clearAdvancedFiltersButton = event.target.closest("[data-store-advanced-filter-reset]");
    if (clearAdvancedFiltersButton) {
      event.preventDefault();
      state.storeModeFilter = "all";
      state.storeGenreFilter = "all";
      state.storeAdvancedFiltersOpen = false;
      renderStoreGrid();
      return;
    }

    const scrollButton = event.target.closest("[data-store-scroll]");
    if (scrollButton) {
      const direction = Number(scrollButton.dataset.storeScroll || 0);
      if (!Number.isFinite(direction) || direction === 0) return;
      const track = storeGrid.querySelector("[data-store-track]");
      if (!track) return;
      track.scrollBy({
        left: direction * 560,
        behavior: "smooth"
      });
      return;
    }

    const card = event.target.closest("[data-open-game]");
    if (!card) return;
    openDetails(card.dataset.openGame);
  });

  railGamesList.addEventListener("click", (event) => {
    const item = event.target.closest("[data-open-game]");
    if (!item) return;
    openDetails(item.dataset.openGame);
  });

  libraryGrid.addEventListener("click", async (event) => {
    const clearSearchButton = event.target.closest("[data-clear-search]");
    if (clearSearchButton) {
      closeSearch(true);
      return;
    }

    const goStoreButton = event.target.closest("[data-go-store]");
    if (goStoreButton) {
      setView("store");
      state.searchOpen = false;
      syncSearchVisibility();
      renderAll();
      setStatus("Abrindo Jogos...");
      return;
    }

    const menuToggle = event.target.closest("[data-library-menu-toggle]");
    if (menuToggle) {
      event.preventDefault();
      event.stopPropagation();
      toggleLibraryCardMenu(menuToggle.dataset.libraryMenuToggle || "");
      return;
    }

    const menuAction = event.target.closest("[data-library-menu-action]");
    if (menuAction) {
      event.preventDefault();
      event.stopPropagation();
      const gameId = menuAction.dataset.gameId || "";
      const action = menuAction.dataset.libraryMenuAction || "";
      closeLibraryCardMenu();
      if (action === "uninstall") {
        await handleGameAction(gameId, "uninstall");
      } else if (action === "open-folder") {
        await handleGameAction(gameId, "open-folder");
      }
      return;
    }

    const card = event.target.closest("[data-open-game]");
    if (!card) return;
    closeLibraryCardMenu();
    openDetails(card.dataset.openGame);
  });

  if (downloadsActiveList) {
    downloadsActiveList.addEventListener("click", async (event) => {
      const actionButton = event.target.closest("[data-download-action]");
      if (actionButton) {
        event.preventDefault();
        event.stopPropagation();
        const gameId = actionButton.dataset.gameId || "";
        const action = actionButton.dataset.downloadAction || "play";
        if (!gameId) return;
        await handleGameAction(gameId, action);
        return;
      }

      const item = event.target.closest("[data-open-game]");
      if (!item) return;
      openDetails(item.dataset.openGame);
    });
  }

  detailsBackBtn.addEventListener("click", closeDetails);

  detailsGallery.addEventListener("click", (event) => {
    const thumb = event.target.closest("[data-gallery-index]");
    if (!thumb) return;

    const index = Number(thumb.dataset.galleryIndex);
    if (!Number.isFinite(index)) return;

    const game = getGameById(state.selectedGameId);
    if (!game) return;

    const gallery = getGalleryImages(game);
    const hasVideo = hasGameVideoSource(game);

    let nextIndex = -1;
    if (index < 0) {
      if (!hasVideo) return;
      nextIndex = -1;
    } else {
      if (!gallery.length) return;
      nextIndex = Math.min(Math.max(0, index), gallery.length - 1);
    }

    state.selectedGalleryByGameId.set(game.id, nextIndex);
    renderVideo(game);
    renderGallery(game);
  });

  if (detailsVideoWrap) {
    detailsVideoWrap.addEventListener("click", async (event) => {
      const openYoutubeButton = event.target.closest("[data-open-youtube-url]");
      if (!openYoutubeButton) return;
      event.preventDefault();
      event.stopPropagation();

      const urlValue = String(openYoutubeButton.dataset.openYoutubeUrl || "").trim();
      if (!urlValue) return;

      try {
        await openExternalUrl(urlValue);
        setStatus("Abrindo trailer no YouTube...");
      } catch (error) {
        const message = error?.message || "Nao foi possivel abrir o video no navegador.";
        setStatus(message, true);
        notify("error", "Video", message);
      }
    });
  }

  detailsAddLibraryBtn.addEventListener("click", () => {
    const gameId = detailsAddLibraryBtn.dataset.gameId || "";
    if (!gameId) return;

    const game = getGameById(gameId);
    if (!game) return;

    if (isInLibrary(gameId)) {
      removeFromLibrary(gameId);
      renderAll();
      setStatus(`Jogo removido da biblioteca: ${game.name}.`);
      notify("info", "Biblioteca", `${game.name} foi removido da biblioteca.`);
      return;
    }

    addToLibrary(gameId);
    renderAll();
    setStatus(`Jogo adicionado a biblioteca: ${game.name}.`);
    notify("success", "Biblioteca", `${game.name} foi adicionado a biblioteca.`);
  });

  detailsActionBtn.addEventListener("click", async () => {
    const gameId = detailsActionBtn.dataset.gameId || "";
    const action = detailsActionBtn.dataset.action || "";
    if (action === "install" || action === "play") {
      fireConfettiFromElement(detailsActionBtn, action === "play");
    }
    await handleGameAction(gameId, action);
  });

  if (detailsHeroUninstallBtn) {
    detailsHeroUninstallBtn.addEventListener("click", async () => {
      const gameId = detailsHeroUninstallBtn.dataset.gameId || "";
      if (!gameId) return;
      await handleGameAction(gameId, "uninstall");
    });
  }

  detailsPlayBtn.addEventListener("click", async () => {
    const gameId = detailsPlayBtn.dataset.gameId || "";
    const action = detailsPlayBtn.dataset.action || "play";
    if (!gameId) return;
    await handleGameAction(gameId, action);
  });

  detailsUninstallBtn.addEventListener("click", async () => {
    const gameId = detailsUninstallBtn.dataset.gameId || "";
    if (!gameId) return;
    await handleGameAction(gameId, "uninstall");
  });

  installPathModal.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-close-install-path='true']");
    if (closeTarget) {
      closeInstallPathModal("cancel");
    }
  });

  installPathKeepBtn.addEventListener("click", () => {
    closeInstallPathModal("keep");
  });

  installPathChangeBtn.addEventListener("click", () => {
    closeInstallPathModal("change");
  });

  installPathCancelBtn.addEventListener("click", () => {
    closeInstallPathModal("cancel");
  });

  if (updateRestartModal) {
    updateRestartModal.addEventListener("click", (event) => {
      const closeTarget = event.target.closest("[data-close-update-restart='true']");
      if (closeTarget) {
        setUpdateRestartModalOpen(false);
      }
    });
  }

  if (uninstallConfirmModal) {
    uninstallConfirmModal.addEventListener("click", (event) => {
      const closeTarget = event.target.closest("[data-close-uninstall-confirm='true']");
      if (closeTarget) {
        closeUninstallConfirmModal(false);
      }
    });
  }

  if (uninstallConfirmCancelBtn) {
    uninstallConfirmCancelBtn.addEventListener("click", () => {
      closeUninstallConfirmModal(false);
    });
  }

  if (uninstallConfirmNowBtn) {
    uninstallConfirmNowBtn.addEventListener("click", () => {
      closeUninstallConfirmModal(true);
    });
  }

  if (updateRestartLaterBtn) {
    updateRestartLaterBtn.addEventListener("click", () => {
      setUpdateRestartModalOpen(false);
    });
  }

  if (updateRestartNowBtn) {
    updateRestartNowBtn.addEventListener("click", async () => {
      setUpdateRestartModalOpen(false);
      await restartAndInstallAutoUpdate();
    });
  }

  if (steamRequiredModal) {
    steamRequiredModal.addEventListener("click", (event) => {
      const closeTarget = event.target.closest("[data-close-steam-required='true']");
      if (closeTarget) {
        setSteamRequiredModalOpen(false);
      }
    });
  }

  if (steamRequiredCancelBtn) {
    steamRequiredCancelBtn.addEventListener("click", () => {
      setSteamRequiredModalOpen(false);
    });
  }

  if (steamRequiredOpenBtn) {
    steamRequiredOpenBtn.addEventListener("click", async () => {
      await openSteamClientFromModal();
    });
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.steamRequiredModalOpen) {
      setSteamRequiredModalOpen(false);
      return;
    }

    if (event.key === "Escape" && state.uninstallConfirmModalOpen) {
      closeUninstallConfirmModal(false);
      return;
    }

    if (event.key === "Escape" && state.updateRestartModalOpen) {
      setUpdateRestartModalOpen(false);
      return;
    }

    if (event.key === "Escape" && !installPathModal.classList.contains("is-hidden")) {
      closeInstallPathModal("cancel");
      return;
    }

    if (event.key === "Escape" && state.accountMenuOpen) {
      setAccountMenuOpen(false);
      return;
    }

    if (event.key === "Escape" && state.openLibraryMenuGameId) {
      closeLibraryCardMenu();
      return;
    }

    if (event.key === "Escape" && state.notificationsOpen) {
      setNotificationsPanelOpen(false);
      return;
    }

    if (event.key === "Escape" && state.storeAdvancedFiltersOpen) {
      state.storeAdvancedFiltersOpen = false;
      renderStoreGrid();
      return;
    }

    if (event.key === "Escape" && state.view === "details") {
      closeDetails();
    }
  });

  window.launcherApi.onInstallProgress(async (payload) => {
    const normalizedPayload = normalizeInstallProgressPayload(payload);
    if (!normalizedPayload) {
      return;
    }
    payload = normalizedPayload;
    state.installProgressByGameId.set(payload.gameId, payload);

    if (ACTIVE_INSTALL_PHASES.has(payload.phase)) {
      clearRecentCompletedDownload(payload.gameId);
    }

    if (payload.phase === "downloading") {
      const backendSpeed = Number(payload.speedBps);
      if (Number.isFinite(backendSpeed) && backendSpeed >= 0) {
        state.downloadSpeedByGameId.set(payload.gameId, {
          lastBytes: Number(payload.downloadedBytes) || 0,
          lastAt: Date.now(),
          bps: backendSpeed
        });
      } else {
        const downloadedBytes = Number(payload.downloadedBytes);
        if (Number.isFinite(downloadedBytes) && downloadedBytes >= 0) {
          const now = Date.now();
          const previous = state.downloadSpeedByGameId.get(payload.gameId);
          if (previous && Number.isFinite(previous.lastBytes) && now > previous.lastAt) {
            const deltaBytes = Math.max(0, downloadedBytes - previous.lastBytes);
            const deltaSeconds = (now - previous.lastAt) / 1000;
            const instantBps = deltaSeconds > 0 ? deltaBytes / deltaSeconds : 0;
            const smoothedBps = previous.bps > 0 ? previous.bps * 0.65 + instantBps * 0.35 : instantBps;
            state.downloadSpeedByGameId.set(payload.gameId, {
              lastBytes: downloadedBytes,
              lastAt: now,
              bps: smoothedBps
            });
          } else {
            state.downloadSpeedByGameId.set(payload.gameId, {
              lastBytes: downloadedBytes,
              lastAt: now,
              bps: 0
            });
          }
        }
      }
    } else if (!["preparing", "extracting"].includes(payload.phase)) {
      state.downloadSpeedByGameId.delete(payload.gameId);
    }

    const streamingPhase = ACTIVE_INSTALL_PHASES.has(payload.phase);
    if (streamingPhase) {
      scheduleProgressRenderAll();
    } else {
      renderAll();
    }

    if (ACTIVE_INSTALL_PHASES.has(payload.phase)) {
      setStatus(payload.message || "Processando download...");
    }

    if (payload.phase === "failed") {
      clearRecentCompletedDownload(payload.gameId);
      setStatus(payload.message || "Falha na instalacao.", true);
      notify("error", "Falha na instalacao", payload.message || "O download nao foi concluido.");
      setTimeout(() => {
        state.installProgressByGameId.delete(payload.gameId);
        state.downloadSpeedByGameId.delete(payload.gameId);
        renderAll();
      }, 12000);
      return;
    }

    if (payload.phase === "completed") {
      rememberRecentCompletedDownload(payload.gameId);
      addToLibrary(payload.gameId);
      await refreshGames();
      fireConfettiFromElement(navLibraryBtn, true);
      setStatus("Download finalizado. O jogo foi para Sua biblioteca.");
      const installedGame = getGameById(payload.gameId);
      notify(
        "success",
        "Jogo instalado",
        installedGame ? `${installedGame.name} foi instalado com sucesso.` : "Jogo instalado com sucesso."
      );
      setTimeout(() => {
        state.installProgressByGameId.delete(payload.gameId);
        state.downloadSpeedByGameId.delete(payload.gameId);
        renderAll();
      }, 1200);
    }
  });

  if (typeof window.launcherApi.onCatalogChanged === "function") {
    window.launcherApi.onCatalogChanged((_payload) => {
      scheduleCatalogChangedRefresh("catalog-hint");
    });
  }

  if (typeof window.launcherApi.onWindowMaximized === "function") {
    window.launcherApi.onWindowMaximized((isMaximized) => {
      applyWindowMaximizedState(isMaximized);
    });
  }

  if (typeof window.launcherApi.isWindowMaximized === "function") {
    window.launcherApi
      .isWindowMaximized()
      .then((isMaximized) => {
        applyWindowMaximizedState(isMaximized);
      })
      .catch(() => {
        applyWindowMaximizedState(false);
      });
  }
}

installEventBindings();
loadInitialData();
