/* ================================================
   HELPDESK FOCUS — renderer.js
   All UI logic & localStorage persistence
   ================================================ */

'use strict';

/* -----------------------------------------------
   THEME TOGGLE
----------------------------------------------- */
(function initTheme() {
  const saved = localStorage.getItem('hf_theme') || 'light';
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  updateToggleBtn(saved);
})();

function updateToggleBtn(theme) {
  const icon  = document.getElementById('theme-toggle-icon');
  const label = document.getElementById('theme-toggle-label');
  if (!icon || !label) return;
  if (theme === 'dark') {
    icon.textContent  = '☀';
    label.textContent = 'Claro';
  } else {
    icon.textContent  = '🌙';
    label.textContent = 'Oscuro';
  }
}

document.getElementById('theme-toggle-btn').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next    = current === 'dark' ? 'light' : 'dark';
  if (next === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('hf_theme', next);
  updateToggleBtn(next);
});

/* -----------------------------------------------
   CLOCK & DATE
----------------------------------------------- */
function updateClock() {
  const now = new Date();
  const timeEl = document.getElementById('clock-time');
  const dateEl = document.getElementById('clock-date');

  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  timeEl.textContent = `${h}:${m}:${s}`;

  const opts = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  dateEl.textContent = now.toLocaleDateString(undefined, opts);
}
updateClock();
setInterval(updateClock, 1000);

/* -----------------------------------------------
   NAVIGATION
----------------------------------------------- */
const sectionTitles = {
  tasks:    'Tareas Pendientes',
  emails:   'Correos Pendientes',
  pomodoro: 'Temporizador Pomodoro',
  notes:    'Notas Rápidas',
};

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.section;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`section-${target}`).classList.add('active');
    document.getElementById('section-title').textContent = sectionTitles[target];
  });
});

/* -----------------------------------------------
   UTILS
----------------------------------------------- */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* =============================================
   SECTION 1 — TASKS
============================================= */
let tasks = load('hf_tasks', []);

// Migrate old tasks that lack status field
tasks = tasks.map(t => ({ status: 'todo', comments: [], ...t }));

function saveTasks() { save('hf_tasks', tasks); }

const taskStatusLabels = {
  'todo':        '📋 Pendiente',
  'in-progress': '🔄 En Progreso',
  'blocked':     '🚫 Bloqueado',
  'done':        '✅ Completado',
};

function updateTaskBadges() {
  const pending = tasks.filter(t => !t.done).length;
  const badge = document.getElementById('task-badge');
  badge.textContent = pending;
  badge.classList.toggle('visible', pending > 0);

  document.getElementById('pending-count').textContent = pending;
  document.getElementById('done-count').textContent = tasks.filter(t => t.done).length;
}

function createTaskEl(task) {
  const li = document.createElement('li');
  li.className = `task-item${task.done ? ' done' : ''}`;
  li.dataset.id = task.id;

  const status = task.status || 'todo';
  const commentCount = (task.comments || []).length;

  li.innerHTML = `
    <span class="priority-dot ${task.priority}"></span>
    <span class="task-title">${escHtml(task.title)}</span>
    <span class="task-status-tag ${status}">${taskStatusLabels[status]}</span>
    ${commentCount > 0 ? `<span style="font-size:11px;color:var(--text-muted);margin-left:4px">💬 ${commentCount}</span>` : ''}
    <div class="task-actions">
      <button class="btn-icon" title="Abrir tarjeta" data-action="open" style="font-size:14px">⥂</button>
      <button class="btn-icon" title="${task.done ? 'Deshacer' : 'Marcar completado'}" data-action="toggle">
        ${task.done ? '↩' : '✓'}
      </button>
      <button class="btn-icon danger" title="Eliminar" data-action="delete">✕</button>
    </div>
  `;

  li.querySelector('[data-action="open"]').addEventListener('click', e => {
    e.stopPropagation();
    openTaskModal(task.id);
  });

  li.querySelector('[data-action="toggle"]').addEventListener('click', e => {
    e.stopPropagation();
    const t = tasks.find(x => x.id === task.id);
    if (t) { t.done = !t.done; saveTasks(); renderTasks(); }
  });

  li.querySelector('[data-action="delete"]').addEventListener('click', e => {
    e.stopPropagation();
    tasks = tasks.filter(x => x.id !== task.id);
    saveTasks(); renderTasks();
  });

  // Also open modal on row click
  li.addEventListener('click', () => openTaskModal(task.id));

  return li;
}

