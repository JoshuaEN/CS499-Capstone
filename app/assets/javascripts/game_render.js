//= require game

"use strict";

var GameRender = function(board_size) {
	var self = this;



	this.board_size = board_size;

	this.player_strings = {
		0: {
			name: "Player 1",
			color: "Dark"
		},
		1: {
			name: "Player 2",
			color: "Light"
		},
		null: {
			name: "Nobody",
			color: "Gray"
		}
	}

	this.colors = {
		invalid: '#FFC8C8',
		valid: '#C8E8C8'
	}

	this.supports_visuals = true;

	// List of available controllers for players.
	this.available_player_controllers = [];

	this.setup_renderer();
	this.setup_controls();
	this.setup_player_selectors();

	this.game = new Game(board_size, {
		fire_events: true,
		game_renderer: this,
		on_event: (function(a, b) {
			self.handle_events(a,b);
		})
	});

	this.inform("Game Initialized");
	return this;
};

GameRender.prototype.setup_renderer = function() {
	this.board_elm = $("#game_board");
	this.board_cell_width = 100/this.board_size;
	this.content_elm = $("#content");
	this.main_elm = $("#main");
	this.inform_elm = $("#sidebar");
	this.current_player_elm = $("#current_player");
	this.waiting_elm = $("#waiting");
	this.form_elms = $(":input");

	// Prevent the board from growing too large.
	this.main_elm.css("max-width", (this.board_size*70.5) + "px");

	this.inform_elm.css("width", 'calc(100% - ' + ((this.board_size*70.5)+22) + "px");

	this.board_grids = [];
	this.board_grid_disks = [];
	this.board_grid_text = [];

	var self = this;

	for(var i = 0; i < this.board_size*this.board_size; i++) {
		var grid_disk_elm = $("<div>", {class: "disk disk_null"});
		var grid_text_elm = $("<span>", {class: "grid-text"});

		var grid_elm = $("<div>", 
		{
			class: "grid", 
			style: 'width:calc('+this.board_cell_width+'% - 10px);padding-bottom:calc('+this.board_cell_width+'% - 10px)',
			"data-grid-index": i,
			"data-grid": "true"
		}).append(grid_disk_elm).append(grid_text_elm).on('click', function(ev) {
			self.on_grid_click(this, ev);
		});

		this.board_grids.push(grid_elm);
		this.board_grid_disks.push(grid_disk_elm);
		this.board_grid_text.push(grid_text_elm);

		this.board_elm.append(grid_elm);
	}

	this.grid_elements = $("[data-grid=true]");
	this.grid_text_elements = $("[data-grid=true] > span.grid-text");
};
GameRender.prototype.setup_player_selectors = function() {
	this.player_selectors_elm = $("[data-player-selector]");

	var self = this;
	this.player_selectors_elm.on('change', function(ev) {
		var $this = $(this);
		var player = parseInt($this.attr('data-player-selector'));
		self.game.player_controllers[player] = new self.available_player_controllers[parseInt($this.val())](self.game, player);
		self.game.player_controllers[player].draw_options($('[data-player-options="'+player+'"]'));

		if(self.game.game_state == "started") {
			self.game.next_player();
			self.game.next_turn();
		}
	});
};
GameRender.prototype.setup_controls = function() {
	var self = this;
	$("#game_action_reset").on('click', function() {
		self.restart();
		return false;
	});

	$(document).on('keyup', function(ev) {
		self.on_keypress(ev);
	});
};

GameRender.prototype.register_player_controller = function(name, func) {
	var index = this.available_player_controllers.push(func)-1;
	this.player_selectors_elm.append(
		$("<option>", {
			"value": index
		}).text(name)
	)

	// If this is the first player controller registered, setup.
	if(index === 0)
		this.player_selectors_elm.trigger("change");

	return this;
};


GameRender.prototype.start = function() {
	this.game.set_game_state("start");
};

