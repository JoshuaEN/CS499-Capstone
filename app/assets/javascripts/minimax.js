"use strict";

var Minimax = function(player, options) {
	this.min = MIN_VALUE;
	this.max = MAX_VALUE;
	this.player = player;

	this.options = {
		alpha_beta: true,
		record_path: false,
		tiebreak: (function(arr) { return arr[0]; }),
		get_weight: (function(game) { return undefined; }),
		get_endgame_weight: (function(game) { return undefined; }),
		recursive_depth_trim_max: 999,
		track_permutations: false
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

		if(!minimax_result.valid_move_weights)
			break;

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
	var original_valid_moves = new_game.valid_moves;
	if(this.options.recursive_depth_trim_max < 999) {
		var new_valid_moves = new_game.valid_moves.slice(0, this.options.recursive_depth_trim_max);
		new_game.valid_moves = new_valid_moves;
	}

	var minimax_result = this.minimax(new_game, depth, maximizing, alpha, beta);

	if(!minimax_result.valid_move_weights)
		return minimax_result;

	if(this.options.recursive_depth_trim_max < 999) {
		for(var i = this.options.recursive_depth_trim_max; i < original_valid_moves.length; i++) {
			if(minimax_result.valid_move_weights[i] !== undefined)
				console.error("Invalid index overwrite");

			minimax_result.valid_move_weights[i] = 0;
		}
	}

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

Minimax.prototype.minimax_rr = function(game, depth, maximizing, alpha, beta, callback, data) {
	var self = this;

	return this.minimax_loop(game, depth, maximizing, alpha, beta, (function(game, depth, maximizing, alpha, beta, minimax_func, data) {
		return callback.call(this, game, depth, maximizing, this.min, this.max);
	}));
};

Minimax.prototype.minimax = function(game, depth, maximizing, alpha, beta) {
	return this.minimax_loop(game, depth, maximizing, alpha, beta, this.minimax_loop);
};

Minimax.prototype.minimax_loop = function(game, depth, maximizing, alpha, beta, minimax_func, data) {

	if(depth <= 0 || game.finished()) {
		return {weight: this.get_weight_def(game, {maximizing: maximizing}), endpoint: true};
	}

	data = data || {permutations: {}};

	if(this.options.track_permutations && data.permutations) {
		var res = this.permutation_lookup(game, data.permutations);

		if(res !== undefined) {
			res.endpoint = true;
			res.found_via_lookup = true;
			res.stopped = true;
			res.graph_points = undefined;

			if(alpha > res.alpha) {
				res.alpha = alpha;
			}

			if(beta < res.beta) {
				res.beta = beta;
			}

			return res;
		}
	}


	var ra = alpha, rb = beta;
	var graph_points = {};
	var weights = [];

	for(var i = 0; i < game.valid_moves.length; i++) {
		var loop_pre_res = this.loop_pre(i, game, depth);

		graph_points[i] = loop_pre_res.graph_point;


		var minimax_res = minimax_func.call(this, loop_pre_res.new_game, loop_pre_res.new_depth, loop_pre_res.new_maximizing, alpha, beta, minimax_func, data);
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
			graph_points[i].found_via_lookup = minimax_res.found_via_lookup;
		}

		if(res_ab && res_ab.stop)
			break;
	}

	var get_best_res = this.get_best(weights, maximizing, {game: game});
	get_best_res.graph_points = graph_points;

	// if(this.options.alpha_beta && minimax_res.stopped)
	// 	get_best_res.weight = (maximizing ? alpha : beta);

	get_best_res.ra = ra;
	get_best_res.rb = rb;
	get_best_res.alpha = alpha;
	get_best_res.beta = beta;
	get_best_res.stopped = (res_ab ? res_ab.stop : undefined);

	if(this.options.track_permutations) {
		data.permutations[game.board] = get_best_res;// = this.permutation_append(game, data.permutations, get_best_res);
	}

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

Minimax.prototype.get_best = function(weights, maximizing, data) {
	var best_move_indexs = {};
	var best_weight;

	if(maximizing)
		best_weight = -Infinity;
	else
		best_weight = Infinity;

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

	var best_move_index = this.options.tiebreak(move_indexes, data);

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

	var stop = alpha >= beta;

	return {alpha: alpha, beta: beta, stop: stop};
};

Minimax.prototype.get_weight_def = function(game, data) {
	if(game.finished()) {
		return this.options.get_endgame_weight(game, this.player, data);
	} else {
		return this.options.get_weight(game, this.player, data);
	}
};

Minimax.prototype.permutation_lookup = function(game, permutations) {
	var game_board_permutations = game.board_permutations();
	for(var i = 0; i < game_board_permutations.length; i++) {
		var permutation = permutations[game_board_permutations[i]];
		if(permutation !== undefined)
			return permutation;
	}

	return undefined;
};

Minimax.prototype.permutation_append = function(game, permutations, value) {
	if(this.permutation_lookup(game, permutations) !== undefined)
		return;

	permutations[game.board] = value;
	return permutations;
};

(function() {
	var self = this;

	this.Minimax_endgame_weight_functions = {
		basic: {
			name: "Basic",
			func: (function(game, player) {
				var starting_point = 0;

				if(game.winner === player)
					starting_point = MAX_VALUE;
				else if(game.winner === null)
					starting_point = 0; // A draw is considered slightly more favorable to a loss.
				else
					starting_point = MIN_VALUE;

				return starting_point;
			})
		},
		disk_maximizing: {
			name: "Disk Maximizing",
			func: (function(game, player) {
				var initial_value = self.Minimax_endgame_weight_functions.basic.func(game, player);
				var disk_counts = game.get_counts();
				var them = game.other_player(player);
				var us = player;

				// The winner is given credit for empty board spaces.
				// ref: http://www.cs.cornell.edu/~yuli/othello/othello.html
				if(game.winner === player) {
					initial_value += disk_counts[null];
				}

				return initial_value + (disk_counts[us] * 1000);
			})
		},
		disk_difference: {
			name: "Disk Difference",
			func: (function(game, player) {
				var disk_counts = game.get_counts();
				var them = game.other_player(player);
				var us = player;

				// The winner is given credit for empty board spaces.
				// ref: http://www.cs.cornell.edu/~yuli/othello/othello.html

				if(game.winner !== null)
					disk_counts[game.winner] += disk_counts[null]

				return disk_counts[us]-disk_counts[them];
			})
		},
		draw: {
			name: "Draw",
			func: (function(game, player, data) {
				var val;
				if(game.winner === null) {
					val = 0;
				} else {
					val = -Infinity;
				}

				return  val;

			})
		}
	}

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
		},
		stable: {
			name: "Stable Disks Count",
			func: (function(game, player) {
				var stable_disks = new Array(game.board_size * game.board_size);
				var max_cord = game.board_size-1;
				var counts = [0,0];
				for(var i = 0; i < stable_disks.length; i++) {
					stable_disks[i] = null;
				}

				var sdisk = function(x, y, value) {
					var idx = game.board_size * y + x;
					if(value === undefined)
						return stable_disks[idx];
					else
						stable_disks[idx] = value;
				};

				// // Set the stable state of each corner piece.
				// sdisk(0,0, game.tile(0,0));
				// sdisk(0,max_cord, game.tile(0,max_cord));
				// sdisk(max_cord,0, game.tile(max_cord,0));
				// sdisk(max_cord,max_cord, game.tile(max_cord,max_cord));

				for(var i = 0; i < game.board.length; i++) {
					var xy = game.get_xy(i);
					var x = xy.x, y = xy.y;
					var disk = game.tile(x,y);

					if(disk === null)
						continue;

					var results =game.explore_directions(x, y, disk, null, null, 
						(function(mx,my,disk,ours) {

							// Out of bounds, we've reached the edge of the board successfully.
							if(disk === undefined)
								return true;

							if(disk !== ours)
								return false;
						})
					);

					if( (results.n || results.s) &&
						(results.e || results.w) &&
						(results.ne || results.sw) &&
						(results.nw || results.se)) {

						sdisk(x,y,disk);

						counts[disk] += 1;
					}
				}

				return counts[player];
			})
		},
		stable_players_diff: {
			name: "Stable Disks Difference (DP)",
			func: (function(game, player) {
				var stable_disks = new Array(game.board_size * game.board_size);
				var max_cord = game.board_size-1;
				var counts = [0,0];
				for(var i = 0; i < stable_disks.length; i++) {
					stable_disks[i] = null;
				}

				var sdisk = function(x, y, value) {
					var idx = game.board_size * y + x;
					if(value === undefined)
						return stable_disks[idx];
					else
						stable_disks[idx] = value;
				};

				// // Set the stable state of each corner piece.
				// sdisk(0,0, game.tile(0,0));
				// sdisk(0,max_cord, game.tile(0,max_cord));
				// sdisk(max_cord,0, game.tile(max_cord,0));
				// sdisk(max_cord,max_cord, game.tile(max_cord,max_cord));

				for(var i = 0; i < game.board.length; i++) {
					var xy = game.get_xy(i);
					var x = xy.x, y = xy.y;
					var disk = game.tile(x,y);

					if(disk === null)
						continue;

					var results =game.explore_directions(x, y, disk, null, null, 
						(function(mx,my,disk,ours) {

							// Out of bounds, we've reached the edge of the board successfully.
							if(disk === undefined)
								return true;

							if(disk !== ours)
								return false;
						})
					);

					if( (results.n || results.s) &&
						(results.e || results.w) &&
						(results.ne || results.sw) &&
						(results.nw || results.se)) {

						sdisk(x,y,disk);

						counts[disk] += 1;
					}
				}

				var them = game.other_player(player);
				var us = player;
				return counts[us] - counts[them];
			})
		},
		stable_players_diff_new: {
			name: "Stable Disks Difference",
			func: (function(game, player) {
				var counts = game.get_stable_counts();
				var them = game.other_player(player);
				var us = player;
				return counts[us] - counts[them];
			})
		},
		tiered_weighting_r4a: {
			name: "Tiered Weighting (R4a)",
			func: (function(game, player) {
				var them = game.other_player(player);
				var us = player;

				var get_ratio_func = (function(hash, us, them) {
					var combined = hash[us] + hash[them] + 2;
					return (hash[us]+1)*100/combined;
					return hash[us] - hash[them];
				});

				var stable_disks = game.get_stable_counts();
				var stable_disk_ratio = get_ratio_func(stable_disks, us, them);

				var unstable_disks = game.get_counts();
				var unstable_disk_ratio = get_ratio_func(unstable_disks, us, them);

				return stable_disk_ratio * 100000 + (unstable_disk_ratio * -10000)

			})
		},
		tiered_weighting_r10: {
			name: "Tiered Weighting (R10)",
			func: (function(game, player) {
				var them = game.other_player(player);
				var us = player;

				var get_ratio_func = (function(hash, us, them) {
					return hash[us] - hash[them];

					if(hash[them] === 0 && hash[us] === 0)
						return 0;

					return (hash[us]+1)/(hash[them]+1);
				});

				var stable_disks = game.get_stable_counts();
				var stable_disk_ratio = get_ratio_func(stable_disks, us, them);

				var frontier_disks = game.get_frontier_counts();

				// We want to minimize our oppoents moves, thus we make our count negative so when maximizing we pickk the least number of frontier disks.
				var frontier_disks_us = frontier_disks[us] * -1;

				// We also want our oppoent to have a wide frontier from which we can play, however that's less important.
				var frontier_disks_them = frontier_disks[them];

				var frontier_disk_ratio = get_ratio_func(frontier_disks, them, us);

				var unstable_disks = game.get_counts();
				unstable_disks[us] = unstable_disks[us] - stable_disks[us];
				unstable_disks[them] = unstable_disks[them] - stable_disks[them];
				var unstable_disk_ratio = get_ratio_func(unstable_disks, them, us);

				var valueation_value = 10000;
				var weight_value = 0;

				if(stable_disk_ratio != 0) {
					weight_value += stable_disk_ratio * 100000; // 1,000,000
					//return weight_value;
				}
				valueation_value = valueation_value/10;

				if(frontier_disks_us != 0) {
					weight_value += frontier_disks_us * 1000; // 10,000
					//return weight_value;
				}
				valueation_value = valueation_value/10;

				if(frontier_disks_them != 0) {
					weight_value += frontier_disks_them * 10; // 100
					//return weight_value;
				}
				valueation_value = valueation_value/10;


				return weight_value;

				return (stable_disk_ratio 		* 100000000) +
						(frontier_disks_us 		* 100000) +
						(frontier_disks_them	* 1000) +
						//(frontier_disk_ratio	* 10000) +
						(unstable_disk_ratio 	* 10)

			})
		},
		tiered_weighting_r12: {
			name: "Tiered Weighting (R12)",
			func: (function(game, player) {
				var them = game.other_player(player);
				var us = player;

				var get_ratio_func = (function(hash, us, them) {
					return hash[us] - hash[them];

					if(hash[them] === 0 && hash[us] === 0)
						return 0;

					return (hash[us]+1)/(hash[them]+1);
				});

				var stable_disks = game.get_stable_counts();
				var stable_disk_ratio = get_ratio_func(stable_disks, us, them);

				var frontier_disks = game.get_frontier_counts();

				// We want to minimize our oppoents moves, thus we make our count negative so when maximizing we pickk the least number of frontier disks.
				var frontier_disks_us = frontier_disks[us] * -1;

				// We also want our oppoent to have a wide frontier from which we can play, however that's less important.
				var frontier_disks_them = frontier_disks[them];

				var frontier_disk_ratio = get_ratio_func(frontier_disks, them, us);

				var unstable_disks = game.get_counts();
				unstable_disks[us] = unstable_disks[us] - stable_disks[us];
				unstable_disks[them] = unstable_disks[them] - stable_disks[them];
				var unstable_disk_ratio = get_ratio_func(unstable_disks, them, us);

				var valueation_value = 10000;
				var weight_value = 0;

				if(stable_disk_ratio != 0) {
					weight_value += stable_disk_ratio * 100000; // 1,000,000
					//return weight_value;
				}

				if(frontier_disk_ratio != 0) {
					weight_value += frontier_disk_ratio * 1000; // 1,000,000
					//return weight_value;
				}

				if(unstable_disk_ratio != 0) {
					weight_value += unstable_disk_ratio * 10;
					//return weight_value;
				}
				// valueation_value = valueation_value/10;

				// if(frontier_disks_us != 0) {
				// 	weight_value += frontier_disks_us * 1000; // 10,000
				// 	//return weight_value;
				// }
				// valueation_value = valueation_value/10;

				// if(frontier_disks_them != 0) {
				// 	weight_value += frontier_disks_them * 10; // 100
				// 	//return weight_value;
				// }
				// valueation_value = valueation_value/10;


				return weight_value;

				return (stable_disk_ratio 		* 100000000) +
						(frontier_disks_us 		* 100000) +
						(frontier_disks_them	* 1000) +
						(frontier_disk_ratio	* 10000) +
						(unstable_disk_ratio 	* 10)

			})
		},
		tiered_weighting_r17: {
			name: "Tiered Weighting (R17)",
			func: (function(game, player) {
				var them = game.other_player(player);
				var us = player;

				var get_ratio_func = (function(hash, us, them) {
					return hash[us] - hash[them];

					if(hash[them] === 0 && hash[us] === 0)
						return 0;

					return (hash[us]+1)/(hash[them]+1);
				});

				var stable_disks = game.get_stable_counts();
				var stable_disk_ratio = get_ratio_func(stable_disks, us, them);

				var frontier_disks = game.get_frontier_counts();

				// We want to minimize our oppoents moves, thus we make our count negative so when maximizing we pickk the least number of frontier disks.
				var frontier_disks_us = frontier_disks[us] * -1;

				// We also want our oppoent to have a wide frontier from which we can play, however that's less important.
				var frontier_disks_them = frontier_disks[them];

				var frontier_disk_ratio = get_ratio_func(frontier_disks, them, us);

				var unstable_disks = game.get_counts();
				unstable_disks[us] = unstable_disks[us] - stable_disks[us];
				unstable_disks[them] = unstable_disks[them] - stable_disks[them];
				var unstable_disk_ratio = get_ratio_func(unstable_disks, them, us);

				var valueation_value = 10000;
				var weight_value = 0;

				if(stable_disk_ratio != 0) {
					weight_value += stable_disk_ratio * 1000000; // 1,000,000
					//return weight_value;
				}

				// if(frontier_disk_ratio != 0) {
				// 	weight_value += frontier_disk_ratio * 1; // 1,000,000
				// 	//return weight_value;
				// }

				// if(unstable_disk_ratio != 0) {
				// 	weight_value += unstable_disk_ratio * 1;
				// 	//return weight_value;
				// }

				var eval_moves = function(game, player) {
					var them = game.other_player(player);
					var us = player;

					var eval_move = function(st_game, res_game) {
						//var st_stable_disks = st_game.get_stable_counts();
						var res_stable_disks = res_game.get_stable_counts();
						
						//var st_frontier_disks = st_game.get_frontier_counts();
						var res_frontier_disks = res_game.get_frontier_counts();

						var diff_hash = function(a,b) {
							var c = {};

							for(var v in a) {
								c[v] = a[v] - b[v];
							}
							return c;
						};

						var game_max_tiles = game.board_size * game.board_size;

						stable_disks = game_max_tiles + get_ratio_func(res_stable_disks, us, them);//diff_hash(st_stable_disks, res_stable_disks);
						frontier_disks = game_max_tiles + get_ratio_func(res_frontier_disks, them, us); //diff_hash(st_frontier_disks, res_frontier_disks);

						return (stable_disks * 1000) +
								(frontier_disks * 1);
					};
					var res = 0;
					for(var i = 0; i < game.valid_moves.length; i++) {
						// Create a new game instance.
						var new_game = game.dup();

						// Make move
						new_game.place_disk(game.valid_moves[i]);
						res += eval_move(game, new_game);
					}

					return res;
				};

				var move_weights = {
					0: 0,
					1: 0
				};
				move_weights[game.active_player]  = eval_moves(game, game.active_player)//game.valid_moves.length;

				var new_game = game.dup();
				var cur_player = game.active_player;
				new_game.advance_board();

				// Run check if the game is at end.
				new_game.game_at_end();

				// If we have to skip a turn we don't bother trying to get a counter weight. value
				if(!new_game.skip_turn() && game.active_player !== new_game.active_player) {
					move_weights[new_game.active_player] = eval_moves(new_game, new_game.active_player);
				}

				// if(game.active_player !== player) {
				// 	move_weight *= -1;
				// }

				//var move_weight_ratio = move_weight;

				var move_weight_ratio = get_ratio_func(move_weights, us, them);

				if(move_weight_ratio != 0) {
					weight_value += move_weight_ratio * 1;
					//return weight_value;
				}

				// valueation_value = valueation_value/10;

				// if(frontier_disks_us != 0) {
				// 	weight_value += frontier_disks_us * 1000; // 10,000
				// 	//return weight_value;
				// }
				// valueation_value = valueation_value/10;

				// if(frontier_disks_them != 0) {
				// 	weight_value += frontier_disks_them * 10; // 100
				// 	//return weight_value;
				// }
				// valueation_value = valueation_value/10;


				return weight_value;

				return (stable_disk_ratio 		* 100000000) +
						(frontier_disks_us 		* 100000) +
						(frontier_disks_them	* 1000) +
						(frontier_disk_ratio	* 10000) +
						(unstable_disk_ratio 	* 10)

			})
		},
		tiered_weighting_r19: {
			name: "Tiered Weighting",
			func: (function(game, player) {
				var them = game.other_player(player);
				var us = player;

				var get_ratio_func = (function(hash, us, them) {
					return hash[us] - hash[them];

					if(hash[them] === 0 && hash[us] === 0)
						return 0;

					return (hash[us]+1)/(hash[them]+1);
				});

				var stable_disks = game.get_stable_counts();
				var stable_disk_ratio = get_ratio_func(stable_disks, us, them);

				var frontier_disks = game.get_frontier_counts();

				// We want to minimize our oppoents moves, thus we make our count negative so when maximizing we pickk the least number of frontier disks.
				var frontier_disks_us = frontier_disks[us] * -1;

				// We also want our oppoent to have a wide frontier from which we can play, however that's less important.
				var frontier_disks_them = frontier_disks[them];

				var frontier_disk_ratio = get_ratio_func(frontier_disks, them, us);

				var unstable_disks = game.get_counts();
				unstable_disks[us] = unstable_disks[us] - stable_disks[us];
				unstable_disks[them] = unstable_disks[them] - stable_disks[them];
				var unstable_disk_ratio = get_ratio_func(unstable_disks, them, us);

				var valueation_value = 10000;
				var weight_value = 0;

				if(stable_disk_ratio != 0) {
					weight_value += stable_disk_ratio * 1000000; // 1,000,000
					//return weight_value;
				}

				// if(frontier_disk_ratio != 0) {
				// 	weight_value += frontier_disk_ratio * 1; // 1,000,000
				// 	//return weight_value;
				// }

				// if(unstable_disk_ratio != 0) {
				// 	weight_value += unstable_disk_ratio * 1;
				// 	//return weight_value;
				// }

				var eval_moves = function(game, player) {
					var them = game.other_player(player);
					var us = player;

					var eval_move = function(st_game, res_game) {
						//var st_stable_disks = st_game.get_stable_counts();
						var res_stable_disks = res_game.get_stable_counts();
						
						//var st_frontier_disks = st_game.get_frontier_counts();
						var res_frontier_disks = res_game.get_frontier_counts();

						var diff_hash = function(a,b) {
							var c = {};

							for(var v in a) {
								c[v] = a[v] - b[v];
							}
							return c;
						};

						var game_max_tiles = game.board_size * game.board_size;

						stable_disks = 0;//game_max_tiles + get_ratio_func(res_stable_disks, us, them);//diff_hash(st_stable_disks, res_stable_disks);
						frontier_disks = get_ratio_func(res_frontier_disks, them, us); //diff_hash(st_frontier_disks, res_frontier_disks);

						return (stable_disks * 1000) +
								(frontier_disks * 1);
					};
					var res = 0;
					for(var i = 0; i < game.valid_moves.length; i++) {
						// Create a new game instance.
						var new_game = game.dup();

						// Make move
						new_game.place_disk(game.valid_moves[i]);
						res += eval_move(game, new_game);
					}

					return res;
				};

				var move_weights = {
					0: 0,
					1: 0
				};
				//move_weights[game.active_player]  
				var move_weight = eval_moves(game, game.active_player)//game.valid_moves.length;

				// var new_game = game.dup();
				// var cur_player = game.active_player;
				// new_game.advance_board();

				// // Run check if the game is at end.
				// new_game.game_at_end();

				// // If we have to skip a turn we don't bother trying to get a counter weight. value
				// if(!new_game.skip_turn() && game.active_player !== new_game.active_player) {
				// 	move_weights[new_game.active_player] = eval_moves(new_game, new_game.active_player);
				// }

				if(game.active_player !== player) {
					move_weight *= -1;
				}

				var move_weight_ratio = move_weight;

				var move_weight_ratio = get_ratio_func(move_weights, us, them);

				if(move_weight_ratio != 0) {
					weight_value += move_weight_ratio * 1;
					//return weight_value;
				}

				// valueation_value = valueation_value/10;

				// if(frontier_disks_us != 0) {
				// 	weight_value += frontier_disks_us * 1000; // 10,000
				// 	//return weight_value;
				// }
				// valueation_value = valueation_value/10;

				// if(frontier_disks_them != 0) {
				// 	weight_value += frontier_disks_them * 10; // 100
				// 	//return weight_value;
				// }
				// valueation_value = valueation_value/10;


				return weight_value;

				return (stable_disk_ratio 		* 100000000) +
						(frontier_disks_us 		* 100000) +
						(frontier_disks_them	* 1000) +
						(frontier_disk_ratio	* 10000) +
						(unstable_disk_ratio 	* 10)

			})
		},
		tiered_weighting_r21: {
			name: "Tiered Weighting (R21)",
			func: (function(game, player) {
				var them = game.other_player(player);
				var us = player;

				var get_ratio_func = (function(hash, us, them) {
					return hash[us] - hash[them];

					if(hash[them] === 0 && hash[us] === 0)
						return 0;

					return (hash[us]+1)/(hash[them]+1);
				});

				var stable_disks = game.get_stable_counts();
				var stable_disk_ratio = get_ratio_func(stable_disks, us, them);

				var frontier_disks = game.get_frontier_counts();

				// We want to minimize our oppoents moves, thus we make our count negative so when maximizing we pickk the least number of frontier disks.
				var frontier_disks_us = frontier_disks[us] * -1;

				// We also want our oppoent to have a wide frontier from which we can play, however that's less important.
				var frontier_disks_them = frontier_disks[them];

				var frontier_disk_ratio = get_ratio_func(frontier_disks, them, us);

				var unstable_disks = game.get_counts();
				unstable_disks[us] = unstable_disks[us] - stable_disks[us];
				unstable_disks[them] = unstable_disks[them] - stable_disks[them];
				var unstable_disk_ratio = get_ratio_func(unstable_disks, them, us);

				var weight_value = 0;

				if(stable_disk_ratio != 0) {
					weight_value += stable_disk_ratio * 10000; // 1,000,000
				}

				if(frontier_disk_ratio != 0) {
					weight_value += frontier_disk_ratio * 100; // 1,000,000
				}

				if(unstable_disk_ratio != 0) {
					weight_value += unstable_disk_ratio * 1;
				}

				return weight_value;
			})
		},
		tiered_weighting_r28: {
			name: "Tiered Weighting (CR)",
			func: (function(game, player) {
				var them = game.other_player(player);
				var us = player;

				var get_ratio_func = (function(hash, us, them) {
					return hash[us] - hash[them];

					if(hash[them] === 0 && hash[us] === 0)
						return 0;

					return (hash[us]+1)/(hash[them]+1);
				});

				var stable_disks = game.get_stable_counts();
				var stable_disk_ratio = get_ratio_func(stable_disks, us, them);

				var frontier_disks = game.get_frontier_counts();

				// We want to minimize our oppoents moves, thus we make our count negative so when maximizing we pickk the least number of frontier disks.
				var frontier_disks_us = frontier_disks[us] * -1;

				// We also want our oppoent to have a wide frontier from which we can play, however that's less important.
				var frontier_disks_them = frontier_disks[them];

				var frontier_disk_ratio = get_ratio_func(frontier_disks, them, us);

				var unstable_disks = game.get_counts();
				unstable_disks[us] = unstable_disks[us] - stable_disks[us];
				unstable_disks[them] = unstable_disks[them] - stable_disks[them];
				var unstable_disk_ratio = get_ratio_func(unstable_disks, them, us);

				var regions = game.get_region_counts();
				var sregions = regions.small;
				var favorable_regions;
				var unfavorable_regions;

				if(game.active_player === player) {
					favorable_regions = sregions.odd;
					unfavorable_regions = sregions.even;
				} else {
					favorable_regions = sregions.even;
					unfavorable_regions = sregions.odd;
				}

				var rhash = {};
				rhash[us] = favorable_regions;
				rhash[them] = unfavorable_regions;

				var region_ratio = get_ratio_func(rhash, us, them);

				var weight_value = 0;

				if(region_ratio != 0 && sregions.total === regions.total) {
					weight_value += region_ratio * 1000000;
				}

				if(stable_disk_ratio != 0) {
					weight_value += stable_disk_ratio * 10000; // 1,000,000
				}

				if(frontier_disk_ratio != 0) {
					weight_value += frontier_disk_ratio * 100; // 1,000,000
				}

				if(unstable_disk_ratio != 0) {
					weight_value += unstable_disk_ratio * 1;
				}

				return weight_value;
			})
		},
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
			name: "Random Index (Crypto)",
			func: (function(arr) {
				var rnd = crypto.getRandomValues(new Uint32Array(1))[0];
				return arr[rnd%arr.length];
			})
		},
		rand_math: {
			name: "Random Index (Math)",
			func: (function(arr) {
				return arr[Math.floor(Math.random() * arr.length)];
			})
		},
		weight: {
			name: "Tile Weight",
			func: (function(arr, data) {

				if(arr.length < 2)
					return arr[0];

				var moves = data.game.valid_moves;
				var best_moves = {};
				var best_weight = -Infinity;

				for(var i = 0; i < arr.length; i++) {
					var idx = arr[i];
					var move_index = moves[idx];

					var move_weight = data.game.board_weights[move_index];

					if(best_moves[move_weight] === undefined) {
						best_moves[move_weight] = [];

						if(move_weight > best_weight)
							best_weight = move_weight;
					}

					best_moves[move_weight].push(idx);
				}

				if(best_moves[best_weight].length < 2)
					return best_moves[best_weight][0];
				else
					return Minimax_tiebreak_functions.rand.func(best_moves[best_weight]);				

			})
		}
	};
}).call(this);