function renderTasks() {
  const pending = tasks.filter(t => !t.done);
  const done    = tasks.filter(t => t.done);

  const pendingList = document.getElementById('task-list');
  const doneList    = document.getElementById('done-list');

  pendingList.innerHTML = '';
  doneList.innerHTML = '';

  if (pending.length === 0) {
    pendingList.innerHTML = '<li class="empty-state">Sin tareas pendientes 🎉</li>';
  } else {
    pending.forEach(t => pendingList.appendChild(createTaskEl(t)));
  }

  if (done.length === 0) {
    doneList.innerHTML = '<li class="empty-state">Nada completado aún</li>';
  } else {
    done.forEach(t => doneList.appendChild(createTaskEl(t)));
  }

  updateTaskBadges();
}

document.getElementById('add-task-btn').addEventListener('click', () => {
  const input = document.getElementById('task-input');
  const priority = document.getElementById('task-priority').value;
  const title = input.value.trim();
  if (!title) { input.focus(); return; }

  tasks.unshift({ id: genId(), title, priority, done: false, status: 'todo', comments: [], createdAt: Date.now() });
  saveTasks();
  renderTasks();
  input.value = '';
  input.focus();
});

document.getElementById('task-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('add-task-btn').click();
});

renderTasks();

/* =============================================
   TASK DETAIL MODAL
============================================= */
let modalTaskId = null;

const modalOverlay    = document.getElementById('task-modal-overlay');
const modalTitleInput = document.getElementById('modal-title-input');
const modalPriorityDot = document.getElementById('modal-priority-dot');
const modalCreatedAt  = document.getElementById('modal-created-at');
const commentList     = document.getElementById('comment-list');
const commentInput    = document.getElementById('comment-input');
const commentCount    = document.getElementById('comment-count');

function openTaskModal(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  modalTaskId = taskId;

  modalTitleInput.value = task.title;
  modalPriorityDot.className = `priority-dot modal-priority-dot ${task.priority}`;

  document.querySelectorAll('.status-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === (task.status || 'todo'));
  });

  document.querySelectorAll('.priority-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.priority === task.priority);
  });

  if (task.createdAt) {
    const d = new Date(task.createdAt);
    modalCreatedAt.textContent = d.toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  } else {
    modalCreatedAt.textContent = '—';
  }

  renderModalComments(task);
  commentInput.value = '';

  modalOverlay.classList.add('open');
  setTimeout(() => modalTitleInput.focus(), 50);
}

function renderModalComments(task) {
  commentList.innerHTML = '';
  const comments = task.comments || [];
  commentCount.textContent = comments.length;

  if (comments.length === 0) {
    commentList.innerHTML = '<li style="color:var(--text-muted);font-size:12.5px;padding:8px 0">Sin comentarios aún. Agregá uno abajo.</li>';
    return;
  }

  comments.forEach((c, idx) => {
    const li = document.createElement('li');
    li.className = 'comment-item';
    const ts = new Date(c.createdAt).toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' }) +
               ' · ' + new Date(c.createdAt).toLocaleDateString(undefined, { day:'numeric', month:'short' });
    li.innerHTML = `
      <div class="comment-item-header">
        <span class="comment-time">${ts}</span>
        <button class="btn-icon danger" data-idx="${idx}" title="Delete comment" style="font-size:12px">✕</button>
      </div>
      <div class="comment-text">${escHtml(c.text)}</div>
    `;
    li.querySelector('[data-idx]').addEventListener('click', () => {
      const t = tasks.find(x => x.id === modalTaskId);
      if (t) { t.comments.splice(idx, 1); saveTasks(); renderModalComments(t); renderTasks(); }
    });
    commentList.appendChild(li);
  });

  commentList.scrollTop = commentList.scrollHeight;
}

