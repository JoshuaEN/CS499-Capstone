importScripts(
	"/assets/vars.js",
	"/assets/game.js",
	"/assets/controllers/ai_minimax.js",
	"/assets/minimax.js"
);

onmessage = function(event) {
	var data = event.data;
	var game = new Game(data.game.board_size);
	game.fire_events = true;
	
	data.p0.pause = false;
	data.p1.pause = false;
	data.p0.thread_minimax = false;
	data.p1.thread_minimax = false;
	data.p0.preload_n_workers = 0;
	data.p1.preload_n_workers = 0;

	game.player_controllers = [
		new AIMinimaxController(game, 0, data.p0),
		new AIMinimaxController(game, 1, data.p1)
	];

	var p0_controller = game.player_controllers[0].toString();
	var p1_controller = game.player_controllers[1].toString();

	var count_down = data.times;

	game.on_event = function(eventName, data) {
		if(eventName === 'game.statechange' && data.after === "deadlock") {
			var counts = game.get_counts();
			var p0_disks = counts[0];
			var p1_disks = counts[1];
			var winner = game.winner;
			var final_board_state = game.board.toString();
			console.log(winner);
			var fd = new FormData();
			fd.append('p0_controller', p0_controller);
			fd.append('p0_disks', p0_disks);
			fd.append('p1_controller', p1_controller);
			fd.append('p1_disks', p1_disks);
			fd.append('winner', winner + "");
			fd.append('final_board_state', final_board_state);
			fd.append('board_size', game.board_size);

			var xhr = new XMLHttpRequest();
			xhr.open("POST", "/record_result", true);
			//xhr.setRequestHeader("Content-Type", "multipart/form-data; charset=UTF-8");
			xhr.send(fd);

			count_down -= 1;

			if(count_down >= 0) {
				setTimeout(function() {
					game.restart();
				}, 1);

			} else {
				console.log("Finished " + data.times + " games between " + p0_controller + " & " + p1_controller);
				self.close();
			}
		}

		
	};

	game.set_game_state("start");
};