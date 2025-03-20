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
      console.log('Editing task:', window.editingTaskId); // デバッグ用ログ
      fetch('/edit_task', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id: window.editingTaskId, title, details, due_date, labels })
      })
      .then(response => response.json())
      .then(task => {
         console.log('Task updated:', task); // デバッグ用ログ
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
    e.dataTransfer.setData('text/plain', this.outerHTML);    
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

  // --- Plan機能 ---
  const planButton = document.getElementById('plan-button');
  const planArea = document.getElementById('plan-area');
  const planDropzone = document.getElementById('plan-dropzone');
  const finishPlanButton = document.getElementById('finish-plan-button');

  planButton.addEventListener('click', () => {
      // Planモード開始：Planエリアを表示
      planArea.style.display = 'block';
      window.planMode = true;
  });

  // ドラッグ＆ドロップ：Planエリア用
  planDropzone.addEventListener('dragover', function(e) {
      e.preventDefault();
      planDropzone.classList.add('over');
  });
  planDropzone.addEventListener('dragleave', function(e) {
      planDropzone.classList.remove('over');
  });
  planDropzone.addEventListener('drop', function(e) {
    try {
      e.preventDefault();
      planDropzone.classList.remove('over');
  
      // "text/html" と "text/plain" の両方を試す
      const droppedHTML = e.dataTransfer.getData('text/html') || e.dataTransfer.getData('text/plain');
      if (!droppedHTML) {
        console.error("Dropped data is empty.");
        return;
      }
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = droppedHTML.trim();
      
      // すべての子要素から .task クラスを持つ要素を探す
      let droppedElem = Array.from(tempDiv.children).find(child => child.classList && child.classList.contains('task'));
      
      if (!droppedElem) {
        console.error("No valid task element found in dropped data. Full data:", tempDiv.innerHTML);
        return;
      }
      
      if (droppedElem && droppedElem.classList.contains('task')) {
        // すでにバックログに存在する場合は削除
        const originalElem = document.querySelector(`.task[data-id="${droppedElem.getAttribute('data-id')}"]`);
        if (originalElem) {
          originalElem.parentNode.removeChild(originalElem);
        }
        // Planエリアに追加
        planDropzone.appendChild(droppedElem);
        addDnDHandlers(droppedElem);
      } else {
        console.error("Dropped element is not a valid task element. Dropped element:", droppedElem);
      }
    } catch (err) {
      console.error("Error during drop event handling:", err);
    }
  });  

  // 修正例：Plan完了時のタスクデータ収集部分
  finishPlanButton.addEventListener('click', () => {
    // Plan完了：Planエリアを非表示にしてモード終了
    planArea.style.display = 'none';
    window.planMode = false;
    const plannedTasks = planDropzone.querySelectorAll('.task');
    plannedTasks.forEach(task => {
        task.classList.add('planned');
    });

    // APIへ送信するタスクデータを構築
    const tasksToSend = [];
    plannedTasks.forEach(task => {
        const name = task.dataset.title;
        const details = task.dataset.details;
        const deadline = task.dataset.due_date;
        let labels = [];
        const labelsStr = task.dataset.labels;
        if (labelsStr && labelsStr.trim() !== "") {
          const trimmed = labelsStr.trim();
          if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
              labels = JSON.parse(trimmed);
            } catch (err) {
              console.error('Error parsing labels for task id:', task.dataset.id, err);
              labels = [];
            }
          } else {
            console.warn('Labels data for task id:', task.dataset.id, 'is not valid JSON:', labelsStr);
            labels = [];
          }
        }
        tasksToSend.push({
            name: name,
            details: details,
            deadline: deadline,
            labels: labels,
            listType: "todo"
        });
    });
    const payload = { tasks: tasksToSend };

    // APIリクエスト（CORS対策：APIサーバー側に適切なヘッダーが必要）
    fetch('http://localhost:3000/addTasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Successfully transferred planned tasks:', data);
    })
    .catch(error => {
        console.error('Error transferring planned tasks:', error);
    });
  });
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