function closeModal() {
  modalOverlay.classList.remove('open');
  modalTaskId = null;
}

function saveModalChanges() {
  const task = tasks.find(t => t.id === modalTaskId);
  if (!task) return;

  const newTitle = modalTitleInput.value.trim();
  if (newTitle) task.title = newTitle;

  const activeStatus = document.querySelector('.status-chip.active');
  if (activeStatus) task.status = activeStatus.dataset.status;

  task.done = task.status === 'done';

  const activePriority = document.querySelector('.priority-chip.active');
  if (activePriority) task.priority = activePriority.dataset.priority;

  saveTasks();
  renderTasks();
  closeModal();
}

document.querySelectorAll('.status-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.status-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

document.querySelectorAll('.priority-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.priority-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    modalPriorityDot.className = `priority-dot modal-priority-dot ${btn.dataset.priority}`;
  });
});

document.getElementById('add-comment-btn').addEventListener('click', () => {
  const text = commentInput.value.trim();
  if (!text) { commentInput.focus(); return; }
  const task = tasks.find(t => t.id === modalTaskId);
  if (!task) return;
  task.comments.push({ id: genId(), text, createdAt: Date.now() });
  saveTasks();
  renderModalComments(task);
  renderTasks();
  commentInput.value = '';
  commentInput.focus();
});

commentInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    document.getElementById('add-comment-btn').click();
  }
});

document.getElementById('modal-save-btn').addEventListener('click', saveModalChanges);
document.getElementById('modal-close-btn').addEventListener('click', closeModal);
document.getElementById('modal-close-btn2').addEventListener('click', closeModal);

modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
});

/* =============================================
   SECTION 2 — EMAILS
============================================= */
let emails = load('hf_emails', []);
let sentEmails = load('hf_sent_emails', []);

function saveEmails() { save('hf_emails', emails); }
function saveSentEmails() { save('hf_sent_emails', sentEmails); }

function updateEmailBadge() {
  const badge = document.getElementById('email-badge');
  badge.textContent = emails.length;
  badge.classList.toggle('visible', emails.length > 0);
  
  const pendingCount = document.getElementById('pending-email-count');
  const sentCount = document.getElementById('sent-email-count');
  if (pendingCount) pendingCount.textContent = emails.length;
  if (sentCount) sentCount.textContent = sentEmails.length;
}

const statusLabels = {
  'unread':      '✉ No leído (Outlook)',
  'waiting':     'Esperando respuesta',
  'need-answer': 'Necesita respuesta',
  'escalated':   'Escalado',
  'sent':        '✓ Enviado'
};

function createEmailEl(email, isSent = false) {
  const li = document.createElement('li');
  li.className = `email-item ${isSent ? 'sent' : email.status}`;
  li.dataset.id = email.id;

  if (isSent) {
    li.innerHTML = `
      <div class="email-info">
        <div class="email-sender">${escHtml(email.sender)}</div>
        <div class="email-subject">${escHtml(email.subject)}</div>
      </div>
      <span class="email-status-badge sent">${statusLabels['sent']}</span>
      <button class="btn-icon danger" title="Eliminar" data-action="delete">✕</button>
    `;
    li.style.opacity = '0.65';
  } else {
    li.innerHTML = `
      <div class="email-info">
        <div class="email-sender">${escHtml(email.sender)}</div>
        <div class="email-subject">${escHtml(email.subject)}</div>
      </div>
      <span class="email-status-badge ${email.status}">${statusLabels[email.status] || email.status}</span>
      <button class="btn btn-secondary btn-sm" title="Redactar correo" data-action="compose" style="font-size:12px;padding:5px 10px;">✉ Redactar</button>
      <button class="btn-icon" title="Marcar resuelto" data-action="resolve">✓</button>
      <button class="btn-icon danger" title="Eliminar" data-action="delete">✕</button>
    `;

    li.querySelector('[data-action="compose"]').addEventListener('click', () => {
      openComposeModal(`Re: ${email.subject}`, email.sender || '', email.id);
    });

    li.querySelector('[data-action="resolve"]').addEventListener('click', () => {
      emails = emails.filter(x => x.id !== email.id);
      saveEmails(); renderEmails();
    });
  }

  li.querySelector('[data-action="delete"]').addEventListener('click', () => {
    if (isSent) {
      sentEmails = sentEmails.filter(x => x.id !== email.id);
      saveSentEmails(); renderEmails();
    } else {
      emails = emails.filter(x => x.id !== email.id);
      saveEmails(); renderEmails();
    }
  });

  return li;
}

