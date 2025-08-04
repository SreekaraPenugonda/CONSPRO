/ script.js - ES Module

// DOM Elements
const sidebarLinks = document.querySelectorAll('.sidebar__link');
const sections = document.querySelectorAll('.section');
const main = document.getElementById('main');

const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskDate = document.getElementById('task-date');
const taskTime = document.getElementById('task-time');
const taskPriority = document.getElementById('task-priority');
const tasksList = document.getElementById('tasks-list');
const taskSearch = document.getElementById('task-search');
const taskFilter = document.getElementById('task-filter');
const taskSort = document.getElementById('task-sort');
const deleteSelectedBtn = document.getElementById('delete-selected');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');

const themeToggleBtn = document.getElementById('theme-toggle');
const languageSelect = document.getElementById('language-select');

const toast = document.getElementById('toast');

const contactForm = document.getElementById('contact-form');
const contactEmail = document.getElementById('contact-email');
const contactMessage = document.getElementById('contact-message');
const emailError = document.getElementById('email-error');
const messageError = document.getElementById('message-error');
const contactSubmitBtn = contactForm.querySelector('button[type="submit"]');

// State
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let selectedTaskIds = new Set();
let undoStack = [];
let redoStack = [];

// Utils
const saveTasks = () => {
  localStorage.setItem('tasks', JSON.stringify(tasks));
};

const showToast = (msg, duration = 3000) => {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
};

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const compareTasks = (a, b, sortBy) => {
  switch (sortBy) {
    case 'date-asc':
      return (a.date || '') > (b.date || '') ? 1 : -1;
    case 'date-desc':
      return (a.date || '') < (b.date || '') ? 1 : -1;
    case 'priority-asc':
      return priorityValue(a.priority) - priorityValue(b.priority);
    case 'priority-desc':
      return priorityValue(b.priority) - priorityValue(a.priority);
    case 'name-asc':
      return a.text.localeCompare(b.text);
    case 'name-desc':
      return b.text.localeCompare(a.text);
    default:
      return 0;
  }
};

const priorityValue = (p) => {
  switch (p) {
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
};

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const highlightMatch = (text, query) => {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

// Undo/Redo
const pushUndo = () => {
  undoStack.push(JSON.stringify(tasks));
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
  updateUndoRedoButtons();
};

const undo = () => {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.stringify(tasks));
  const prev = undoStack.pop();
  tasks = JSON.parse(prev);
  saveTasks();
  renderTasks();
  updateUndoRedoButtons();
  showToast('Undo performed');
};

const redo = () => {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.stringify(tasks));
  const next = redoStack.pop();
  tasks = JSON.parse(next);
  saveTasks();
  renderTasks();
  updateUndoRedoButtons();
  showToast('Redo performed');
};

const updateUndoRedoButtons = () => {
  undoBtn.disabled = undoStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
};

