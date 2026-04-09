const STORAGE_KEY = "pr15-16-notes";
const CLIENT_ID_KEY = "pr15-16-client-id";
const LAST_ROUTE_KEY = "pr15-16-last-route";
const LOCAL_NOTIFICATION_KEY = "pr15-16-local-notifications";

const state = {
  notes: loadNotes(),
  route: localStorage.getItem(LAST_ROUTE_KEY) === "about" ? "about" : "home",
  query: "",
  editingId: null,
  registration: null,
  vapidPublicKey: null,
  localNotificationsEnabled: localStorage.getItem(LOCAL_NOTIFICATION_KEY) === "1",
};

const contentDiv = document.getElementById("app-content");
const homeButton = document.getElementById("home-btn");
const aboutButton = document.getElementById("about-btn");
const searchInput = document.getElementById("search-input");
const notesGrid = document.getElementById("notes-grid");
const notesMeta = document.getElementById("notes-meta");
const noteTemplate = document.getElementById("note-card-template");
const noteFab = document.getElementById("note-fab");
const connectionStatus = document.getElementById("connection-status");
const syncLabel = document.getElementById("sync-label");
const enablePushButton = document.getElementById("enable-push");
const disablePushButton = document.getElementById("disable-push");
const toastStack = document.getElementById("toast-stack");
const clientId = getOrCreateClientId();
const socket = typeof window.io === "function" ? window.io() : null;

let homeRefs = null;
let pageRequestId = 0;
let hasConnectedOnce = false;
let titleAttentionInterval = null;
let titleAttentionText = "";
const baseDocumentTitle = document.title;

const noteDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const reminderInputFormatter = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getOrCreateClientId() {
  const saved = localStorage.getItem(CLIENT_ID_KEY);

  if (saved) {
    return saved;
  }

  const generated = createId();
  localStorage.setItem(CLIENT_ID_KEY, generated);
  return generated;
}

function normalizeReminder(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const timestamp =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) || Date.parse(value) : NaN;

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return timestamp;
}

function normalizeNote(note) {
  if (!note || typeof note !== "object") {
    return null;
  }

  const title = String(note.title || "").trim().slice(0, 80);
  const body = String(note.body || "").trim().slice(0, 600);

  if (!title && !body) {
    return null;
  }

  return {
    id: String(note.id || createId()),
    title: title || "Без названия",
    body,
    reminder: normalizeReminder(note.reminder),
    createdAt:
      typeof note.createdAt === "string" && !Number.isNaN(Date.parse(note.createdAt))
        ? note.createdAt
        : new Date().toISOString(),
    clientId: String(note.clientId || ""),
  };
}

function sortNotes(notes) {
  return [...notes].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortNotes(parsed.map(normalizeNote).filter(Boolean));
  } catch (error) {
    console.error("Не удалось загрузить заметки:", error);
    return [];
  }
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
  updateSyncLabel();
}

function getNotesLabel(count) {
  if (count % 10 === 1 && count % 100 !== 11) {
    return "заметка";
  }

  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return "заметки";
  }

  return "заметок";
}

function formatNoteDate(dateString) {
  return noteDateFormatter.format(new Date(dateString));
}

function formatReminderDate(timestamp) {
  return noteDateFormatter.format(new Date(timestamp));
}

function formatReminderInputValue(timestamp) {
  if (!timestamp) {
    return "";
  }

  return reminderInputFormatter.format(new Date(timestamp)).replace(" ", "T");
}

function getReminderSummary(note) {
  if (!note.reminder) {
    return formatNoteDate(note.createdAt);
  }

  const prefix = note.reminder > Date.now() ? "Напомнить" : "Напоминание";
  return `${prefix}: ${formatReminderDate(note.reminder)}`;
}

function getReminderMessage(note) {
  const preview = String(note.body || "").trim();

  if (preview) {
    return `${note.title}: ${preview}`.slice(0, 180);
  }

  return note.title;
}

function showToast(message, tone = "info") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.dataset.tone = tone;
  toast.textContent = message;
  toastStack.append(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3600);
}

function usesLocalNotificationFallback() {
  return !window.isSecureContext || !("serviceWorker" in navigator) || !("PushManager" in window);
}

