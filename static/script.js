// 新規タスクをリストへ追加（タスククリックで詳細トグル）
// ※新規タスクは、リスト内の最初の完了タスクの上に挿入します。
function addTaskToList(task) {
  const li = document.createElement('li');
  li.className = 'task';
  li.setAttribute('draggable', 'true');
  li.setAttribute('data-id', task.id);
  li.innerHTML = `
    <div class="task-summary">
      <input type="checkbox" class="task-checkbox" onclick="toggleComplete(event, ${task.id})">
      <span class="task-title">${task.title}</span>
      <span class="task-due">${task.due_date}</span>
      <span class="task-label">${task.labels.join(', ')}</span>
    </div>
    <div class="task-details" style="display: none;">
      詳細: ${task.details}
    </div>
  `;
  li.addEventListener('click', () => {
    const detailsDiv = li.querySelector('.task-details');
    detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
  });
  // 新規タスクは、リスト内の最初の完了タスクの上に挿入する
  const firstCompleted = taskList.querySelector('.task.completed');
  if (firstCompleted) {
    taskList.insertBefore(li, firstCompleted);
  } else {
    taskList.appendChild(li);
  }
  addDnDHandlers(li);
}