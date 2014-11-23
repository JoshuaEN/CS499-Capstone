//= require controllers/base

var AIFirstController = function(game, player) {
	BaseController.call(this, game, player);
};

AIFirstController.prototype = Object.create(BaseController.prototype);
AIFirstController.prototype.constructor = AIFirstController;


AIFirstController.prototype.your_move = function() {
	var self =this;
	setTimeout(function() {self.game.move(self.game.valid_moves[0]);}, 1)
};