function saveLocalNotificationPreference(enabled) {
  state.localNotificationsEnabled = enabled;
  localStorage.setItem(LOCAL_NOTIFICATION_KEY, enabled ? "1" : "0");
}

function stopTitleAttention() {
  if (titleAttentionInterval) {
    window.clearInterval(titleAttentionInterval);
    titleAttentionInterval = null;
  }

  document.title = baseDocumentTitle;
}

function startTitleAttention(text) {
  if (!text) {
    return;
  }

  titleAttentionText = text;

  if (titleAttentionInterval) {
    return;
  }

  let highlighted = false;
  titleAttentionInterval = window.setInterval(() => {
    document.title = highlighted ? baseDocumentTitle : `[!] ${titleAttentionText}`;
    highlighted = !highlighted;
  }, 1000);
}

function notifyInPage(note) {
  if (!state.localNotificationsEnabled) {
    return;
  }

  showToast(`Новая заметка: ${note.title}`, "accent");

  if (document.hidden) {
    startTitleAttention(`Новая заметка: ${note.title}`);
  }
}

function setActiveRoute(route) {
  homeButton.classList.toggle("active", route === "home");
  aboutButton.classList.toggle("active", route === "about");
}

function updateConnectionStatus() {
  if (!connectionStatus) {
    updateSyncLabel();
    return;
  }

  if (!navigator.onLine) {
    connectionStatus.dataset.state = "offline";
    connectionStatus.textContent = "Нет сети";
    updateSyncLabel();
    return;
  }

  if (socket) {
    const connected = socket.connected;
    connectionStatus.dataset.state = connected ? "online" : "pending";
    connectionStatus.textContent = connected ? "В сети" : "Подключение";
    updateSyncLabel();
    return;
  }

  connectionStatus.dataset.state = "pending";
  connectionStatus.textContent = "Подключение";
  updateSyncLabel();
}

function updateSyncLabel() {
  if (!syncLabel) {
    return;
  }

  const count = state.notes.length;

  if (!navigator.onLine) {
    syncLabel.textContent = `Сеть недоступна. ${count} ${getNotesLabel(count)} хранятся локально.`;
    return;
  }

  if (socket && socket.connected) {
    syncLabel.textContent = `Локально сохранено ${count} ${getNotesLabel(count)}. Новые заметки рассылаются через Socket.IO.`;
    return;
  }

  syncLabel.textContent = `Локально сохранено ${count} ${getNotesLabel(count)}. Realtime-канал сейчас недоступен.`;
}

function getFilteredNotes() {
  const query = state.query.trim().toLowerCase();

  if (!query) {
    return state.notes;
  }

  return state.notes.filter((note) => {
    const haystack = `${note.title} ${note.body}`.toLowerCase();
    return haystack.includes(query);
  });
}

function renderNotes() {
  const filteredNotes = getFilteredNotes();
  notesMeta.textContent = `${filteredNotes.length} ${getNotesLabel(filteredNotes.length)}`;

  if (filteredNotes.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = state.query ? "Ничего не найдено" : "Заметок пока нет";
    notesGrid.replaceChildren(emptyState);
    updateSyncLabel();
    return;
  }

  const cards = filteredNotes.map((note) => {
    const fragment = noteTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".note-card");
    const title = fragment.querySelector(".note-card__title");
    const meta = fragment.querySelector(".note-card__meta");

    card.dataset.id = note.id;
    title.textContent = note.title;
    card.classList.toggle("note-card--active", note.id === state.editingId);
    card.classList.toggle("note-card--with-reminder", Boolean(note.reminder));

    if (meta) {
      meta.textContent = getReminderSummary(note);
    }
    card.setAttribute("aria-label", `Открыть заметку ${note.title}`);

    card.addEventListener("click", () => {
      openEditor(note);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openEditor(note);
      }
    });

    return fragment;
  });

  notesGrid.replaceChildren(...cards);
  updateSyncLabel();
}

function getCurrentNote() {
  if (!state.editingId) {
    return null;
  }

  return state.notes.find((note) => note.id === state.editingId) || null;
}

