document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById('task-form');
    const titleInput = document.getElementById('title');
    const detailsInput = document.getElementById('details');
    const dueDateInput = document.getElementById('due_date');
    const labelsInput = document.getElementById('labels');
    const taskList = document.getElementById('task-list');
  
    // タスク追加フォームの送信処理
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const title = titleInput.value;
      const details = detailsInput.value;
      const due_date = dueDateInput.value;
      const labels = labelsInput.value.split(',').map(s => s.trim()).filter(s => s);
      
      if (title) {
        fetch('/add_task', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({title, details, due_date, labels})
        })
        .then(response => response.json())
        .then(task => {
          addTaskToList(task);
          form.reset();
        });
      }
    });
  
    // 新規タスクをリストへ追加（詳細は非表示、クリックでトグル表示）
    function addTaskToList(task) {
      const li = document.createElement('li');
      li.className = 'task';
      li.setAttribute('draggable', 'true');
      li.setAttribute('data-id', task.id);
      li.innerHTML = `
        <div class="task-summary">
          <span class="task-title">${task.title}</span>
          <span class="task-due">${task.due_date}</span>
          <span class="task-label">${task.labels.join(', ')}</span>
          <button onclick="completeTask(${task.id}); event.stopPropagation();">完了</button>
        </div>
        <div class="task-details" style="display: none;">
          詳細: ${task.details}
        </div>
      `;
      // タスククリックで詳細表示のトグル
      li.addEventListener('click', () => {
        const detailsDiv = li.querySelector('.task-details');
        detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
      });
      taskList.appendChild(li);
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
  
    // 既存タスクにドラッグ＆ドロップおよびクリック（詳細トグル）のイベントを付与
    document.querySelectorAll('.task').forEach(task => {
      addDnDHandlers(task);
      task.addEventListener('click', () => {
        const detailsDiv = task.querySelector('.task-details');
        detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
      });
    });
  
    // タスクの新しい順序をサーバーに送信
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
  
  // グローバル関数：タスク完了処理
  function completeTask(id) {
    fetch('/complete_task', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({id: id})
    })
    .then(response => response.json())
    .then(result => {
      if (result.result === "success") {
        const taskElem = document.querySelector(`.task[data-id="${id}"]`);
        taskElem.classList.add('completed');
        const btn = taskElem.querySelector('button');
        btn.disabled = true;
      }
    });
  }  