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

Game.prototype.explore_directions = function(x,y,ours,on_valid, on_all) {
	var nw = this.explore_direction(x,y,-1,1,ours,on_valid,on_all); 	// North West
	var n = this.explore_direction(x,y,0,1,ours,on_valid,on_all); 		// North
	var ne = this.explore_direction(x,y,1,1,ours,on_valid,on_all); 		// North East
	var e = this.explore_direction(x,y,1,0,ours,on_valid,on_all); 		// East
	var se = this.explore_direction(x,y,1,-1,ours,on_valid,on_all); 	// South East
	var s = this.explore_direction(x,y,0,-1,ours,on_valid,on_all); 		// South
	var sw = this.explore_direction(x,y,-1,-1,ours,on_valid,on_all); 	// South West
	var w = this.explore_direction(x,y,-1,0,ours,on_valid,on_all); 		// West
}

Game.prototype.explore_direction = function(x,y,mod_x, mod_y, ours, on_valid, on_all) {
	var mx = x + mod_x;
	var my = y + mod_y;

	var disk = this.tile(mx, my);

	if(on_all)
		on_all.call(this, mx, my, disk, ours);

	if(disk === undefined || // Out of bounds
		disk === null) // No disk present
		return false; // If we don't encounter our own disk at some point, then there's no gains to be had.

	if(disk === ours) // If we encounter our own disk, then we can gain distance number of disks by placing our piece at the starting location.
		return true;

	var deeper_result = this.explore_direction(mx,my,mod_x,mod_y,ours,on_valid, on_all);
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
}

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

};

Game.prototype.get_internal_state = function() {
	return {
		board: this.board,
		board_size: this.board_size,
		active_player: this.active_player,
		active_player_controller: this.active_player_controller
	}
};

Game.prototype.set_internal_state = function(setter) {

};