function bindHomeEditor() {
  const editorCard = document.getElementById("editor-card");
  const composerTrigger = document.getElementById("composer-trigger");
  const form = document.getElementById("note-form");
  const titleInput = document.getElementById("note-title");
  const bodyInput = document.getElementById("note-body");
  const reminderInput = document.getElementById("note-reminder");
  const editorDate = document.getElementById("editor-date");
  const deleteButton = document.getElementById("delete-note-button");
  const closeButton = document.getElementById("close-editor-button");

  if (
    !editorCard ||
    !composerTrigger ||
    !form ||
    !titleInput ||
    !bodyInput ||
    !reminderInput ||
    !editorDate ||
    !deleteButton ||
    !closeButton
  ) {
    return;
  }

  homeRefs = {
    editorCard,
    composerTrigger,
    form,
    titleInput,
    bodyInput,
    reminderInput,
    editorDate,
    deleteButton,
    closeButton,
  };

  composerTrigger.addEventListener("click", () => {
    openEditor();
  });

  titleInput.addEventListener("focus", expandEditor);
  bodyInput.addEventListener("focus", expandEditor);
  reminderInput.addEventListener("focus", expandEditor);

  form.addEventListener("submit", submitEditor);
  deleteButton.addEventListener("click", deleteCurrentNote);
  closeButton.addEventListener("click", collapseEditor);

  if (state.editingId) {
    const note = getCurrentNote();

    if (note) {
      populateEditor(note);
      expandEditor();
      return;
    }
  }

  collapseEditor(false);
}

function expandEditor() {
  if (!homeRefs) {
    return;
  }

  homeRefs.composerTrigger.hidden = true;
  homeRefs.form.hidden = false;
}

function collapseEditor(resetSelection = true) {
  if (!homeRefs) {
    return;
  }

  homeRefs.form.hidden = true;
  homeRefs.composerTrigger.hidden = false;

  if (resetSelection) {
    state.editingId = null;
  }

  clearEditorFields();
  updateDeleteButtonVisibility();
  renderNotes();
}

function clearEditorFields() {
  if (!homeRefs) {
    return;
  }

  homeRefs.titleInput.value = "";
  homeRefs.bodyInput.value = "";
  homeRefs.reminderInput.value = "";
  homeRefs.editorDate.textContent = "Создано только что";
}

function populateEditor(note) {
  if (!homeRefs) {
    return;
  }

  state.editingId = note.id;
  homeRefs.titleInput.value = note.title;
  homeRefs.bodyInput.value = note.body;
  homeRefs.reminderInput.value = formatReminderInputValue(note.reminder);
  homeRefs.editorDate.textContent = formatNoteDate(note.createdAt);
  updateDeleteButtonVisibility();
  renderNotes();
  homeRefs.titleInput.focus();
}

function updateDeleteButtonVisibility() {
  if (!homeRefs) {
    return;
  }

  homeRefs.deleteButton.hidden = !state.editingId;
}

async function loadContent(route) {
  state.route = route;
  localStorage.setItem(LAST_ROUTE_KEY, route);
  setActiveRoute(route);
  homeRefs = null;

  const currentRequestId = ++pageRequestId;
  contentDiv.innerHTML = `
    <section class="quick-note quick-note--loading">
      <div class="loading-line"></div>
      <div class="loading-line loading-line--wide"></div>
      <div class="loading-block"></div>
    </section>
  `;

  try {
    const response = await fetch(`/content/${route}.html`);

    if (!response.ok) {
      throw new Error(`Не удалось загрузить ${route}.html`);
    }

    const html = await response.text();

    if (currentRequestId !== pageRequestId) {
      return;
    }

    contentDiv.innerHTML = html;

    if (route === "home") {
      bindHomeEditor();
    }
  } catch (error) {
    contentDiv.innerHTML = `
      <section class="quick-note">
        <div class="about-view">
          <h2>Не удалось загрузить раздел</h2>
          <p class="about-view__lead">Проверьте соединение и попробуйте обновить страницу.</p>
        </div>
      </section>
    `;
    console.error(error);
  }
}

async function openEditor(note = null) {
  if (state.route !== "home") {
    await loadContent("home");
  }

  if (!homeRefs) {
    return;
  }

  expandEditor();

  if (note) {
    populateEditor(note);
    return;
  }

  state.editingId = null;
  clearEditorFields();
  updateDeleteButtonVisibility();
  renderNotes();
  homeRefs.titleInput.focus();
}

