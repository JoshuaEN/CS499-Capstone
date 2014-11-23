$(function() {
	game.show_valid_moves = true;
	game.register_player_controller("AI [Minimax]", AIMinimaxController);
	game.register_player_controller("AI [First Valid Option]", AIFirstController);
	game.register_player_controller("Human Player", HumanController);
	game.start();
});