const { tmpdir, homedir } = require("os");
const crel = require("crel");
const fs = require('fs');
const { dialog, getCurrentWindow } = require("@electron/remote");
const { write_json, read_json, exists_json } = require("./misc");

// Path config file app
const CONFIG_PATH = `${tmpdir}\\todot_config.json`;

class TODOManager {
	constructor() {
		// Todo object json temp
		this.temp_todo = null;

		// Path of current file
		this.file_path = null;
	}

	/**
	 * Start page home
	 * & Load recents files
	 */
	home() {

		htmlContent.clear();
		htmlContent.page_start();

		const _config_file_read = async (path) => {
			// config.json
			let data = await fs.readFileSync(path, "utf-8");
			data = JSON.parse(data);

			// if has recents paths
			data.recents.forEach((d, i) => {
				let li = crel("li", { class: "button-recent-file" },
					crel("h4", d.name),
					crel("span", d.path)
				);

				// when click on recent file, load the content tasks
				$(li).on("click", event => {

					// Load tasks from file todo
					this.load_tasks(d.path);

				});

				$("#recents-list").append(li);
			});
		}

		// Load config file
		exists_json(CONFIG_PATH).then(result => {
			if(result.exists) {
				_config_file_read(CONFIG_PATH);
			}
		});
	}

	/**
	 * Create new file todo
	 */
	new_todo() {

		let options = {
			title: "New TODO - file",
			defaultPath: `${homedir}\\documents`,
			buttonLabel: "Create Todo File",
			filters: [{ name: "json", extensions: ["json"] }]
		}

		dialog.showSaveDialog(getCurrentWindow(), options).then(result => {
			if (result.canceled) return;

			let name = result.filePath.split("\\").pop().replace(".json", "");
			let data = { version: "1.0.0", name: name, tasks: [] };

			// Write the new file todo
			write_json(result.filePath, JSON.stringify(data)).then(path => {

				// Add this new file on recent files
				this.add_recent_path(name, path);

				// Working on file todo
				this.file_path = path;
				this.temp_todo = data;

				// Clear content, and generate pattern tasklist
				htmlContent.clear();
				htmlContent.page_tasklist();
				$("#todo-title").text(data.name);

			}).catch(err => {
				console.error(err);
			});
		});

	}

	/**
	 * Open file todo
	 */
	open_todo() {

		let options = { properties: ["openFile"], filters: [{ name: "Json", extensions: ["json"] }] };

		dialog.showOpenDialog(options).then(result => {
			if (result.canceled) return;

			let path = result.filePaths[0];

			// Load tasks from file todo
			this.load_tasks(path);

		}).catch(err => {
			console.error(err);
		});
	}

	/**
	 * Create New Task
	 * @param {string} description 
	 * @param {boolean} done
	 */
	create_task(description, done = false) {

		if (description == "") return;

		this.temp_todo.tasks.push({ desc: description, done: false });
		this.htmlCreateTask(description, done);

		this.update_file();

	}

	/**
	 * Delete Task from file
	 * @param {*} index 
	 */
	delete_task(index) {

		this.temp_todo.tasks.splice(index, 1);

		this.update_file();

	}

	/**
	 * Update Todo File
	 */
	update_file() {

		// Update current todo file open
		let json = JSON.stringify(this.temp_todo);

		write_json(this.file_path, json).catch(err => {
			console.error(err);
		});

	}

	/**
	 * add_recent_path
	 * @param {string} name 
	 * @param {string} path 
	 */
	add_recent_path(name, path) {

		read_json(CONFIG_PATH).then(data => {

			data = JSON.parse(data);

			let has = false;
			data.recents.forEach((e, i) => {
				if (e.path == path)
					has = true;
			});

			// not add in recents list if its already
			if (has) return;

			data.recents.push({ name: name, path: path });

			write_json(CONFIG_PATH, JSON.stringify(data)).catch(err => {
				console.error(err);
			});

		}).catch(err => {
			console.error(err);
		});

	}