function submitEditor(event) {
  event.preventDefault();

  if (!homeRefs) {
    return;
  }

  const title = homeRefs.titleInput.value.trim();
  const body = homeRefs.bodyInput.value.trim();
  const reminderValue = homeRefs.reminderInput.value;
  const reminder = reminderValue ? new Date(reminderValue).getTime() : null;
  const existingNote = getCurrentNote();

  if (!title && !body) {
    homeRefs.titleInput.focus();
    return;
  }

  if (reminderValue && (!Number.isFinite(reminder) || reminder <= Date.now()) && reminder !== existingNote?.reminder) {
    showToast("Дата напоминания должна быть в будущем", "danger");
    homeRefs.reminderInput.focus();
    return;
  }

  let savedNote = null;
  let created = false;

  if (state.editingId) {
    state.notes = state.notes.map((note) => {
      if (note.id !== state.editingId) {
        return note;
      }

      savedNote = {
        ...note,
        title: title || "Без названия",
        body,
        reminder,
      };

      return savedNote;
    });
  } else {
    created = true;
    savedNote = {
      id: createId(),
      title: title || "Без названия",
      body,
      reminder,
      createdAt: new Date().toISOString(),
      clientId,
    };
    state.notes = [savedNote, ...state.notes];
  }

  state.notes = sortNotes(state.notes);
  saveNotes();
  renderNotes();

  if (socket) {
    if (created) {
      socket.emit("newNote", savedNote);
    }

    if (savedNote.reminder) {
      socket.emit("newReminder", {
        id: savedNote.id,
        text: getReminderMessage(savedNote),
        reminderTime: savedNote.reminder,
      });
    } else {
      socket.emit("cancelReminder", { id: savedNote.id });
    }
  }

  showToast(created ? `Заметка «${savedNote.title}» сохранена` : `Заметка «${savedNote.title}» обновлена`, "success");
  collapseEditor();
}

function deleteCurrentNote() {
  if (!state.editingId) {
    return;
  }

  const deletedId = state.editingId;
  state.notes = state.notes.filter((note) => note.id !== state.editingId);
  saveNotes();
  renderNotes();

  if (socket) {
    socket.emit("cancelReminder", { id: deletedId });
  }
  showToast("Заметка удалена", "danger");
  collapseEditor();
}

function upsertNote(note) {
  const normalized = normalizeNote(note);

  if (!normalized) {
    return;
  }

  const index = state.notes.findIndex((item) => item.id === normalized.id);

  if (index >= 0) {
    state.notes.splice(index, 1, normalized);
  } else {
    state.notes.unshift(normalized);
  }

  state.notes = sortNotes(state.notes);
  saveNotes();
  renderNotes();
}

