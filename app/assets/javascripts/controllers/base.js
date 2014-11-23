var BaseController = function(game, player) {
	this.game = game;
	this.player = player;
	this.options = {};
};

BaseController.prototype.draw_board = function() {

};

BaseController.prototype.draw_options = function(options_container) {
	options_container.empty().append("<h2>No Options</h2>");
};

BaseController.prototype.your_move = function() {

};

BaseController.prototype.make_move = function() {

};

BaseController.prototype.grid_clicked = function(index) {

};

BaseController.prototype.grid_clicked = function(index) {
	this.game.move(index);
};

BaseController.prototype.keypress = function(ev) {

};


BaseController.prototype.reset = function() {

};