function renderEmails() {
  const list = document.getElementById('email-list');
  const sentList = document.getElementById('sent-email-list');
  if (!list) return;

  list.innerHTML = '';
  if (sentList) sentList.innerHTML = '';

  if (emails.length === 0) {
    list.innerHTML = '<li class="empty-state">Sin correos pendientes 📭</li>';
  } else {
    emails.forEach(e => list.appendChild(createEmailEl(e, false)));
  }

  if (sentList) {
    if (sentEmails.length === 0) {
      sentList.innerHTML = '<li class="empty-state">No hay historial 📭</li>';
    } else {
      sentEmails.forEach(e => sentList.appendChild(createEmailEl(e, true)));
    }
  }

  updateEmailBadge();
}

document.getElementById('add-email-btn').addEventListener('click', () => {
  const senderEl  = document.getElementById('email-sender');
  const subjectEl = document.getElementById('email-subject');
  const statusEl  = document.getElementById('email-status');

  const sender  = senderEl.value.trim();
  const subject = subjectEl.value.trim();
  const status  = statusEl.value;

  if (!sender || !subject) {
    if (!sender) senderEl.focus();
    else subjectEl.focus();
    return;
  }

  emails.unshift({ id: genId(), sender, subject, status, addedAt: Date.now() });
  saveEmails(); renderEmails();
  senderEl.value = '';
  subjectEl.value = '';
  senderEl.focus();
});

document.getElementById('email-sender').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('email-subject').focus();
});
document.getElementById('email-subject').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('add-email-btn').click();
});

/* --- ipcRenderer para envío de correos --- */
const { ipcRenderer } = require('electron');


renderEmails();

/* =============================================
   SECTION 3 — POMODORO
============================================= */

let pomSettings = load('hf_pomo_settings', { workMin: 25, breakMin: 5, sessionsPerCycle: 4 });

let pomState = {
  phase: 'work',
  running: false,
  totalSeconds: pomSettings.workMin * 60,
  remaining: pomSettings.workMin * 60,
  session: 1,
  completedSessions: 0,
  interval: null,
};

const CIRCUMFERENCE = 2 * Math.PI * 88; // r=88

const timerDisplay  = document.getElementById('timer-display');
const ringProgress  = document.getElementById('ring-progress');
const phaseEl       = document.getElementById('pomodoro-phase');
const sessionInfoEl = document.getElementById('pomodoro-session-info');
const startBtn      = document.getElementById('pomo-start');
const pauseBtn      = document.getElementById('pomo-pause');
const resetBtn      = document.getElementById('pomo-reset');

ringProgress.style.strokeDasharray = CIRCUMFERENCE;

document.getElementById('work-duration').value  = pomSettings.workMin;
document.getElementById('break-duration').value = pomSettings.breakMin;
document.getElementById('sessions-per-cycle').value = pomSettings.sessionsPerCycle;

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateTimerUI() {
  timerDisplay.textContent = formatTime(pomState.remaining);
  const fraction = pomState.remaining / pomState.totalSeconds;
  ringProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction);

  phaseEl.textContent = pomState.phase === 'work' ? 'Sesión de Trabajo' : 'Tiempo de Descanso';
  sessionInfoEl.textContent = `Sesión ${pomState.session} de ${pomSettings.sessionsPerCycle}`;

  if (pomState.phase === 'break') {
    ringProgress.classList.add('break');
  } else {
    ringProgress.classList.remove('break');
  }

  renderSessionDots();
}

