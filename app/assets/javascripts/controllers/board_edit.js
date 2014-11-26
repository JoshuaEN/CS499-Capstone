//= require controllers/base

var BoardEditController = function(game, player) {
	BaseController.call(this, game, player);

	this.options = {
		indicate_invalid_moves: true,
		indicate_valid_moves: true
	}
};

BoardEditController.prototype = Object.create(BaseController.prototype);
BoardEditController.prototype.constructor = BoardEditController;

BoardEditController.prototype.draw_board = function(board_element) {

};

BoardEditController.prototype.draw_options = function(options_container) {
	options_container.empty().append("<h2>No Options</h2>");
};

BoardEditController.prototype.your_move = function() {

};

BoardEditController.prototype.grid_clicked = function(index) {
	var xy = this.game.get_xy(index);
	var x = xy.x;
	var y = xy.y;

	var existing = this.game.tile(x, y);
	var newvalue;
	if(existing === null)
		newvalue = 0;
	else if(existing === 0)
		newvalue = 1;
	else
		newvalue = null;

	this.game.tile(x,y,newvalue);
};

BoardEditController.prototype.destroy = function() {
	
};