// Render tasks
const renderTasks = () => {
  const search = taskSearch.value.trim().toLowerCase();
  const filter = taskFilter.value;
  const sortBy = taskSort.value;

  let filtered = tasks.filter(t => {
    const matchesSearch = t.text.toLowerCase().includes(search);
    const matchesFilter = filter === 'all' ||
      (filter === 'done' && t.done) ||
      (filter === 'pending' && !t.done);
    return matchesSearch && matchesFilter;
  });

  filtered.sort((a, b) => compareTasks(a, b, sortBy));

  tasksList.innerHTML = '';

  if (filtered.length === 0) {
    tasksList.innerHTML = '<li class="task-item empty">No tasks found.</li>';
    deleteSelectedBtn.disabled = true;
    return;
  }

  filtered.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.setAttribute('draggable', 'true');
    li.dataset.id = task.id;

    const checked = selectedTaskIds.has(task.id) ? 'checked' : '';
    const doneClass = task.done ? 'done' : '';
    const priorityClass = `priority-${task.priority}`;

    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" aria-label="Select task" ${checked} />
      <span class="task-text ${doneClass}" tabindex="0" contenteditable="true" role="textbox" aria-multiline="false">${highlightMatch(escapeHtml(task.text), search)}</span>
      <span class="task-priority ${priorityClass}" title="Priority: ${task.priority}"></span>
      <time class="task-date" datetime="${task.date || ''}">${task.date ? formatDate(task.date) : ''}</time>
      <button class="btn-icon task-done-btn" aria-label="${task.done ? 'Mark as pending' : 'Mark as done'}">${task.done ? '✔️' : '⭕'}</button>
      <button class="btn-icon task-delete-btn" aria-label="Delete task">🗑️</button>
    `;

    tasksList.appendChild(li);
  });

  updateDeleteSelectedBtn();
  addTaskEventListeners();
  addDragAndDrop();
};

// Add event listeners to tasks
const addTaskEventListeners = () => {
  const items = tasksList.querySelectorAll('.task-item');

  items.forEach(item => {
    const id = item.dataset.id;
    const checkbox = item.querySelector('.task-checkbox');
    const textSpan = item.querySelector('.task-text');
    const doneBtn = item.querySelector('.task-done-btn');
    const deleteBtn = item.querySelector('.task-delete-btn');

    // Select task checkbox
    checkbox.onchange = () => {
      if (checkbox.checked) selectedTaskIds.add(id);
      else selectedTaskIds.delete(id);
      updateDeleteSelectedBtn();
    };

    // Inline edit task text
    textSpan.oninput = () => {
      const task = tasks.find(t => t.id === id);
      if (task) {
        task.text = textSpan.textContent.trim();
        saveTasks();
      }
    };

    textSpan.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        textSpan.blur();
      }
    };

    // Toggle done
    doneBtn.onclick = () => {
      pushUndo();
      const task = tasks.find(t => t.id === id);
      if (task) {
        task.done = !task.done;
        saveTasks();
        renderTasks();
        showToast(task.done ? 'Task completed' : 'Task marked pending');
      }
    };

    // Delete task
    deleteBtn.onclick = () => {
      if (confirm('Delete this task?')) {
        pushUndo();
        tasks = tasks.filter(t => t.id !== id);
        selectedTaskIds.delete(id);
        saveTasks();
        renderTasks();
        showToast('Task deleted');
      }
    };
  });
};

// Update delete selected button state
const updateDeleteSelectedBtn = () => {
  deleteSelectedBtn.disabled = selectedTaskIds.size === 0;
};

// Delete selected tasks
deleteSelectedBtn.onclick = () => {
  if (confirm(`Delete ${selectedTaskIds.size} selected task(s)?`)) {
    pushUndo();
    tasks = tasks.filter(t => !selectedTaskIds.has(t.id));
    selectedTaskIds.clear();
    saveTasks();
    renderTasks();
    showToast('Selected tasks deleted');
  }
};

// Add new task
taskForm.onsubmit = (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) {
    alert('Task description cannot be empty.');
    return;
  }
  pushUndo();
  tasks.push({
    id: generateId(),
    text,
    date: taskDate.value || null,
    time: taskTime.value || null,
    priority: taskPriority.value,
    done: false,
  });
  saveTasks();
  renderTasks();
  taskForm.reset();
  taskInput.focus();
  showToast('Task added');
};

// Search, filter, sort handlers
taskSearch.oninput = renderTasks;
taskFilter.onchange = renderTasks;
taskSort.onchange = renderTasks;

// Undo/Redo buttons
undoBtn.onclick = undo;
redoBtn.onclick = redo;

// Theme toggle
themeToggleBtn.onclick = () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
};

const loadTheme = () => {
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
  }
};
loadTheme();

// Language select (stub for future i18n)
languageSelect.onchange = () => {
  showToast(`Language switched to ${languageSelect.selectedOptions[0].text}`);
  // Implement i18n logic here
};

// Drag & Drop
let dragSrcEl = null;

function handleDragStart(e) {
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.id);
  this.classList.add('dragging');
}

function handleDragOver(e) {
  if (e.preventDefault) e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter() {
  this.classList.add('over');
}

function handleDragLeave() {
  this.classList.remove('over');
}

function handleDrop(e) {
  if (e.stopPropagation) e.stopPropagation();
  const srcId = e.dataTransfer.getData('text/plain');
  const targetId = this.dataset.id;
  if (srcId !== targetId) {
    const srcIndex = tasks.findIndex(t => t.id === srcId);
    const targetIndex = tasks.findIndex(t => t.id === targetId);
    if (srcIndex > -1 && targetIndex > -1) {
      pushUndo();
      const [movedTask] = tasks.splice(srcIndex, 1);
      tasks.splice(targetIndex, 0, movedTask);
      saveTasks();
      renderTasks();
      showToast('Task reordered');
    }
  }
  return false;
}

function handleDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.task-item.over').forEach(el => el.classList.remove('over'));
}

function addDragAndDrop() {
  const items = document.querySelectorAll('.task-item');
  items.forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragenter', handleDragEnter);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('dragleave', handleDragLeave);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
  });
}

// Navigation between sections
sidebarLinks.forEach(link => {
  link.addEventListener('click', () => {
    sidebarLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    const sectionId = link.dataset.section;
    sections.forEach(sec => {
      if (sec.id === sectionId) {
        sec.hidden = false;
        sec.classList.add('active');
        sec.focus();
      } else {
        sec.hidden = true;
        sec.classList.remove('active');
      }
    });
  });
});

// Contact form validation
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.toLowerCase());
};

const validateContactForm = () => {
  let valid = true;
  if (!validateEmail(contactEmail.value.trim())) {
    emailError.textContent = 'Please enter a valid email.';
    valid = false;
  } else {
    emailError.textContent = '';
  }
  if (contactMessage.value.trim().length < 5) {
    messageError.textContent = 'Message must be at least 5 characters.';
    valid = false;
  } else {
    messageError.textContent = '';
  }
  contactSubmitBtn.disabled = !valid;
  return valid;
};

contactEmail.addEventListener('input', validateContactForm);
contactMessage.addEventListener('input', validateContactForm);

contactForm.addEventListener('submit', e => {
  e.preventDefault();
  if (validateContactForm()) {
    alert('Message sent! (Demo)');
    contactForm.reset();
    contactSubmitBtn.disabled = true;
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

  switch (e.key.toLowerCase()) {
    case 'n': // New task focus
      e.preventDefault();
      taskInput.focus();
      break;
    case 'd': // Delete selected
      if (!deleteSelectedBtn.disabled) {
        e.preventDefault();
        deleteSelectedBtn.click();
      }
      break;
    case 'z': // Undo (Ctrl+Z)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        undo();
      }
      break;
    case 'y': // Redo (Ctrl+Y)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        redo();
      }
      break;
  }
});

// Initial render
renderTasks();
updateUndoRedoButtons();