"use strict";

var Minimax = function(player, options) {
	this.min = -Infinity;
	this.max = Infinity;
	this.player = player;

	this.options = {
		alpha_beta: true,
		record_path: false,
		tiebreak: (function(arr) { return arr[0]; }),
		get_weight: (function(game) { return undefined; })
	};

	options = options || {};

	for(var v in options) {
		if(this.options[v] === undefined) {
			console.error("Ignored unrecognized option key: " + v);
		} else if(options[v] !== undefined) {
			this.options[v] = options[v];
		} else {
			console.warn("Ignored undefined option: " + v);
		}
	}
};

Minimax.prototype.minimax_rd = function(game, depth, maximizing, alpha, beta, depth_steps) {
	var new_game = game.dup();
	for(var i = 0; i < depth_steps.length; i++) {
		var minimax_result = this.minimax(new_game, depth_steps[i], maximizing, alpha, beta);
		var sortable = [];

		for(var j = 0; j < minimax_result.valid_move_weights.length; j++) {
			sortable[j] = [minimax_result.valid_move_weights[j], new_game.valid_moves[j]];
		}

		sortable.sort(function(x,y) { return y[0] - x[0]});

		var ordered_valid_moves = [];

		for(var j = 0; j < sortable.length; j++) {
			ordered_valid_moves[j] = sortable[j][1];
		}

		new_game.valid_moves = ordered_valid_moves;
	}

	var minimax_result = this.minimax(new_game, depth, maximizing, alpha, beta);

	// Map the result data back to the same indexes as they appear in the given game's valid moves.
	var sortable = [];
	for(var j = 0; j < minimax_result.valid_move_weights.length; j++) {
		sortable[j] = [minimax_result.valid_move_weights[j], new_game.valid_moves[j], (minimax_result.best_move_index === j)];
	}
	sortable.sort(function(x,y) { return x[1] - y[1]});

	for(var j = 0; j < sortable.length; j++) {
		minimax_result.valid_move_weights[j] = sortable[j][0];

		if(sortable[j][2] === true)
			minimax_result.best_move_index = j;
	}

	return minimax_result;
};

Minimax.prototype.minimax = function(game, depth, maximizing, alpha, beta) {

	if(depth <= 0 || game.finished()) {
		return {weight: this.get_weight_def(game), endpoint: true};
	}

	var ra = alpha, rb = beta;
	var graph_points = {};
	var weights = [];

	for(var i = 0; i < game.valid_moves.length; i++) {
		var loop_pre_res = this.loop_pre(i, game, depth);

		graph_points[i] = loop_pre_res.graph_point;


		var minimax_res = this.minimax(loop_pre_res.new_game, loop_pre_res.new_depth, loop_pre_res.new_maximizing, alpha, beta);
		weights.push(minimax_res.weight);

		var res_ab;
		if(this.options.alpha_beta) {
			res_ab = this.alpha_beta(maximizing, alpha, beta, minimax_res.weight);
			alpha = res_ab.alpha;
			beta = res_ab.beta;
		}

		if(this.options.record_path) {
			graph_points[i].weight = minimax_res.weight;
			graph_points[i].subtree = minimax_res.graph_points;
			graph_points[i].alpha = minimax_res.alpha;
			graph_points[i].beta = minimax_res.beta;
			graph_points[i].ra = minimax_res.ra;
			graph_points[i].rb = minimax_res.rb;
			graph_points[i].stopped = minimax_res.stopped;
		}

		if(res_ab && res_ab.stop)
			break;
	}

	var get_best_res = this.get_best(weights, maximizing);
	get_best_res.graph_points = graph_points;

	if(this.options.alpha_beta && minimax_res.stopped)
		get_best_res.weight = (maximizing ? alpha : beta);

	get_best_res.ra = ra;
	get_best_res.rb = rb;
	get_best_res.alpha = alpha;
	get_best_res.beta = beta;
	get_best_res.stopped = (res_ab ? res_ab.stop : undefined);
	return get_best_res;
};

Minimax.prototype.loop_pre = function(i, game, depth) {

	// Create a new game instance.
	var new_game = game.dup();

	// Make move
	new_game.place_disk(game.valid_moves[i]);
	new_game.advance_board();

	// Run check if the game is at end.
	new_game.game_at_end();

	var new_depth = depth;
	var graph_point = null;

	// Advance the board if we have to skip a turn as the minimax algorithm expects there to be at least one valid move.
	if(new_game.skip_turn() && game.game_at_end() == false) {
		new_game.advance_board();
		new_depth -= 1;
	}
	else {
		new_depth -= 1;
	}

	if(this.options.record_path) {
		graph_point = {
			index: game.valid_moves[i],
			board: new_game.board.slice(0)
		};
	}

	// We do this here, rather than before, as if we skip a turn the result will be different.
	var new_maximizing = (new_game.active_player === this.player);

	if(this.options.record_path)
		graph_point.maximizing = new_maximizing;

	return {new_game: new_game, new_depth: new_depth, new_maximizing: new_maximizing, graph_point: graph_point};
};

Minimax.prototype.get_best = function(weights, maximizing) {
	var best_move_indexs = {};
	var best_weight;

	if(maximizing)
		best_weight = this.min;
	else
		best_weight = this.max;

	// Group the moves by their weight, also find the best weight.
	for(var i = 0; i < weights.length; i++) {
		if((maximizing && weights[i] >= best_weight) ||
			(!maximizing && weights[i] <= best_weight)) {

			best_weight = weights[i];


			if(!best_move_indexs[best_weight])
				best_move_indexs[best_weight] = [];

			best_move_indexs[best_weight].push(i);
		}

	}

	var move_indexes = best_move_indexs[best_weight];

	var best_move_index = this.options.tiebreak(move_indexes);

	return {weight: best_weight, valid_move_weights: weights, best_move_index: best_move_index};
};


Minimax.prototype.alpha_beta = function(maximizing, alpha, beta, weight) {

	if(maximizing) {

		if(weight > alpha) {
			alpha = weight;
		}

	} else {

		if(weight < beta)
			beta = weight;
	}

	return {alpha: alpha, beta: beta, stop: (alpha >= beta)};
};

Minimax.prototype.get_weight_def = function(game) {
	if(game.finished()) {
		if(game.winner === this.player)
			return this.max;
		else if(game.winner === null)
			return 0; // A draw is considered slightly more favorable to a loss.
		else
			return this.min;
	} else {
		return this.options.get_weight(game, this.player);
	}
};

(function() {

	this.Minimax_weight_functions = {
		// Performs a simple comparison between the count for our player and the enemy player at the current state of the board.
		basic: {
			name: "Total Disk Difference",
			func: (function(game, player) {
				var them = game.other_player(player);
				var us = player;
		
				var counts = game.get_counts();
		
				return counts[us] - counts[them];
			})
		}
	};

	this.Minimax_tiebreak_functions = {
		first: {
			name: "First Index",
			func: (function(arr) {
				return arr[0];
			})
		},
		mid_c: {
			name: "Middle Index (Ceiling)",
			func: (function(arr) {
				var mid = Math.ceil((arr.length-1)/2);
				return arr[mid];
			})
		},
		mid_f: {
			name: "Middle Index (Floor)",
			func: (function(arr) {
				var mid = Math.floor((arr.length-1)/2);
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
	};
}).call(this);