function bindSocketEvents() {
  if (!socket) {
    updateConnectionStatus();
    return;
  }

  socket.on("connect", () => {
    updateConnectionStatus();

    if (hasConnectedOnce) {
      showToast("Подключение восстановлено", "success");
    }

    hasConnectedOnce = true;
  });

  socket.on("disconnect", () => {
    updateConnectionStatus();
  });

  socket.on("connect_error", () => {
    updateConnectionStatus();
  });

  socket.on("noteAdded", (note) => {
    const normalized = normalizeNote(note);

    if (!normalized) {
      return;
    }

    if (normalized.clientId === clientId && state.notes.some((item) => item.id === normalized.id)) {
      return;
    }

    upsertNote(normalized);

    if (usesLocalNotificationFallback()) {
      notifyInPage(normalized);
      return;
    }
    showToast(`Новая заметка: ${normalized.title}`, "accent");
  });
  socket.on("reminderTriggered", (payload) => {
    const title = String(payload?.title || "Напоминание").trim();
    const body = String(payload?.body || "").trim();

    if (!body) {
      return;
    }

    if (usesLocalNotificationFallback()) {
      notifyInPage({ title: body });
      return;
    }

    showToast(`${title}: ${body}`, "accent");
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

async function fetchPublicKey() {
  if (state.vapidPublicKey) {
    return state.vapidPublicKey;
  }

  const response = await fetch("/api/push/public-key");

  if (!response.ok) {
    throw new Error("Не удалось получить VAPID-ключ");
  }

  const payload = await response.json();
  state.vapidPublicKey = payload.publicKey;
  return state.vapidPublicKey;
}

function getPushSupportState() {
  if (!("Notification" in window)) {
    return {
      supported: false,
      reason: "Этот браузер не поддерживает уведомления.",
    };
  }

  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: `Для уведомлений нужен HTTPS или localhost. Адрес ${window.location.origin} не считается безопасным контекстом.`,
    };
  }

  if (!("serviceWorker" in navigator)) {
    return {
      supported: false,
      reason: "Service Worker недоступен, поэтому push-уведомления не работают.",
    };
  }

  if (!("PushManager" in window)) {
    return {
      supported: false,
      reason: "Push API недоступен в этом браузере или отключён настройками браузера.",
    };
  }

  return {
    supported: true,
    reason: "",
  };
}

function getNotificationPermissionReason(permission = Notification.permission) {
  if (permission === "denied") {
    return `Для адреса ${window.location.origin} уведомления заблокированы. Разрешение задаётся отдельно для каждого адреса и порта.`;
  }

  if (permission === "default") {
    return `Для адреса ${window.location.origin} уведомления ещё не разрешены. Если запрос не появляется, проверьте разрешение именно для этого адреса.`;
  }

  return "";
}

function getPushSubscribeErrorMessage(error) {
  if (error?.name === "NotAllowedError") {
    return getNotificationPermissionReason("denied");
  }

  if (error?.name === "AbortError") {
    return "Браузер прервал оформление push-подписки. Попробуйте обновить страницу и повторить.";
  }

  return "Не удалось включить push-уведомления.";
}

async function syncPushButtonsState() {
  const supportState = getPushSupportState();

  if (usesLocalNotificationFallback()) {
    enablePushButton.disabled = false;
    disablePushButton.disabled = false;
    enablePushButton.hidden = state.localNotificationsEnabled;
    disablePushButton.hidden = !state.localNotificationsEnabled;
    enablePushButton.textContent = "Включить уведомления на сайте";
    disablePushButton.textContent = "Отключить уведомления на сайте";
    enablePushButton.title = "На обычном HTTP доступны уведомления только внутри открытой вкладки.";
    disablePushButton.title = "";
    return;
  }

  if (!supportState.supported) {
    enablePushButton.disabled = true;
    enablePushButton.hidden = false;
    enablePushButton.textContent = "Уведомления недоступны";
    enablePushButton.title = supportState.reason;
    disablePushButton.hidden = true;
    return;
  }

  if (!state.registration) {
    enablePushButton.disabled = true;
    enablePushButton.hidden = false;
    enablePushButton.textContent = "Подготовка уведомлений...";
    enablePushButton.title = "";
    disablePushButton.hidden = true;
    return;
  }

  const subscription = await state.registration.pushManager.getSubscription();
  const subscribed = Boolean(subscription);

  enablePushButton.disabled = false;
  disablePushButton.disabled = false;
  enablePushButton.textContent = "Включить уведомления";
  enablePushButton.title = getNotificationPermissionReason();
  disablePushButton.title = "";
  enablePushButton.hidden = subscribed;
  disablePushButton.hidden = !subscribed;
}

async function updatePushButtons() {
  return syncPushButtonsState();
  const supported =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  if (!supported) {
    enablePushButton.disabled = true;
    enablePushButton.textContent = "Push не поддерживается";
    disablePushButton.hidden = true;
    return;
  }

  if (!state.registration) {
    enablePushButton.disabled = true;
    disablePushButton.hidden = true;
    return;
  }

  const subscription = await state.registration.pushManager.getSubscription();
  const subscribed = Boolean(subscription);

  enablePushButton.disabled = false;
  disablePushButton.disabled = false;
  enablePushButton.hidden = subscribed;
  disablePushButton.hidden = !subscribed;
}

async function subscribeToPush() {
  if (!state.registration) {
    return false;
  }

  let subscription = await state.registration.pushManager.getSubscription();

  if (!subscription) {
    const publicKey = await fetchPublicKey();

    subscription = await state.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const response = await fetch("/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(subscription),
  });

  if (!response.ok) {
    throw new Error("Не удалось сохранить push-подписку");
  }

  await updatePushButtons();
  return true;
}

async function unsubscribeFromPush() {
  if (!state.registration) {
    return false;
  }

  const subscription = await state.registration.pushManager.getSubscription();

  if (!subscription) {
    await updatePushButtons();
    return true;
  }

  await fetch("/unsubscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });

  await subscription.unsubscribe();
  await updatePushButtons();
  return true;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    state.registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    await updatePushButtons();
  } catch (error) {
    console.error("Ошибка регистрации Service Worker:", error);
    showToast("Service Worker не зарегистрирован", "danger");
  }
}

async function handleEnablePushClick() {
  const supportState = getPushSupportState();

  if (usesLocalNotificationFallback()) {
    saveLocalNotificationPreference(true);
    stopTitleAttention();
    await updatePushButtons();
    showToast("На этом адресе включены уведомления внутри сайта.", "success");
    return;
  }

  if (!supportState.supported) {
    showToast(supportState.reason, "danger");
    return;
  }

  if (Notification.permission === "denied") {
    showToast(getNotificationPermissionReason("denied"), "danger");
    return;
  }

  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    await updatePushButtons();

    if (permission !== "granted") {
      showToast(getNotificationPermissionReason(permission), "danger");
      return;
    }
  }

  if (!state.registration) {
    showToast("Service Worker ещё не готов. Обновите страницу и попробуйте снова.", "danger");
    return;
  }

  try {
    await subscribeToPush();
    showToast("Push-уведомления включены", "success");
  } catch (error) {
    console.error(error);
    showToast(getPushSubscribeErrorMessage(error), "danger");
  }
}

