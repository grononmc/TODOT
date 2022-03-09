const $ = require('jQuery');
const { TODOManager, CONFIG_PATH } = require("./src/todo");
const { exists_json, write_json } = require("./src/misc");

var todo;

function INIT() {
	todo = new TODOManager();

	// Start todo on home
	todo.home();

	// Buttons
	const button = {
		new: document.querySelector("#new-file"),
		open: document.querySelector("#open-file"),
		home: document.querySelector("#goto-home")
	}

	// Button new file
	$(button.new).on("click", () => {
		todo.new_todo();
	});

	// Button open file
	$(button.open).on("click", () => {
		todo.open_todo();
	});

	// Button home
	$(button.home).on("click", () => {
		todo.home();
	});
}

// Check if config.json exists
exists_json(CONFIG_PATH).then(result => {

	if(!result.exists) {
		// Create new file config.json
		let data = JSON.stringify({
			default_open: "",
			recents: [],
			theme: "dark"
		});

		write_json(CONFIG_PATH, data).catch(err => {
			console.error(err);
		});

	}

	INIT();

});