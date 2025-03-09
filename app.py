from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# メモリ上でタスクを管理（永続化はしていません）
tasks = []

@app.route("/")
def index():
    return render_template("index.html", tasks=tasks)

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

@app.route("/complete_task", methods=["POST"])
def complete_task():
    data = request.get_json()
    task_id = data.get("id")
    for task in tasks:
        if task["id"] == task_id:
            task["completed"] = True
            return jsonify({"result": "success"})
    return jsonify({"result": "not found"}), 404

@app.route("/reorder_tasks", methods=["POST"])
def reorder_tasks():
    data = request.get_json()
    # data["order"] はタスクIDの新しい順序を示すリスト
    new_order = data.get("order", [])
    global tasks
    task_dict = {task["id"]: task for task in tasks}
    tasks = [task_dict[task_id] for task_id in new_order if task_id in task_dict]
    return jsonify({"result": "success"})

if __name__ == "__main__":
    app.run(debug=True)