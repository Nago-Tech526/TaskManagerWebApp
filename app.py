from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# メモリ上でタスク管理（永続化なし）
tasks = []

@app.route("/")
def index():
    # 未完了タスクを上、完了タスクを下に表示
    sorted_tasks = sorted(tasks, key=lambda t: t['completed'])
    return render_template("index.html", tasks=sorted_tasks)

@app.route("/add_task", methods=["POST"])
def add_task():
    data = request.get_json()
    task = {
        "id": len(tasks) + 1,
        "title": data.get("title", ""),
        "details": data.get("details", ""),
        "due_date": data.get("due_date", ""),
        "labels": data.get("labels", []),
        "completed": False
    }
    tasks.append(task)
    return jsonify(task)

@app.route("/toggle_task", methods=["POST"])
def toggle_task():
    data = request.get_json()
    task_id = data.get("id")
    for task in tasks:
        if task["id"] == task_id:
            task["completed"] = not task["completed"]
            return jsonify({"result": "success", "completed": task["completed"]})
    return jsonify({"result": "not found"}), 404

@app.route("/edit_task", methods=["POST"])
def edit_task():
    data = request.get_json()
    task_id = data.get("id")
    for task in tasks:
        if task["id"] == task_id:
            task["title"] = data.get("title", task["title"])
            task["details"] = data.get("details", task["details"])
            task["due_date"] = data.get("due_date", task["due_date"])
            task["labels"] = data.get("labels", task["labels"])
            return jsonify(task)
    return jsonify({"result": "not found"}), 404

@app.route("/reorder_tasks", methods=["POST"])
def reorder_tasks():
    data = request.get_json()
    new_order = data.get("order", [])
    global tasks
    task_dict = {task["id"]: task for task in tasks}
    tasks = [task_dict[task_id] for task_id in new_order if task_id in task_dict]
    return jsonify({"result": "success"})

if __name__ == "__main__":
    app.run(debug=True)