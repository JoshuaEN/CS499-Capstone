"use strict";

var Game = function(board_size, options) {
	options = options || {};
	this.fire_events = options.fire_events || false;
	this.game_renderer = options.game_renderer || undefined;
	this.on_event = options.on_event || undefined;
	this.set_game_state("init");
	
	this.board_size = board_size;

	// Map the game board onto a 1d array.
	this.board = Array(board_size * board_size);

	this.dark_disk = 0;
	this.light_disk = 1;

	// List of controllers for players.
	this.player_controllers = [];

	// List of previous board states, newest on top.
	this.board_history = [];

	this.setup_board();
	this.setup_board_weight_table();
	
	this.set_game_state("setup");
	return this;
};

Game.prototype.setup_board = function() {
	
	// Null out the board.
	for(var i = 0; i < this.board.length; i++) {
		var xy = this.get_xy(i);
		this.tile(xy.x, xy.y, null);
	}

	var board_mid_top_left = Math.floor(this.board_size / 2)-1;
	// Setup intial values.
	this.tile(board_mid_top_left, board_mid_top_left, this.light_disk);
	this.tile(board_mid_top_left+1, board_mid_top_left, this.dark_disk);
	this.tile(board_mid_top_left, board_mid_top_left+1, this.dark_disk);
	this.tile(board_mid_top_left+1, board_mid_top_left+1, this.light_disk);
};

Game.prototype.setup_board_weight_table = function() {
	this.board_weights = [];

	var self = this;
	var max_pos = this.board_size - 1;
	var transpose = function(x,y,val) {
		self.board_weights[self.get_index(x,y)] = val;
		self.board_weights[self.get_index(x,max_pos-y)] = val;
		self.board_weights[self.get_index(max_pos-x,y)] = val;
		self.board_weights[self.get_index(max_pos-x,max_pos-y)] = val;
	};

	// Weights from http://www.samsoft.org.uk/reversi/strategy.htm

	transpose(0,0,99);

	transpose(1,0,-8);
	transpose(0,1,-8);

	transpose(2,0,8);
	transpose(0,2,8);

	transpose(3,0,6);
	transpose(0,3,6);

	transpose(1,1,-24);

	transpose(2,1,-4);
	transpose(1,2,-4);

	transpose(3,1,-3);
	transpose(1,3,-3);

	transpose(3,2,4);
	transpose(2,3,4);

	transpose(2,2,7);

	transpose(3,3,0);
};

Game.prototype.copy_state = function(game) {
	this.board = game.board.slice(0);
	this.game_state = game.game_state;
	this.winner = game.winner;
	this.active_player = game.active_player;
	this.valid_moves = game.valid_moves.slice(0);
	this.valid_move_gains = game.valid_move_gains.slice(0);
};

Game.prototype.set_game_state = function(state) {
	var old_state = this.game_state;
	this.game_state = state;

	if(state == "start") {
		this.start();
	} else if(state == "deadlock" || state == "game_over") {
		this.winner = this.get_winner();
	}

	this.fire('statechange', {before: old_state, after: state});
};

Game.prototype.start = function() {
	var self = this;
	this.set_game_state("started");
	this.active_player = 1;
	this.next_turn();
};

Game.prototype.reset = function() {	
	this.setup_board();
	this.active_player_controller = null;
	this.active_player = null;
	this.board_history = [];

	for(var i = 0; i < this.player_controllers.length; i++) {
		this.player_controllers[i].reset();
	}

	this.set_game_state("setup");
};

Game.prototype.restart = function() {
	this.reset();
	this.set_game_state("start");
};

Game.prototype.move = function(index) {
	if(this.valid_moves.indexOf(index) != -1) {
		this.place_disk(index);
		this.board_history.push({player: this.active_player, index: index});

		this.next_turn();

		this.fire('move.valid', {index: index});
		return true;
	} else {
		this.fire('move.invalid', {index: index});
		return false;
	}
};

Game.prototype.place_disk = function(index) {
	var xy = this.get_xy(index);
	var x = xy.x;
	var y = xy.y;
	var self = this;
	this.explore_directions(x,y,this.active_player,(function(x,y,disk,ours){
		self.tile(x,y,ours);
	}),undefined);
	self.tile(x,y,this.active_player);

	this.fire('diskplaced', {x: x, y: y, index: index, player: this.active_player});
};

Game.prototype.next_turn = function(keep_control) {

	this.advance_board();

	this.fire('boardadvance');

	if(this.game_at_end())
		return;

	if(this.skip_turn()) {
		this.next_turn(keep_control);
		return;
	}

	if(!keep_control)
		this.active_player_controller.your_move();

	this.fire('turnadvance');
};