function renderSessionDots() {
  const container = document.getElementById('sessions-dots');
  container.innerHTML = '';
  for (let i = 1; i <= pomSettings.sessionsPerCycle; i++) {
    const dot = document.createElement('div');
    dot.className = 'session-dot';
    if (i < pomState.session) dot.classList.add('completed');
    else if (i === pomState.session && pomState.phase === 'work') dot.classList.add('active');
    container.appendChild(dot);
  }
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode   = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);

    gainNode.gain.setValueAtTime(0.35, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.8);

    setTimeout(() => {
      try {
        const ctx2 = new AudioContext();
        const osc2 = ctx2.createOscillator();
        const g2   = ctx2.createGain();
        osc2.connect(g2); g2.connect(ctx2.destination);
        osc2.type = 'sine';
        osc2.frequency.value = 528;
        g2.gain.setValueAtTime(0.3, ctx2.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.6);
        osc2.start(); osc2.stop(ctx2.currentTime + 0.6);
      } catch(e) {}
    }, 500);
  } catch(e) { console.warn('Audio not available:', e); }
}

function switchPhase() {
  playBeep();

  if (pomState.phase === 'work') {
    pomState.completedSessions++;
    if (pomState.completedSessions >= pomSettings.sessionsPerCycle) {
      pomState.completedSessions = 0;
      pomState.session = 1;
    } else {
      pomState.session = pomState.completedSessions + 1;
    }
    pomState.phase = 'break';
    pomState.totalSeconds = pomSettings.breakMin * 60;
  } else {
    pomState.phase = 'work';
    pomState.totalSeconds = pomSettings.workMin * 60;
  }

  pomState.remaining = pomState.totalSeconds;
  pomState.running = false;
  clearInterval(pomState.interval);
  updateTimerUI();
}

function startTimer() {
  if (pomState.running) return;
  pomState.running = true;

  pomState.interval = setInterval(() => {
    pomState.remaining--;
    if (pomState.remaining <= 0) {
      pomState.remaining = 0;
      updateTimerUI();
      clearInterval(pomState.interval);
      pomState.running = false;
      switchPhase();
    } else {
      updateTimerUI();
    }
  }, 1000);
}

function pauseTimer() {
  pomState.running = false;
  clearInterval(pomState.interval);
}

function resetTimer() {
  pauseTimer();
  pomState.phase = 'work';
  pomState.totalSeconds = pomSettings.workMin * 60;
  pomState.remaining    = pomState.totalSeconds;
  pomState.session      = 1;
  pomState.completedSessions = 0;
  updateTimerUI();
}

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

document.getElementById('apply-settings-btn').addEventListener('click', () => {
  const workMin = parseInt(document.getElementById('work-duration').value, 10) || 25;
  const breakMin = parseInt(document.getElementById('break-duration').value, 10) || 5;
  const sessionsPerCycle = parseInt(document.getElementById('sessions-per-cycle').value, 10) || 4;

  pomSettings = { workMin, breakMin, sessionsPerCycle };
  save('hf_pomo_settings', pomSettings);

  resetTimer();

  const btn = document.getElementById('apply-settings-btn');
  const orig = btn.textContent;
  btn.textContent = '✓ Guardado';
  setTimeout(() => btn.textContent = orig, 2000);
});

updateTimerUI();

