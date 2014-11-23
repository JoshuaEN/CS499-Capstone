"use strict";

var AIGame = function(board_size) {

	Game.call(this, board_size);
	this.supports_visuals = false;
	return this;
};

AIGame.prototype = Object.create(Game.prototype);
AIGame.prototype.constructor = AIGame;

AIGame.prototype.setup_board = function() {
	var board_mid_top_left = Math.floor(this.board_size / 2)-1;

	this.tile(board_mid_top_left, board_mid_top_left, this.light_disk);
	this.tile(board_mid_top_left+1, board_mid_top_left, this.dark_disk);
	this.tile(board_mid_top_left, board_mid_top_left+1, this.dark_disk);
	this.tile(board_mid_top_left+1, board_mid_top_left+1, this.light_disk);
};
AIGame.prototype.setup_renderer = function() {/*NOP*/};

AIGame.prototype.setup_player_selectors = function() {/*NOP*/};

AIGame.prototype.register_player_controller = function() {/*NOP*/};

AIGame.prototype.setup_controls = function() {/*NOP*/};

AIGame.prototype.get_tile = function(x, y) {
	return this.board[this.get_index(x,y)];
};
AIGame.prototype.set_tile = function(x, y, value) {
	var index = this.get_index(x,y);
	this.board[index] = value;
	return this;
};

AIGame.prototype.start = function() {
	this.active_player = 1;
	this.next_turn();
};

AIGame.prototype.clean_grid = function() {/*NOP*/};

AIGame.prototype.draw = function() {/*NOP*/};

AIGame.prototype.draw_turn_info = function() {/*NOP*/};

AIGame.prototype.highlight_valid_moves = function() {/*NOP*/};

AIGame.prototype.highlight_tile = function() {/*NOP*/};

AIGame.prototype.on_grid_click = function() {/*NOP*/};

AIGame.prototype.inform = function() {/*NOP*/};