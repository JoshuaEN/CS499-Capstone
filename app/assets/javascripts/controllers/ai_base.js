//= require controllers/base

var AIBaseController = function(game, player) {
	BaseController.call(this, game, player);

	this.valid_move_weights = null;
	this.best_move_weight = null;
};

AIBaseController.prototype = Object.create(BaseController.prototype);
AIBaseController.prototype.constructor = AIBaseController;


AIBaseController.prototype.draw_board = function() {

};