Game.prototype.advance_board = function() {
	this.next_player();
	this.process_board();
};

Game.prototype.process_board = function() {
	var res = this.find_valid_moves();

	this.valid_moves = res.valid_moves;
	this.valid_move_gains = res.gains;
};

Game.prototype.game_at_end = function() {
	if(this.game_state == "deadlock")
		return true;
	
	if(this.valid_moves.length > 0)
		return false;

	this.advance_board();

	if(this.valid_moves.length > 0) {
		this.advance_board();
		return false;
	}

	this.set_game_state("deadlock");
	return true;
};

Game.prototype.skip_turn = function() {
	if(this.valid_moves.length == 0)
		return true;
	return false;
};

Game.prototype.next_player = function() {
	this.active_player = this.inactive_player();
	this.active_player_controller = this.player_controllers[this.active_player];
};

Game.prototype.find_valid_moves = function(ours) {
	var ours = ours || this.active_player;

	var valid = [];
	var valid_gains = [];
	
	for(var i = 0; i < this.board_size * this.board_size; i++) {
		var xy = this.get_xy(i);
		var x = xy.x;
		var y = xy.y;

		var disk = this.tile(x,y);

		if(disk !== null) {
			continue;
		}

		var counter = 0;
		var count_func = (function() {
			counter += 1;
		});

		this.explore_directions(x,y,ours, count_func);

		if(counter > 0) {
			valid.push(i);
			valid_gains.push(counter);
		}
	}

	return {valid_moves: valid, gains: valid_gains};
}

Game.prototype.explore_directions = function(x,y,ours,on_valid, on_all, is_valid) {
	var nw = this.explore_direction(x,y,-1,-1,ours,on_valid,on_all, is_valid); 	// North West
	var n = this.explore_direction(x,y,0,-1,ours,on_valid,on_all, is_valid); 		// North
	var ne = this.explore_direction(x,y,1,-1,ours,on_valid,on_all, is_valid); 		// North East
	var e = this.explore_direction(x,y,1,0,ours,on_valid,on_all, is_valid); 		// East
	var se = this.explore_direction(x,y,1,1,ours,on_valid,on_all, is_valid); 	// South East
	var s = this.explore_direction(x,y,0,1,ours,on_valid,on_all, is_valid); 		// South
	var sw = this.explore_direction(x,y,-1,1,ours,on_valid,on_all, is_valid); 	// South West
	var w = this.explore_direction(x,y,-1,0,ours,on_valid,on_all, is_valid); 		// West

	return {
		nw: nw,
		n: n,
		ne: ne,
		e: e,
		se: se,
		s: s,
		sw: sw,
		w: w
	}
}

Game.prototype.explore_direction = function(x,y,mod_x, mod_y, ours, on_valid, on_all, is_valid) {
	var mx = x + mod_x;
	var my = y + mod_y;

	var disk = this.tile(mx, my);

	if(on_all) {
		on_all.call(this, mx, my, disk, ours);
	}

	if(is_valid) {
		var res = is_valid.call(this, mx, my, disk, ours);

		if(res !== undefined)
			return res;

	} else {
		if(disk === undefined || // Out of bounds
			disk === null) // No disk present
			return false; // If we don't encounter our own disk at some point, then there's no gains to be had.

		if(disk === ours) // If we encounter our own disk, then we can gain distance number of disks by placing our piece at the starting location.
			return true;
	}

	var deeper_result = this.explore_direction(mx,my,mod_x,mod_y,ours,on_valid, on_all, is_valid);
	if(on_valid && deeper_result) {
		on_valid.call(this, mx, my, disk, ours);
	}

	return deeper_result;
};

Game.prototype.fire = function(eventName, data) {
	if(this.fire_events && this.on_event)
		this.on_event('game.' + eventName, data);
}

/* ###################
 * Getters and setters
*/

Game.prototype.get_tile = function(x, y) {
	return this.board[this.get_index(x,y)];
};
Game.prototype.set_tile = function(x, y, value) {
	var index = this.get_index(x,y);
	this.board[index] = value;

	this.fire('tilechanged', {x: x, y: y, index: index, value: value});
	return this;
};
Game.prototype.tile = function(x, y, value) {
	if(value === undefined) {
		return this.get_tile(x, y);
	} else {
		return this.set_tile(x, y, value);
	}
};


Game.prototype.get_index = function(x,y) {
	if(!this.check_xy(x,y))
		return -1;

	return this.board_size * y + x;
};
Game.prototype.get_xy = function(index) {
	var x = index % this.board_size;
	var y = (index - x)/this.board_size;
	return {x: x, y: y};
};
Game.prototype.check_xy = function(x,y) {
	if(x >= 0 && x < this.board_size &&
		y >= 0 && y < this.board_size)
		return true;
	return false;
};
Game.prototype.check_index = function(index) {
	if(index < this.board.length && index > 0)
		return true;
	return false;
};

