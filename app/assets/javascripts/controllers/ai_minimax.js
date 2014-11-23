//= require controllers/ai_base

var AIMinimaxController = function(game, player, depth, original_game, options) {
	BaseController.call(this, game, player);

	options = options || {};

	this.allow_for_render = options.allow_for_render;

	if(this.allow_for_render === undefined)
		this.allow_for_render = true;

	this.original_game = original_game || game;

	this.default_depth = 2;
	this.depth = depth || this.default_depth;

	var rel_diff_helper = (function(game) {
		var them = game.other_player(self.player);
		var us = self.player;

		var counts_now = self.original_game.get_counts();
		var counts_potental = game.get_counts();

		var diff_us = counts_potental[us] - counts_now[us];
		var diff_them = counts_potental[them] - counts_now[them];

		return {us: diff_us, them: diff_them};
	});

	var self = this;
	this.weighting_functions = {

		// Performs a simple comparison between the count for our player and the enemy player at the current state of the board.
		basic: {
			name: "Total Disk Difference",
			func: (function(game) {
				var them = game.other_player(self.player);
				var us = self.player;
	
				var counts = game.get_counts();
	
				return counts[us] - counts[them];
			})
		},

		// Calculates the realative difference between the original (current) counts on the board,
		// and the counts as the result of this chain of actions.
		rel_diff_us: {
			name: "Relative Disk Difference (player)",
			func: (function(game) {
				return rel_diff_helper(game).us;
			})
		},
		rel_diff_them: {
			name: "Relative Disk Difference (opponent)",
			func: (function(game) {
				return rel_diff_helper(game).them * -1;
			})
		}
	}


	

	this.get_weight = this.weighting_functions.basic.func;

	/*
	this.max = game.board_size*game.board_size+99;
	this.min = (game.board_size*game.board_size+99)*-1;
	*/
	this.max = Infinity;// ((game.board_size*game.board_size)/2)+1;
	this.min = Number.NEGATIVE_INFINITY;// this.max * -1;

	this.tiebreak_functions = {
		first: {
			name: "First Index",
			func: (function(arr) {
				return arr[0];
			})
		},
		mid: {
			name: "Middle Index",
			func: (function(arr) {
				var mid = Math.floor(arr.length/2);
				return arr[mid];
			})
		},
		last: {
			name: "Last Index",
			func: (function(arr) {
				return arr[arr.length-1];
			})
		},
		rand: {
			name: "Random Index",
			func: (function(arr) {
				return arr[Math.floor(Math.random() * arr.length)];
			})
		},

	}

	this.tiebreak_method = this.tiebreak_functions.first.func;

	this.pause = true;
	this.pause_until_key = true;

	this.take_best_move = (function() {
		if(!self.game.running())
			return;

		if(!self.game.move(self.best_move))
			console.error("AI Attempted invalid move!");	
	});
};

AIMinimaxController.prototype = Object.create(AIBaseController.prototype);
AIMinimaxController.prototype.constructor = AIMinimaxController;


AIMinimaxController.prototype.your_move = function() {
	this.game.fire('player.calculating', {player: this.player});

	this.play_foward();

	if(this.best_move_index === null || this.best_move_index === undefined)
		this.best_move = this.game.valid_moves[0];
	else
		this.best_move = this.game.valid_moves[this.best_move_index];


	this.game.fire('player.calculated', {player: this.player});
	if(this.pause && this.pause_until_key) {
		this.game.fire('player.waitforkey', {player: this.player});
	} else {
		var self = this;
		if(this.allow_for_render)
			setTimeout(function() {self.take_best_move()}, 1);
		else
			this.take_best_move();
	}
};

AIMinimaxController.prototype.play_foward = function() {
	var depth = (this.depth === undefined || this.depth === null ? this.default_depth : this.depth);
	this.best_move_index = null;
	this.minimax(this.game, depth, true);
};

