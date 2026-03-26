const STORAGE_KEY = "pr13-desktop-notes";
const SAMPLE_NOTE_IDS = new Set(["sample-1", "sample-2", "sample-3", "sample-4", "sample-5"]);

const state = {
  notes: loadNotes(),
  query: "",
  editingId: null,
  previewMode: false,
  history: [],
  historyIndex: -1,
};

const searchInput = document.getElementById("search-input");
const composerTrigger = document.getElementById("composer-trigger");
const editorCard = document.getElementById("editor-card");
const form = document.getElementById("note-form");
const titleInput = document.getElementById("note-title");
const bodyInput = document.getElementById("note-body");
const previewBox = document.getElementById("note-preview");
const editorDate = document.getElementById("editor-date");
const notesGrid = document.getElementById("notes-grid");
const notesMeta = document.getElementById("notes-meta");
const noteTemplate = document.getElementById("note-card-template");
const deleteNoteButton = document.getElementById("delete-note-button");
const closeEditorButton = document.getElementById("close-editor-button");
const noteFab = document.getElementById("note-fab");

function loadNotes() {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedNotes = JSON.parse(rawValue);

    if (!Array.isArray(parsedNotes) || parsedNotes.length === 0) {
      return [];
    }

    const notes = parsedNotes
      .filter((note) => !SAMPLE_NOTE_IDS.has(String(note?.id || "")))
      .map((note) => ({
      id: String(note.id),
      title: String(note.title || "Без названия"),
      body: String(note.body || ""),
      createdAt: note.createdAt || new Date().toISOString(),
      }));

    if (notes.length !== parsedNotes.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }

    return notes;
  } catch (error) {
    console.error("Не удалось загрузить заметки:", error);
    return [];
  }
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
}

function formatRelativeDate(dateString) {
  const createdAt = new Date(dateString);
  const now = new Date();
  const diffInMs = now - createdAt;
  const diffInDays = Math.max(0, Math.floor(diffInMs / 86400000));

  if (diffInDays === 0) {
    return "Создано только что";
  }

  if (diffInDays === 1) {
    return "Создано 1 день назад";
  }

  if (diffInDays < 7) {
    return `Создано ${diffInDays} дня назад`;
  }

  const weeks = Math.floor(diffInDays / 7);

  if (weeks === 1) {
    return "Создано 1 неделю назад";
  }

  if (weeks < 5) {
    return `Создано ${weeks} недели назад`;
  }

  return `Создано ${Math.floor(diffInDays / 30)} мес. назад`;
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
  notesMeta.textContent = `${filteredNotes.length} ${getCountLabel(filteredNotes.length)}`;

  if (filteredNotes.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = state.query ? "Ничего не найдено" : "Заметок пока нет";
    notesGrid.replaceChildren(emptyState);
    return;
  }

  const cards = filteredNotes.map((note) => {
    const fragment = noteTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".note-card");
    const title = fragment.querySelector(".note-card__title");

    card.dataset.id = note.id;
    card.setAttribute("aria-label", `Открыть заметку ${note.title}`);
    title.textContent = note.title;
    card.classList.toggle("note-card--active", note.id === state.editingId);

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
}

function getCountLabel(count) {
  if (count % 10 === 1 && count % 100 !== 11) {
    return "заметка";
  }

  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return "заметки";
  }

  return "заметок";
}

function expandEditor() {
  composerTrigger.hidden = true;
  form.hidden = false;
  editorCard.classList.add("quick-note--expanded");
  updateDeleteButtonVisibility();
}

function collapseEditor() {
  form.hidden = true;
  composerTrigger.hidden = false;
  editorCard.classList.remove("quick-note--expanded");
  resetPreviewMode();
  clearEditor();
}

function clearEditor() {
  state.editingId = null;
  titleInput.value = "";
  bodyInput.value = "";
  editorDate.textContent = "Создано только что";
  resetHistory();
  updateDeleteButtonVisibility();
  renderNotes();
}

function openEditor(note = null) {
  expandEditor();

  if (note) {
    state.editingId = note.id;
    titleInput.value = note.title;
    bodyInput.value = note.body;
    editorDate.textContent = formatRelativeDate(note.createdAt);
  } else {
    clearEditor();
  }

  resetPreviewMode();
  resetHistory();
  updateDeleteButtonVisibility();
  renderNotes();
  titleInput.focus();
}

function createNotePayload() {
  const title = titleInput.value.trim() || "Без названия";
  const body = bodyInput.value.trim();

  return { title, body };
}

function submitEditor(event) {
  event.preventDefault();

  const { title, body } = createNotePayload();

  if (!title && !body) {
    titleInput.focus();
    return;
  }

  if (state.editingId) {
    state.notes = state.notes.map((note) =>
      note.id === state.editingId
        ? { ...note, title, body }
        : note
    );
  } else {
    state.notes = [
      {
        id: crypto.randomUUID(),
        title,
        body,
        createdAt: new Date().toISOString(),
      },
      ...state.notes,
    ];
  }

  saveNotes();
  renderNotes();
  collapseEditor();
}

function resetHistory() {
  state.history = [
    {
      title: titleInput.value,
      body: bodyInput.value,
    },
  ];
  state.historyIndex = 0;
}

function pushHistorySnapshot() {
  const snapshot = {
    title: titleInput.value,
    body: bodyInput.value,
  };

  const current = state.history[state.historyIndex];

  if (current && current.title === snapshot.title && current.body === snapshot.body) {
    return;
  }

  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(snapshot);
  state.historyIndex = state.history.length - 1;
}

function resetPreviewMode() {
  state.previewMode = false;
  bodyInput.hidden = false;
  previewBox.hidden = true;
  previewBox.textContent = "";
}

function updateDeleteButtonVisibility() {
  deleteNoteButton.hidden = !state.editingId;
}

function deleteCurrentNote() {
  if (!state.editingId) {
    return;
  }

  state.notes = state.notes.filter((note) => note.id !== state.editingId);
  saveNotes();
  renderNotes();
  collapseEditor();
}

function bindEvents() {
  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderNotes();
  });

  composerTrigger.addEventListener("click", () => {
    openEditor();
  });

  titleInput.addEventListener("focus", expandEditor);
  bodyInput.addEventListener("focus", expandEditor);

  form.addEventListener("submit", submitEditor);

  closeEditorButton.addEventListener("click", () => {
    collapseEditor();
  });

  noteFab.addEventListener("click", () => {
    openEditor();
  });

  deleteNoteButton.addEventListener("click", deleteCurrentNote);

  [titleInput, bodyInput].forEach((field) => {
    field.addEventListener("input", () => {
      pushHistorySnapshot();
    });
  });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (error) {
    console.error("Ошибка регистрации Service Worker:", error);
  }
}

window.addEventListener("load", () => {
  bindEvents();
  renderNotes();
  registerServiceWorker();
});