async function handleDisablePushClick() {
  if (usesLocalNotificationFallback()) {
    saveLocalNotificationPreference(false);
    stopTitleAttention();
    await updatePushButtons();
    showToast("Уведомления внутри сайта отключены");
    return;
  }

  try {
    await unsubscribeFromPush();
    showToast("Push-уведомления отключены");
  } catch (error) {
    console.error(error);
    showToast("Не удалось отключить push-уведомления", "danger");
  }
}

function preloadDynamicContent() {
  ["/content/home.html", "/content/about.html"].forEach((url) => {
    fetch(url).catch(() => null);
  });
}

function bindShellEvents() {
  homeButton.addEventListener("click", () => {
    loadContent("home");
  });

  aboutButton.addEventListener("click", () => {
    loadContent("about");
  });

  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderNotes();
  });

  noteFab.addEventListener("click", () => {
    openEditor();
  });

  enablePushButton.addEventListener("click", async () => {
    return handleEnablePushClick();
    if (!("Notification" in window)) {
      showToast("Браузер не поддерживает push-уведомления", "danger");
      return;
    }

    if (Notification.permission === "denied") {
      showToast("Уведомления заблокированы в настройках браузера", "danger");
      return;
    }

    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        showToast("Чтобы получать push, нужно разрешить уведомления", "danger");
        return;
      }
    }

    try {
      await subscribeToPush();
      showToast("Push-уведомления включены", "success");
    } catch (error) {
      console.error(error);
      showToast("Не удалось включить push-уведомления", "danger");
    }
  });

  disablePushButton.addEventListener("click", async () => {
    return handleDisablePushClick();
    try {
      await unsubscribeFromPush();
      showToast("Push-уведомления отключены");
    } catch (error) {
      console.error(error);
      showToast("Не удалось отключить push-уведомления", "danger");
    }
  });

  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      stopTitleAttention();
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === LOCAL_NOTIFICATION_KEY) {
      state.localNotificationsEnabled = event.newValue === "1";
      updatePushButtons();
      return;
    }

    if (event.key !== STORAGE_KEY) {
      return;
    }

    state.notes = loadNotes();
    renderNotes();
  });
}

async function bootstrap() {
  bindShellEvents();
  bindSocketEvents();
  renderNotes();
  updateConnectionStatus();

  await Promise.allSettled([registerServiceWorker(), loadContent(state.route)]);
  preloadDynamicContent();
  updateConnectionStatus();
}

bootstrap();
