//= require controllers/base

var HumanController = function(game, player) {
	BaseController.call(this, game, player);

	this.options = {
		indicate_invalid_moves: true,
		indicate_valid_moves: true
	}
};

HumanController.prototype = Object.create(BaseController.prototype);
HumanController.prototype.constructor = HumanController;

HumanController.prototype.draw_board = function(board_element) {

};

HumanController.prototype.draw_options = function(options_container) {
	options_container.empty().append("<h2>No Options</h2>");
};

HumanController.prototype.your_move = function() {

};