Game.prototype.get_winner = function() {
	var counts = this.get_counts();

	if(counts[0] > counts[1]) {
		return 0;
	} else if(counts[1] > counts[0]) {
		return 1;
	} else {
		return null;
	}
};

Game.prototype.get_counts = function() {
	var counts = {
		0: 0,
		1: 0,
		null: 0
	};

	for(var i = 0; i < this.board_size*this.board_size; i++) {
		var xy = this.get_xy(i);
		var x = xy.x;
		var y = xy.y;
		var tile = this.tile(x,y);

		counts[tile] += 1;
	}

	return counts;
};

Game.prototype.get_stable_counts_dp = function() {
	var counts = {
		0: 0,
		1: 0,
		null: 0
	};

	for(var i = 0; i < this.board.length; i++) {
		var xy = this.get_xy(i);
		var x = xy.x, y = xy.y;
		var disk = this.tile(x,y);

		if(disk === null)
			continue;

		var results =this.explore_directions(x, y, disk, null, null, 
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

			counts[disk] += 1;
		}
	}

	return counts;
}

Game.prototype.get_stable_counts = function() {
	var counts = {
		0: 0,
		1: 0,
		null: 0
	};

	var stable_status = {};

	var self = this;

	var check_index = function(x, y, disk) {
		var i = self.get_index(x,y);

		if(stable_status[i] !== undefined) {
			return true;
		} else {
			//x,y,ours,on_valid, on_all, is_valid
			var res = self.explore_directions(x,y,disk,null,null, function(x,y,disk,ours) {
				if(disk === undefined)
					return true;

				var i = self.get_index(x,y);
				if(stable_status[i] === ours)
					return true;
				else
					return  false;
			});

			if( (res.n || res.s) &&
				(res.e || res.w) &&
				(res.ne || res.sw) &&
				(res.nw || res.se)) {

				stable_status[i] = disk;
				counts[disk] += 1;
			}
			
			return false;
		}
	}

	var eval_func = function(x, y, inc_x, inc_y, target) {

		var disk = self.tile(x,y);

		if(disk === null || disk === undefined)
			return;

		if(target === undefined) {
			target = disk;
		}

		if(target !== disk)
			return;

		check_index(x, y, disk);

		var ix = x, iy = y, idisk;
		var x_c = 0, y_c = 0;
		while(true) {
			ix += inc_x;

			idisk = self.tile(ix, iy);

			if(idisk !== target)
				break;

			x_c += 1;

			if(check_index(ix, iy, idisk)) {
				break;
			}
		}

		ix = x, iy = y, idisk = undefined;
		while(true) {
			iy += inc_y;

			idisk = self.tile(ix, iy);

			if(idisk !== target)
				break;

			y_c += 1;

			if(check_index(ix, iy, idisk)) {
				break;
			}
		}

		//if(x_c >= 2 && y_c >= 2)
			return eval_func(x+inc_x, y+inc_y, inc_x, inc_y, target);
		//else
		//	return;

	};

	var max_pos = this.board_size-1;
	eval_func(0,0,1,1);
	eval_func(0,max_pos,1,-1);
	eval_func(max_pos,0,-1,1);
	eval_func(max_pos,max_pos,-1,-1);

	return counts;
};

Game.prototype.get_region_counts = function() {
	var regions = {};
	var tiles = [];

	var region_counter = 0;

	var unexpored_indexes = [];

	for(var i = 0; i < this.board.length; i++) {
		unexpored_indexes.push(i);
	}

	var self = this;
	var explore_region = function (x,y,visited,linked,r) {
		visited = visited || [];
		linked = linked || [];

		var offset = 1;
		var ops = [
			[offset,0],
			[offset,offset],
			[0,offset],
			[-offset,0],
			[-offset,-offset],
			[0,-offset],
			[-offset,offset],
			[offset,-offset]
		];

		for(var i = 0; i < ops.length; i++) {
			var op = ops[i];
			var nx = x + op[0];
			var ny = y + op[1];
			var idx = self.get_index(nx,ny);

			var board_tile = self.board[idx];


			// If we've already visited this index, skip.
			if(visited.indexOf(idx) !== -1) {
				continue;
			}
			visited.push(idx);

			// If the board tile isn't null, we don't care about it.
			if(board_tile !== null) {
				continue;
			}
			linked.push(idx);

			var recursive_result = r(nx,ny,visited,linked,r);

			visited.concat(recursive_result.visited);
			linked.concat(recursive_result.linked);
		}

		return {linked: linked, visited: visited};
	};

	var i;
	while((i = unexpored_indexes.pop()) !== undefined) {
		var tile = this.board[i];

		tiles[i] = undefined;

		if(tile !== null)
			continue;

		var xy = this.get_xy(i);
		var res = explore_region(xy.x,xy.y,[i],[i],explore_region);

		unexpored_indexes = unexpored_indexes.filter(function(elm) {
			return res.visited.indexOf(elm) === -1;
		});

		regions[region_counter++] = res.linked;
	}

	var counts = {
		odd: 0,
		even: 0,
		total: 0,
		small: {
			odd: 0,
			even: 0,
			total: 0
		}
	};

	var small = 5;
	for(var v in regions) {
		var region = regions[v];
		var region_len = region.length;

		if(region_len%2 === 0) {
			counts.even += 1;

			if(region_len <= small) {
				counts.small.even += 1;
			}
		} else {
			counts.odd += 1;
			if(region_len <= small) {
				counts.small.odd += 1;
			}
		}

		counts.total += 1;
		if(region_len <= small) {
			counts.small.total += 1;
		}

	}

	return counts;
};

