if(typeof this.CS499 === "undefined")
	this.CS499 = {};

if(typeof this.CS499.tests === "undefined")
	this.CS499.tests = {};

(function() {
	this.h = {
		assert: function(result, message) {
			if(!result)
				console.log("%c" + message, "color:red;");
			else
				console.log("%c" + message, "color:green;");

		}
	};
}).call(this.CS499.tests);