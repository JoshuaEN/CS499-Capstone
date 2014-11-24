//= require controllers/base

var AIBaseController = function(game, player) {
	BaseController.call(this, game, player);

	this.valid_move_weights = null;
	this.best_move_weight = null;
};

AIBaseController.prototype = Object.create(BaseController.prototype);
AIBaseController.prototype.constructor = AIBaseController;


AIBaseController.prototype.draw_board = function() {
	if(this.game.game_renderer && this.valid_move_weights) {
		for(var i = 0; i < this.valid_move_weights.length; i++) {
			var index = this.game.valid_moves[i];
			var weight = this.valid_move_weights[i];

			if(index === undefined)
				continue;

			if(this.best_move_weight == weight) {
				if(this.best_move_index !== null && this.best_move_index !== undefined && this.best_move_index !== i)
					this.game.game_renderer.board_grids[index].css("background", '#FFFFB3');
				else
					this.game.game_renderer.board_grids[index].css("background", 'yellow');
			}

			this.game.game_renderer.board_grid_text[index].text(weight);
		}
	}
};

