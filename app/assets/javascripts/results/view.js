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
		fetch_results: function() {
			var self = this;
			$.get('/rajson', function(data) {self.fetch_results_callback(data);});
		},
		fetch_results_callback: function(data) {
			this.results_data = data.data;
			this.process_results();
		},
		process_results: function() {
			var elm = $("#listings").empty();
			var html_str = "<table><tbody>";
			for(var i = 0; i < this.results_data.length; i++) {
				var r = this.results_data[i];
				html_str += '<tr style="text-align:left;"><td colspan="6">' + this.diff_controllers(r.p0, r.p1) + '</td></tr>';
				html_str += "<tr>" +
					"<th>" + r.p0 + " vs. " + r.p1 + " (" + r.board_size + ")" + "</th>" +
					"<td>" + r.games_played + " (" + r.unique_final_baord_states + ")" + "</td>" +
					"<th>" + Math.round(r.wins["0"].wr) + "% (" + r.wins["0"].number + ")</th><th>" + Math.round(r.wins["1"].wr) + "% (" + r.wins["1"].number + ")</th><th>" + Math.round(r.wins.nil.wr) + "% (" + r.wins.nil.number + ")</th>" +
					"<th>" + (r.p0_disks - r.p1_disks) +  " (" + r.p0_disks + ":" + r.p1_disks + ")" + "</th>" +
				"</tr>";
			}

			elm.append(html_str + "</tbody></table>");
		},
		diff_controllers: function(id1, id2) {
			var str = '';
			var c1 = this.controller_list[id1];
			var c2 = this.controller_list[id2];

			if(c1.name != c2.name)
				str += c1.name + '/' + c2.name;
			else
				str += c1.name;

			if(c1.version != c2.version)
				str += ' (' + c1.version + '/' + c2.version + ')';
			else
				str += ' (' + c1.version + ')';

			var checked = [];

			var major = ["Depth"];

			str += ' |';

			for(var v in major) {
				v = major[v];
				if(c1.hash[v] != c2.hash[v])
					str += '<strong> ' + v + ': ' + c1.hash[v] + ' / ' + c2.hash[v] + '</strong>';
				else
					str += ' <span class="text-muted">' + v + ': <strong>' + c1.hash[v]  + '</strong></span>';

				str += ', ';

				checked.push(v);
			}

			str += ' |';

			for(var v in c1.hash) {
				if(checked.indexOf(v) != -1)
					continue;

				if(c1.hash[v] != c2.hash[v])
					str += '<strong> ' + v + ': ' + c1.hash[v] + ' / ' + c2.hash[v] + '</strong>';
				else
					str += ' <span class="text-muted">' + v + ': <strong>' + c1.hash[v] + '</strong></span>';

				str += ', ';

				checked.push(v);
			}

			for(var v in c2.hash) {
				if(checked.indexOf(v) != -1)
					continue;

				if(c1.hash[v] != c2.hash[v])
					str += '<strong> ' + v + ': ' + c1.hash[v] + ' / ' + c2.hash[v] + '</strong>';
				else
					str += ' <span class="text-muted">' + v + ': <strong>' + c1.hash[v] + '</strong></span>';

				str += ', ';
			}

			return str;

		},
		fetch_controller_list: function() {
			var self = this;
			$.get('/cljson', function(data) {self.fetch_controller_list_callback(data);})
		},
		fetch_controller_list_callback: function(data) {
			this.controller_list_data = data;
			this.process_controller_list();
			this.fetch_results();
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
				controller.hash = {};

				var options = controller_info[4].split(";");
				for(var v in options) {
					var option_info = options[v].split(":");
					var name = option_info.shift();
					var value = option_info.join(":");
					controller.options.push({
						name: name,
						value: value
					});
					controller.hash[name] = value;
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