/* =============================================
   SECTION 4 — NOTES (Notion-style)
============================================= */
const notesListEl = document.getElementById('notes-list');
const noteTitleInput = document.getElementById('notes-title-input');
const noteBodyInput = document.getElementById('notes-textarea');
const notesEditorContainer = document.getElementById('notes-editor-container');
const notesEmptyState = document.getElementById('notes-editor-empty');
const autosaveIndicator = document.getElementById('autosave-indicator');
const newNoteBtn = document.getElementById('new-note-btn');
const deleteNoteBtn = document.getElementById('delete-note-btn');

let notesArray = load('hf_notes_list', []);

// Migration logic
let oldSingleNote = localStorage.getItem('hf_notes');
if (oldSingleNote && notesArray.length === 0) {
  try {
    const parsed = JSON.parse(oldSingleNote); 
    if (typeof parsed === 'string' && parsed.trim() !== '') {
      notesArray.push({ id: genId(), title: 'Nota migrada', body: parsed, updatedAt: Date.now() });
    }
  } catch(e) {
    if (oldSingleNote.trim() !== '') {
      notesArray.push({ id: genId(), title: 'Nota migrada', body: oldSingleNote, updatedAt: Date.now() });
    }
  }
  localStorage.removeItem('hf_notes');
  save('hf_notes_list', notesArray);
}

let activeNoteId = null;
let notesDirty = false;

function formatNoteDate(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function renderNotesList() {
  notesListEl.innerHTML = '';
  notesArray.sort((a,b) => b.updatedAt - a.updatedAt);

  if (notesArray.length === 0) {
    notesListEl.innerHTML = '<li class="empty-state" style="padding:20px 0;">No tenés notas</li>';
    return;
  }

  notesArray.forEach(note => {
    const li = document.createElement('li');
    li.className = `note-list-item ${note.id === activeNoteId ? 'active' : ''}`;
    
    const title = note.title.trim() || 'Nota sin título';
    const dateStr = formatNoteDate(note.updatedAt);
    
    li.innerHTML = `
      <div class="note-item-title">${escHtml(title)}</div>
      <div class="note-item-date">${dateStr}</div>
    `;
    
    li.addEventListener('click', () => {
      if (notesDirty) saveNotes();
      openNote(note.id);
    });

    notesListEl.appendChild(li);
  });
}

function openNote(id) {
  activeNoteId = id;
  const note = notesArray.find(n => n.id === id);
  if (!note) {
    closeNote();
    return;
  }
  
  noteTitleInput.value = note.title;
  noteBodyInput.value = note.body;
  
  notesEditorContainer.style.display = 'flex';
  notesEmptyState.style.display = 'none';
  
  renderNotesList();
}

function closeNote() {
  activeNoteId = null;
  notesEditorContainer.style.display = 'none';
  notesEmptyState.style.display = 'flex';
  renderNotesList();
}

newNoteBtn.addEventListener('click', () => {
  if (notesDirty) saveNotes();
  const id = genId();
  notesArray.unshift({ id, title: '', body: '', updatedAt: Date.now() });
  save('hf_notes_list', notesArray);
  openNote(id);
  noteTitleInput.focus();
});

deleteNoteBtn.addEventListener('click', () => {
  if (!activeNoteId) return;
  notesArray = notesArray.filter(n => n.id !== activeNoteId);
  save('hf_notes_list', notesArray);
  notesDirty = false;
  closeNote();
});

function markDirty() {
  notesDirty = true;
  autosaveIndicator.className = 'autosave-indicator saving';
  autosaveIndicator.textContent = 'Sin guardar…';
}

noteTitleInput.addEventListener('input', markDirty);
noteBodyInput.addEventListener('input', markDirty);

function saveNotes() {
  if (notesDirty && activeNoteId) {
    const note = notesArray.find(n => n.id === activeNoteId);
    if (note) {
      note.title = noteTitleInput.value;
      note.body = noteBodyInput.value;
      note.updatedAt = Date.now();
      save('hf_notes_list', notesArray);
      
      notesDirty = false;
      autosaveIndicator.className = 'autosave-indicator saved';
      autosaveIndicator.textContent = 'Guardado ✓';
      renderNotesList();
      
      setTimeout(() => {
        if (!notesDirty) {
          autosaveIndicator.className = 'autosave-indicator';
          autosaveIndicator.textContent = 'Se guarda cada 10s';
        }
      }, 2000);
    }
  }
}

setInterval(() => { if(notesDirty) saveNotes(); }, 5000); // 5 sec autosave check
window.addEventListener('beforeunload', saveNotes);

// Init
if (notesArray.length > 0) {
  openNote(notesArray[0].id);
} else {
  closeNote();
}

/* =============================================
   COMPOSE EMAIL MODAL — Outlook COM integration
============================================= */
const composeOverlay  = document.getElementById('compose-modal-overlay');
const composeToInput  = document.getElementById('compose-to');
const composeCcInput  = document.getElementById('compose-cc');
const composeSubjInput = document.getElementById('compose-subject');
const composeBodyInput = document.getElementById('compose-body');
const composeStatus   = document.getElementById('compose-status');
const composeSendBtn  = document.getElementById('compose-send-btn');

let composeActiveEmailId = null;

function openComposeModal(prefillSubject = '', prefillTo = '', emailId = null) {
  composeActiveEmailId = emailId;
  composeToInput.value   = prefillTo;
  composeCcInput.value   = '';
  composeSubjInput.value = prefillSubject;
  composeBodyInput.value = '';
  composeStatus.style.display = 'none';
  composeSendBtn.disabled = false;
  composeSendBtn.textContent = '📤 Enviar por Outlook';
  composeOverlay.classList.add('open');
  setTimeout(() => composeToInput.focus(), 50);
}

function closeComposeModal() {
  composeOverlay.classList.remove('open');
}

document.getElementById('compose-email-btn').addEventListener('click', () => openComposeModal());
document.getElementById('compose-close-btn').addEventListener('click', closeComposeModal);
document.getElementById('compose-close-btn2').addEventListener('click', closeComposeModal);
composeOverlay.addEventListener('click', e => { if (e.target === composeOverlay) closeComposeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && composeOverlay.classList.contains('open')) closeComposeModal();
});