	/**
	 * htmlCreateTask create task on html
	 * @param {string} description 
	 * @param {boolean} done 
	 */
	htmlCreateTask(description, done = false) {

		// Save temp elements created
		let task = { li: -1, input: -1, button_del: -1, span: -1, drag: -1 };

		// Task format on html
		task.li = crel("li",
			task.drag = crel("button", { class: "button-drag" },
				crel("img", { draggable: false, src: "./svg/icon-dots-vertical.svg" })
			),
			crel("label", { class: "checkbox-container" },
				task.input = crel("input", { type: "checkbox", class: "todo-task-checkbox" }),
				crel("span", { class: "checkmark" })
			),
			task.span = crel("span", { class: "description" }, description),
			crel("div", { class: "todo-delete-task" },
				task.button_del = crel("button", { class: "todo-button-delete" },
					crel("img", { src: "./svg/icon-trash.svg" })
				)
			)
		);

		task.input.checked = done;
		// Refresh effect done css text
		$(task.span).css("text-decoration", done ? "line-through" : "none");

		// Insert before last child on <ul>
		$("#todo-list").find("li:last-child").before(task.li);

		// Button delete
		$(task.button_del).click(e => {
			let li = $(task.li); // "this <li>"
			this.delete_task(li.index());
			li.remove();
			e.stopPropagation();
		});

		// Input checkbox
		$(task.input).click(e => {
			let index = $(task.li).index();
			let checked = $(task.input).attr("checked") != null;

			this.temp_todo.tasks[index].done = checked;

			if (!checked) {
				$(task.span).css("text-decoration", "none");
			} else {
				$(task.span).css("text-decoration", "line-through");
			}

			this.update_file();
			e.stopPropagation();
		});

		/*********************
		===== BUTTON Drag =====
		*********************/
		// Check if node is above other
		const _is_above = (nodeA, nodeB) => {
			const rectA = nodeA.getBoundingClientRect();
			const rectB = nodeB.getBoundingClientRect();
			return rectA.top + rectA.height / 2 < rectB.top + rectB.height / 2;
		};

		// Do swap in temp_todo and update it
		const _swap_task_on_array = (a, b) => {
			let v = this.temp_todo.tasks.splice(a, 1);
			this.temp_todo.tasks.splice(b, 0, v[0]);
			this.update_file();
		}

		// Drag li
		let drag = {
			element: null,
			placeholder: null,
			x: null, y: null,
			dragging: false,
			drag_id: -1,
			swap_id: -1
		}

		$(task.drag).mousedown((event) => {
			drag.element = $(task.drag).get(0);
			drag.drag_id = $(task.drag).parent().index();
			const rect = drag.element.getBoundingClientRect();
			drag.x = event.pageX - rect.left;
			drag.y = (event.pageY - rect.top) - $(window).scrollTop();

			$(document).mousemove(_handler_move);

			$(document).mouseup(_handler_up);
		});

		const _handler_move = (event) => {

			if (!drag.dragging) {
				drag.dragging = true;

				drag.placeholder = $(drag.element).parent().clone()[0]

				$(drag.placeholder).css({ "opacity": "50%", "border": "2px dotted #eee" });

				$(drag.element).parent().before(drag.placeholder);
			}

			// Follow mouse
			$(drag.element).parent().css({
				"position": "absolute",
				"top": `${event.pageY - drag.y}px`,
				"left": `${event.pageX - drag.x}px`,
				"z-index": "1000",
				"width": "75%"
			});

			const prevEle = $(drag.element).parent().prev().prev()[0];
			const nextEle = $(drag.placeholder).next().next()[0];

			// User moves item to the top
			if (prevEle && _is_above(drag.element, prevEle)) {
				drag.swap_id = $(prevEle).index();
				$(prevEle).insertAfter($(drag.placeholder).next());
			}

			// User moves the dragging element to the bottom
			if (nextEle && _is_above(nextEle, drag.element)) {
				if ($(nextEle).attr("id") != "li-new-task") {
					drag.swap_id = $(nextEle).prev().index();
					let len = $(drag.placeholder).prev().length;
					if (len == 0) {
						$(nextEle).insertBefore($(drag.placeholder));
					} else {
						$(nextEle).insertAfter($(drag.placeholder).prev());
					}
				}
			}
		}

		const _handler_up = (event) => {
			// Remove css from element dragging
			$(drag.element).parent().css({
				"position": "relative",
				"top": "0px",
				"left": "0px",
				"z-index": "0",
				"width": "100%"
			});
			drag.element = null;
			$(document).off("mousemove");
			$(document).off("mouseup");

			// Remove placeholder
			if (drag.placeholder != null) {
				$(drag.placeholder).remove();
				drag.placeholder = null;
			}

			drag.dragging = false;

			if (drag.drag_id != -1 && drag.swap_id != -1) {
				_swap_task_on_array(drag.drag_id, drag.swap_id);
				drag.drag_id = -1;
				drag.swap_id = -1;
			}
		}

	}

	/**
	 * Load tasks from file json, and create elements tasks
	 * @param {string} path 
	 */
	load_tasks(path) {

		read_json(path).then(data => {

			data = JSON.parse(data);
			this.temp_todo = data;
			this.file_path = path;

			this.add_recent_path(data.name, path);

			htmlContent.clear();
			htmlContent.page_tasklist();
			$("#todo-title").text(data.name);

			data.tasks.forEach((e, i) => {
				this.htmlCreateTask(e.desc, e.done);
			});

		}).catch(err => {
			console.error(err);
		});
		
	}
}

// html content
const htmlContent = {
	clear: () => {
		$("#content").empty();
	},

	page_start: () => {
		let button_clear_recents;
		let start = crel("div", { id: "content-recents" },
			crel("div", { style: "position:relative;" },
				crel("h2", "Recent"),
				button_clear_recents = crel("button", { id: "button-clear-recents", class: "todo-button-delete" },
					crel("img", { src: "./svg/icon-trash.svg" })
				)
			),
			crel("ul", { id: "recents-list" })
		);

		// Button to clear recents file path
		$(button_clear_recents).on("click", (event) => {
			read_json(CONFIG_PATH).then(data => {
				data = JSON.parse(data);
				data.recents = [];

				write_json(CONFIG_PATH, JSON.stringify(data)).then(path => {
					htmlContent.clear();
					htmlContent.page_start();
				});
			});
		});

		$("#content").append(start);
	},

	page_tasklist: () => {
		let input_new_task;
		let todo_list = crel("div",
			crel("h2", { id: "todo-title" }, ""),
			crel("ul", { id: "todo-list" },
				crel("li", { id: "li-new-task" },
					input_new_task = crel("input", { type: "text", placeholder: "New Task", id: "input-add-new-task" })
				)
			)
		);

		// When enter input new task
		$(input_new_task).on("keypress", event => {
			if (event.originalEvent.code == "Enter") {
				$(input_new_task).attr("disabled", "disabled");

				let val = $(input_new_task).val();

				todo.create_task(val);

				$(input_new_task).val("");
				$(input_new_task).removeAttr("disabled");
			}
		});

		$("#content").append(todo_list);
	},

	task_clear: () => {
		$("#todo-list li:not(:last-child)").remove();
	}
}

module.exports = { TODOManager, CONFIG_PATH };