AIMinimaxController.prototype.minimax = function(game, depth, maximizing) {
	if(depth === 0 || game.finished()) {
		return this.get_weight_def(game);
	} 

	var weights = [];

	for(var i = 0; i < game.valid_moves.length; i++) {
		var new_game = new AIGame(game.board_size);
		new_game.copy_state(game);
		new_game.player_controllers = [
			new AIMinimaxController(new_game, 0, depth-1, this.original_game, {allow_for_render: false}),
			new AIMinimaxController(new_game, 1, depth-1, this.original_game, {allow_for_render: false})
		];
		for(var j = 0; j < new_game.player_controllers.length; j++) {
			new_game.player_controllers[j].get_weight = this.get_weight;
			new_game.player_controllers[j].tiebreak_method = this.tiebreak_method;
		}
		new_game.active_player_controller = new_game.player_controllers[new_game.active_player];
		new_game.place_disk(game.valid_moves[i]);
		new_game.next_turn(true);

		weights.push(this.minimax(new_game, depth-1, !maximizing));
	}

	var best_move_indexs = {};
	var best_weight;

	if(maximizing)
		best_weight = this.min;
	else
		best_weight = this.max;

	for(var i = 0; i < weights.length; i++) {
		if((maximizing && weights[i] >= best_weight) ||
			(!maximizing && weights[i] <= best_weight)) {

			best_weight = weights[i];


			if(!best_move_indexs[best_weight])
				best_move_indexs[best_weight] = [];

			best_move_indexs[best_weight].push(i);
		}

	}

	this.valid_moves_weights = weights;
	this.best_move_weight = best_weight;

	var move_indexes = best_move_indexs[best_weight];

	this.best_move_index = this.tiebreak_method(move_indexes);
	return best_weight;
};

AIMinimaxController.prototype.get_weight_def = function(game) {
	if(game.finished()) {
		if(game.winner === this.player)
			return this.max;
		else if(game.winner === null)
			return this.min+1; // A draw is considered slightly more favorable to a loss.
		else
			return this.min;
	} else {
		return this.get_weight(game);
	}
};

AIMinimaxController.prototype.draw_options = function(options_container) {
	var self = this;
	options_container.empty();

	var search_depth =
		$("<label>").text("Search Depth: ").append(
			$("<input>", {value: self.depth, type: "number", min: 1}).on('blur', function(){
				self.depth = parseInt($(this).val());
				
				if(isNaN(self.depth)) {
					self.depth = self.default_depth;
				}

				$(this).val(self.depth);

				self.recalc();	
			})
		);

	search_depth = $("<div>", {class: "form_group"}).append(search_depth);
	
	var weight_method = $("<select>");


	for(var v in this.weighting_functions) {
		var func = this.weighting_functions[v];
		weight_method.append('<option value="'+v+'">'+func.name+'</option>');
	}

	weight_method.on("change", function(e) {
		var func_key = $(this).val();
		self.get_weight = self.weighting_functions[func_key].func;
		self.recalc();
	});

	weight_method =	
		$("<label>").text("Weight Method: ").append(
			weight_method
		);

	weight_method = $("<div>", {class: "form_group"}).append(weight_method);

	var tiebreak_method = $("<select>");

	for(var v in this.tiebreak_functions) {
		var func = this.tiebreak_functions[v];
		tiebreak_method.append('<option value="'+v+'">'+func.name+'</option>');
	}

	tiebreak_method.on("change", function(e) {
		var func_key = $(this).val();
		self.tiebreak_method = self.tiebreak_functions[func_key].func;
		self.recalc();
	});

	tiebreak_method =	
		$("<label>").text("Tie-break Method: ").append(
			tiebreak_method
		);

	tiebreak_method = $("<div>", {class: "form_group"}).append(tiebreak_method);

	var pause_until_key = $("<label>").text("Wait for Enter to Move").append(
		$("<input>", {type: "checkbox"}).prop('checked', this.pause_until_key).on('change', function(){
			self.pause_until_key = $(this).prop('checked');
			self.recalc();
		})
	);

	pause_until_key = $("<div>", {class: "form_group"}).append(pause_until_key);

	options_container.append(search_depth, weight_method, tiebreak_method, pause_until_key);
};

AIMinimaxController.prototype.keypress = function(ev) {
	if(this.pause && this.pause_until_key && this.best_move !== null && this.best_move !== undefined)
		this.take_best_move();
};

AIMinimaxController.prototype.reset = function(ev) {
	this.best_move = null;
	this.best_move_index = null;
	this.best_move_indexs = [];
};

AIMinimaxController.prototype.recalc = function() {
	if(this.game.active_player == this.player && this.game.running())
		this.your_move();
}