composeSendBtn.addEventListener('click', async () => {
  const to      = composeToInput.value.trim();
  const cc      = composeCcInput.value.trim();
  const subject = composeSubjInput.value.trim();
  const body    = composeBodyInput.value.trim();

  if (!to) { composeToInput.focus(); return; }
  if (!subject) { composeSubjInput.focus(); return; }

  composeSendBtn.disabled = true;
  composeSendBtn.textContent = '⏳ Enviando…';
  composeStatus.style.display = 'none';

  try {
    const result = await ipcRenderer.invoke('send-outlook-email', { to, cc, subject, body });

    if (result.success) {
      if (composeActiveEmailId) {
        const mailIdx = emails.findIndex(e => e.id === composeActiveEmailId);
        if (mailIdx > -1) {
          const mail = emails[mailIdx];
          mail.sentAt = Date.now();
          sentEmails.unshift(mail);
          emails.splice(mailIdx, 1);
          saveEmails();
          saveSentEmails();
          renderEmails();
        }
      }

      composeStatus.className = 'compose-status success';
      composeStatus.textContent = '✓ Correo enviado correctamente por Outlook.';
      composeStatus.style.display = 'block';
      composeSendBtn.textContent = '✓ Enviado';
      setTimeout(closeComposeModal, 2500);
    } else {
      composeStatus.className = 'compose-status error';
      composeStatus.textContent = `✕ Error: ${result.error || 'No se pudo enviar el correo.'}`;
      composeStatus.style.display = 'block';
      composeSendBtn.disabled = false;
      composeSendBtn.textContent = '📤 Enviar por Outlook';
    }
  } catch (err) {
    composeStatus.className = 'compose-status error';
    composeStatus.textContent = `✕ Error inesperado: ${err.message}`;
    composeStatus.style.display = 'block';
    composeSendBtn.disabled = false;
    composeSendBtn.textContent = '📤 Enviar por Outlook';
  }
});
