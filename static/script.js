// グローバル変数の定義
let form;
let titleInput;
let detailsInput;
let dueDateInput;
let labelsInput;
let taskList;

document.addEventListener("DOMContentLoaded", () => {
  // グローバル変数の初期化
  form = document.getElementById('task-form');
  titleInput = document.getElementById('title');
  detailsInput = document.getElementById('details');
  dueDateInput = document.getElementById('due_date');
  labelsInput = document.getElementById('labels');
  taskList = document.getElementById('task-list');

  // フォーム送信処理（追加モード or 編集モード）
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const title = titleInput.value;
    const details = detailsInput.value;
    const due_date = dueDateInput.value;
    const labels = labelsInput.value.split(',').map(s => s.trim()).filter(s => s);

    if (window.editingTaskId) {
      // 編集モードの処理
      console.log('Editing task:', window.editingTaskId); // デバッグ用のログ
      fetch('/edit_task', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id: window.editingTaskId, title, details, due_date, labels })
      })
      .then(response => response.json())
      .then(task => {
         console.log('Task updated:', task); // デバッグ用のログ
         // 該当タスク要素を更新
         let taskElem = document.querySelector(`.task[data-id="${task.id}"]`);
         if (taskElem) {
           taskElem.querySelector('.task-title').innerText = task.title;
           taskElem.querySelector('.task-due').innerText = task.due_date;
           const labelsHtml = task.labels.map(label => `<li><a href="#">${label}</a></li>`).join('');
           taskElem.querySelector('.task-labels ul').innerHTML = labelsHtml;
           // データ属性を更新
           taskElem.dataset.title = task.title;
           taskElem.dataset.details = task.details;
           taskElem.dataset.due_date = task.due_date;
           taskElem.dataset.labels = JSON.stringify(task.labels);
         }
         form.reset();
         form.querySelector('button[type="submit"]').innerText = "タスクを追加";
         window.editingTaskId = null;
      });
    } else {
      // 新規追加モードの処理
      fetch('/add_task', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title, details, due_date, labels })
      })
      .then(response => response.json())
      .then(task => {
         addTaskToList(task);
         form.reset();
      });
    }
  });

  // 新規タスクをリストへ追加（タスククリックで詳細トグル）
  // ※新規タスクは、最初の完了タスクの上に挿入
  function addTaskToList(task) {
    const li = document.createElement('li');
    li.className = 'task';
    li.setAttribute('draggable', 'true');
    li.setAttribute('data-id', task.id);
    li.dataset.title = task.title;
    li.dataset.details = task.details;
    li.dataset.due_date = task.due_date;
    li.dataset.labels = JSON.stringify(task.labels);

    const labelsHtml = task.labels.map(label => `<li><a href="#">${label}</a></li>`).join('');
    li.innerHTML = `
      <div class="task-summary">
        <input type="checkbox" class="task-checkbox" onclick="toggleComplete(event, ${task.id})">
        <span class="task-title">${task.title}</span>
        <span class="task-due">${task.due_date}</span>
        <div class="task-labels">
          <ul>${labelsHtml}</ul>
        </div>
        <button class="edit-button" onclick="startEditTask(event, ${task.id})">✏️</button>
      </div>
      <div class="task-details" style="display: none;">
        詳細: ${task.details}
      </div>
    `;
    li.addEventListener('click', () => {
      const detailsDiv = li.querySelector('.task-details');
      detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
    });
    const firstCompleted = taskList.querySelector('.task.completed');
    if (firstCompleted) {
      taskList.insertBefore(li, firstCompleted);
    } else {
      taskList.appendChild(li);
    }
    addDnDHandlers(li);
  }

  // ドラッグ＆ドロップの処理
  let dragSrcEl = null;
  function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
    this.classList.add('dragElem');
  }
  function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
  }
  function handleDragEnter(e) {
    this.classList.add('over');
  }
  function handleDragLeave(e) {
    this.classList.remove('over');
  }
  function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (dragSrcEl !== this) {
      dragSrcEl.parentNode.removeChild(dragSrcEl);
      const dropHTML = e.dataTransfer.getData('text/html');
      this.insertAdjacentHTML('beforebegin', dropHTML);
      const dropElem = this.previousSibling;
      addDnDHandlers(dropElem);
      updateOrder();
    }
    this.classList.remove('over');
    return false;
  }
  function handleDragEnd(e) {
    this.classList.remove('over');
  }
  function addDnDHandlers(elem) {
    elem.addEventListener('dragstart', handleDragStart, false);
    elem.addEventListener('dragenter', handleDragEnter, false);
    elem.addEventListener('dragover', handleDragOver, false);
    elem.addEventListener('dragleave', handleDragLeave, false);
    elem.addEventListener('drop', handleDrop, false);
    elem.addEventListener('dragend', handleDragEnd, false);
  }
  document.querySelectorAll('.task').forEach(task => {
    addDnDHandlers(task);
    task.addEventListener('click', () => {
      const detailsDiv = task.querySelector('.task-details');
      detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
    });
  });
  function updateOrder() {
    const tasks = document.querySelectorAll('.task');
    const order = Array.from(tasks).map(task => parseInt(task.getAttribute('data-id')));
    fetch('/reorder_tasks', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({order: order})
    });
  }
});

// チェックボックスで完了状態をトグル
function toggleComplete(e, id) {
  e.stopPropagation();
  fetch('/toggle_task', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({id: id})
  })
  .then(response => response.json())
  .then(result => {
    if (result.result === "success") {
      const taskElem = document.querySelector(`.task[data-id="${id}"]`);
      if(result.completed) {
        taskElem.classList.add('completed');
      } else {
        taskElem.classList.remove('completed');
      }
    }
  });
}

// 編集開始：左側フォームに該当タスクの情報を反映し、フォームのボタンを編集完了に変更
window.startEditTask = function(e, id) {
  e.stopPropagation();
  let taskElem = document.querySelector(`.task[data-id="${id}"]`);
  if (!taskElem) return;
  titleInput.value = taskElem.dataset.title;
  detailsInput.value = taskElem.dataset.details;
  dueDateInput.value = taskElem.dataset.due_date;
  let labels = [];
  try {
    console.log('Raw labels data:', taskElem.dataset.labels);
    labels = JSON.parse(taskElem.dataset.labels || "[]");
  } catch (e) {
    console.error('Failed to parse labels:', e);
  }
  labelsInput.value = labels.join(', ');
  form.querySelector('button[type="submit"]').innerText = "編集完了";
  window.editingTaskId = id;
  console.log(`Editing task ID: ${id}`);
};