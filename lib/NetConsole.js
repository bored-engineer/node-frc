// Require the util for the inherits method
var util = require("util");

// Require the udp module
var dgram = require("dgram");

// Require the udp module
var events = require("events");

// Global constructor
function NetConsole(){

	// Call the EventEmitter super method
	events.EventEmitter.call(this);

	// Setup the server
	var server = dgram.createSocket("udp4");

	// Listen on the netconsole port
	server.bind(6666);

	// On new message
	function message(msg){

		//Emit data
		this.emit("data", msg);

	}

	// On new message
	server.on("message", message.bind(this));

	// Inherit event methods
	util.inherits(this, events.EventEmitter);

}

// Export the FRC function
module.exports = NetConsole;