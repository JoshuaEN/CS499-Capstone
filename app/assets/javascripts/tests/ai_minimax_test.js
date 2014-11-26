//= require tests/test_helpers.js

if(typeof this.CS499 === "undefined")
	this.CS499 = {};

if(typeof this.CS499.tests === "undefined")
	this.CS499.tests = {};

(function() {
	this.ai_minimax = {
		h: window.CS499.tests.h,
		init: [
			(function(options) {
				var game = new Game(8);
				var p0 = new AIMinimaxController(game, 0, 4, options);
				var p1 = new AIMinimaxController(game, 1, 4, options);
				game.player_controllers = [p0, p1];

				return {game: game, players: [p0, p1]};
			})
		],
		tests: [
			(function() {
				var data = this.init[0]();

				data.game.start();

				data.players[0].pause = false;
				data.players[1].pause = false;
				
				var general_tests = function(minimax_func_key) {

					console.info("Using minimax function: " + minimax_func_key);

					this.h.assert(data.players[0][minimax_func_key](data.game, 1, true).weight === 3, "Weight is logical at 1 depth");
					this.h.assert(data.players[0][minimax_func_key](data.game, 2, true).weight === 0, "Weight is logical at 2 depth");

					for(var i = 0; i < data.game.board.length; i++) {
						data.game.board[i] = null;
					}

					data.game.tile(0,0,1);

					data.game.tile(0,1,0);
					data.game.tile(1,0,0);
					data.game.tile(1,1,0);

					data.game.next_turn();

					this.h.assert(data.players[1][minimax_func_key](data.game, 1, true).weight === 1, "Turn advancement over skipped turn works at 1 depth.");
					this.h.assert(data.players[1][minimax_func_key](data.game, 2, true).weight === Infinity, "Turn advancement over skipped turn works at 2 depth.");


					data.game.tile(0,0,0);
					data.game.next_turn();
					this.h.assert(data.players[0][minimax_func_key](data.game, 2, true).weight === Infinity, "Complete victory state correctly detected");
					this.h.assert(data.players[1][minimax_func_key](data.game, 2, true).weight === Number.NEGATIVE_INFINITY, "Complete defeat state correctly detected");
				};

				general_tests.call(this, "minimax");
				//general_tests.call(this, "minimax_async");
			})
		],
		run: function(id) {
			if(id === undefined)
				this.runall();
			else
				this.runone(id);
		},
		runone: function(id) {
			this.tests[id].call(this);
		},
		runall: function() {
			for(var i = 0; i < this.tests.length; i++) {
				this.runone(i);
			}
		}
	};
}).call(this.CS499.tests);