GameRender.prototype.reset = function() {
	this.game.reset();
};

GameRender.prototype.restart = function() {
	this.game.restart();
};

GameRender.prototype.clean_grid = function() {
	this.grid_elements.attr("class", "grid").css("background", "");
	this.grid_text_elements.empty();
};

GameRender.prototype.draw = function() {
	this.clean_grid();

	this.highlight_valid_moves();

	// When we're waiting the active player controller doesn't have up to date information.
	if(this.game.active_player_controller && this.is_waiting == false)
		this.game.active_player_controller.draw_board();

};

GameRender.prototype.draw_turn_info = function() {
	this.current_player_elm.text("It's " + this.player_strings[this.game.active_player].color + "'s Turn");
};

GameRender.prototype.highlight_valid_moves = function() {
	if(!this.show_valid_moves)
		return;

	for(var i = 0; i < this.game.valid_moves.length; i++) {
		this.board_grids[this.game.valid_moves[i]].css("background", "#C1E2C1");
	}
};

GameRender.prototype.on_grid_click = function(elm, ev) {

	if(this.is_waiting)
		return;

	var index = parseInt($(elm).attr('data-grid-index'));

	if(this.game.active_player_controller)
		this.game.active_player_controller.grid_clicked(index);

	return;
	var xy = this.get_xy(index);
	var x = xy.x;
	var y = xy.y;
	var ours = 0;
	var color = 'gray';
	var counter = 0;
	

	this.clean_grid();

	if(this.tile(x,y) === null) {
		
		var count_func = (function() {
			counter += 1;
		});

		this.explore_directions(x,y,ours,count_func,this.highlight_tile);
	}

	if(counter > 0)
		color = 'yellow';

	this.board_grids[this.get_index(x,y)].css('background', color);
}

GameRender.prototype.highlight_tile = function(x,y,disk,ours) {
	var index = this.get_index(x,y);

	if(!this.check_index(index))
		return;

	var color = '';

	if(disk === undefined) {
		color = 'red';
	} else if(disk === null) {
		color = 'white';
	} else if(disk === ours) {
		color = 'green';
	} else {
		color = 'pink';
	}

	this.board_grids[index].css('background', color);
};

GameRender.prototype.on_keypress = function(ev) {
	if(this.is_waiting)
		return;

	// Esc
	if(ev.keyCode == 27) {
		this.restart();
		return;
	}
	if(ev.keyCode == 13 && this.game.active_player_controller)
		this.game.active_player_controller.keypress(ev);
};

GameRender.prototype.inform = function(message, type) {
	this.inform_elm.append('<p>' + message + '</p>');
};

GameRender.prototype.handle_events = function(eventName, data) {
	if(eventName == 'game.diskplaced') {

	} else if(eventName == 'game.statechange') {
		if(data.after == "deadlock")
			this.draw();
	} else if(eventName == 'game.boardadvance') {
		this.draw_turn_info();
	} else if(eventName == 'game.turnadvance') {// || eventName == "game.player.waitforkey") {
		this.draw();
	} else if(eventName == 'game.move.invalid') {
		this.board_grids[data.index].effect("highlight", {color: this.colors.invalid});
	} else if(eventName == 'game.tilechanged') {
		this.board_grid_disks[data.index].attr('class', 'disk disk_'+data.value);
	} else if(eventName == 'game.player.calculated') {
		this.waiting(false);
		this.draw();
	} else if(eventName == 'game.player.calculating') {
		this.waiting(true);
		this.clean_grid();		
	} else {
		console.log("Unhandled Event: " + eventName);
		console.log(data);
	}
};

GameRender.prototype.waiting = function(waiting) {
	if(waiting) {
		this.is_waiting = true;
		this.waiting_elm.show();
		this.form_elms.prop("disabled", true);
	} else {
		this.is_waiting = false;
		this.waiting_elm.hide();
		this.form_elms.prop("disabled", false);
	}
};