Game.prototype.get_frontier_counts = function() {
	var counts = {
		0: 0,
		1: 0
	};

	for(var i = 0; i < this.board.length; i++) {
		var xy = this.get_xy(i);
		var x = xy.x, y = xy.y;
		var disk = this.tile(x,y);

		if(disk === null)
			continue;

		var results =this.explore_directions(x, y, disk, null, null, 
			(function(mx,my,disk,ours) {

				// A disk is only on the frontier if one of the tiles touching it is empty.
				if(disk === null)
					return true;
				else
					return false;
			})
		);

		// If any edge touches an empty tile, this tile is on the frontier for the player.
		if(results.n || results.s || results.e || results.w || results.ne || results.sw || results.nw || results.se) {

			counts[disk] += 1;
		}
	}

	return counts;
};

Game.prototype.inactive_player = function() {
	return this.other_player(this.active_player);
};

Game.prototype.other_player = function(player) {
	if(player)
		return 0;
	else
		return 1;
};

Game.prototype.running = function() {
	if(this.game_state == "started")
		return true;
	return false;
};

Game.prototype.finished = function() {
	if(this.game_state == "deadlock")
		return true;
	return false;
};

Game.prototype.internal_state = function(setter) {
	if(setter === undefined)
		return get_internal_state();
	else
		return set_internal_state(setter);
};

Game.prototype.get_internal_state = function() {
	return {
		board: this.board.slice(0),
		board_size: this.board_size,
		active_player: this.active_player,
		winner: this.winner,
		game_state: this.game_state,
		valid_moves: this.valid_moves
	}
};

Game.prototype.set_internal_state = function(setter) {
	for(var v in setter) {
		this[v] = setter[v];
	}
};

Game.prototype.dup = function() {
	var new_game = new Game(this.board_size);
	new_game.set_internal_state(this.get_internal_state());
	new_game.player_controllers = [null,null];
	return new_game;
};

Game.prototype.load_board = function(board) {
	var board_arr = board.split(",");

	for(var i = 0; i < board_arr.length; i++) {
		var xy = this.get_xy(i);
		var value = parseInt(board_arr[i]);

		if(isNaN(value)) {
			value = null;
		}

		this.tile(xy.x, xy.y,  value);
	}
	this.advance_board();
	this.next_turn();
};

Game.prototype.board_permutations = function() {
 	return [
 		this.board,
 		this.board_180deg(),
 		this.board_flip_h(),
 		this.board_flip_v()
 	]
};

Game.prototype.board_180deg = function() {
	var b180 = [];
	for(var i = 0; i < this.board.length/2; i++) {
		var op_i = this.board.length - 1 - i;
		b180[i] = this.board[op_i];
		b180[op_i] = this.board[i];
	}

	return b180;
};

Game.prototype.board_flip_h = function() {
	var bfh = [];
	for(var i = 0; i < this.board.length; i++) {
		var xy = this.get_xy(i);
		var x = xy.x;
		var y = xy.y;

		var op_x = y;
		var op_y = x;

		bfh[i] = this.tile(y,x);
		bfh[this.get_index(y,x)] = this.tile(x,y);
	}

	return bfh;
};

Game.prototype.board_flip_v = function() {
	var bfv = [];
	for(var i = 0; i < this.board.length; i++) {
		var xy = this.get_xy(i);
		var x = xy.x;
		var y = xy.y;

		var op_x = this.board_size-1-y;
		var op_y = this.board_size-1-x;

		bfv[i] = this.tile(op_x,op_y);
		bfv[this.get_index(op_x,op_y)] = this.tile(x,y);
	}

	return bfv;
};