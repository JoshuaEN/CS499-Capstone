(function() {
	this.results_view = {
		init: function() {
			this.select_boxes = $('select[data-controller-picker]');

			this.player_controllers = [null,null];

			var self = this;
			this.select_boxes.on('change', function() {
				$this = $(this);
				var player = parseInt($this.attr('data-controller-picker'));
				var controller_id = parseInt($this.val());
				//self.player_controllers[player] = $this.val();
				var options_elm = $('[data-controller-options=' + player + ']');
				options_elm.empty();

				var options = self.controller_list[controller_id].options;

				for(var i = 0; i < options.length; i++) {
					options_elm.append('<div><span>' + options[i].name + ':</span> <strong>' + options[i].value + '</strong></div>');
				}
			});

			this.fetch_controller_list();
		},
		fetch_match_results: function() {
			var self = this;
			$.get('/rjson', function(data) {self.fetch_match_results_callback(data);});
		},
		fetch_match_results_callback: function(data) {
			this.match_results_data = data;
			this.process_match_results();
		},
		fetch_controller_list: function() {
			var self = this;
			$.get('/cljson', function(data) {self.fetch_controller_list_callback(data);})
		},
		fetch_controller_list_callback: function(data) {
			this.controller_list_data = data;
			this.process_controller_list();
		},
		process_controller_list: function() {
			this.select_boxes.empty().append('<option></option>');

			this.controller_list = {};

			for(var i = 0; i < this.controller_list_data.length; i++) {
				var controller_entry = this.controller_list_data[i];
				var controller_info = controller_entry.controller_ident.split("|");
				var controller = {};
				controller.id = controller_entry.id;
				controller.name = controller_info[0];
				controller.version = controller_info[1];
				controller.options = [];

				var options = controller_info[4].split(";");
				for(var v in options) {
					var option_info = options[v].split(":");
					controller.options.push({
						name: option_info.shift(),
						value: option_info.join(":")
					});
				}

				this.controller_list[controller.id] = controller;
				this.select_boxes.append('<option value="' + controller.id + '">' + controller.id + '. ' + controller.name + ' (' + controller.version + ')</option>');
			}
		}
	};
}).call(this);

$(function() {
	results_view.init();
});