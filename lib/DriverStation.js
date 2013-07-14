// Require the util for the inherits method
var util = require("util");

// Require the udp module
var dgram = require("dgram");

// Require underscore because I'm lazy
var _ = require('underscore');

// Require the crc32 method becuase I suck at writing crc code for binary data
var crc32 = require('buffer-crc32');

// Parse a binary byte
function parseBinary(buf, index) {

	// Get the result as an integer
	var num = buf.readUInt8(index);

	// Convert to a binary string
	var binary = num.toString(2);

	// For each value
	_.times( 8 - binary.length, function() { binary = "0" + binary; });

	// Save the result
	var results = {};

	// Loop each 8
	_.times(8, function(n) {

		// Save the result
		results[n] = binary.substring( n + 1, n ) == "1" ? true : false;

	});

	// Return the result
	return results;

}

// Create a binary value
function buildBinary(binary1, binary2, binary3, binary4, binary5, binary6, binary7, binary8) {

	// Build a empty binary string
	var binary = "";

	// Add each value
	binary += binary1 ? "1" : "0";
	binary += binary2 ? "1" : "0";
	binary += binary3 ? "1" : "0";
	binary += binary4 ? "1" : "0";
	binary += binary5 ? "1" : "0";
	binary += binary6 ? "1" : "0";
	binary += binary7 ? "1" : "0";
	binary += binary8 ? "1" : "0";

	// Return it as a Unsigned 8 bit integer
	return parseInt(binary, 2);

}


// Global constructor
function DriverStation(team) {

	// Add the callbacks
	var callbacks = {};

	// Start packetIndex at 0
	var packetIndex = 0;

	// Create a socket for controlling the robot
	var socket = dgram.createSocket('udp4');

	// On callback message
	function callback(buf) {

		// Get the index 
		var index = buf.readUInt16BE(30);

		// Get the control data
		var control = parseBinary(buf, 0);

		// Default the mode to teleop
		var mode = 0;

		// If autonomous
		if(control[3]){ mode = 1; }

		// If test
		if(control[6]){ mode = 2; }

		// Call the success callback
		callbacks[index]({
			enabled: control[2],
			mode: mode,
			battery: parseFloat(buf.toString('hex',1,2) + "." + buf.toString('hex',2,3)),
			mac: buf.toString('hex',10,16).toUpperCase(),
			team: parseInt(buf.readUInt16BE(8))
		});

	}

	// On a new udp message
	socket.on("message", callback);

	// Send the values
	this.sendDS = function sendDS(options, success) {

		// Delete the original
		delete callbacks[packetIndex];

		// Save the callback
		callbacks[packetIndex] = success;

		// Mode: verify it is within the range
		options.mode = ([0, 1, 2].indexOf(options.mode) == -1) ? 0 : (options.mode || 0);

		// Make it valid
		options.enabled = options.enabled ? true : false;

		// Loop all 8
		_.times(8, function(x){

			// Get the n
			var n = ++x;

			// Verify it
			options.digitalIn[n] = options.digitalIn[n] ? true : false;

		});

		// Change alliance to R/B
		options.alliance = options.alliance ? "R" : "B";

		// If it has a position
		options.position = ([1, 2, 3].indexOf(options.position) == -1) ? "1" : ((options.position + "") || "1");

		// Reset to {}
		options.joystick = options.joystick || {};

		// Loop all 4 joystick
		_.times(4, function(x){

			// Get the real n
			var n = ++x;

			// Set to {} if needed
			options.joystick[n] = options.joystick[n] || {};

			// If does not have an axis
			options.joystick[n].axes = options.joystick[n].axes || {};

			// Loop each 6 axes
			_.times(6, function(y){

				// Get the real m
				var m = ++y;

				// Reset to 0 if undefined
				options.joystick[n].axes[m] = options.joystick[n].axes[m] || 0;

				// Get the number
				var num = options.joystick[n].axes[m];

				// Scale it
				if(num > 127){ options.joystick[n].axes[m] = 127; }
				if(num < -128){ options.joystick[n].axes[m] = -128; }

			});

			// If it has an buttons, or set to {}
			options.joystick[n].buttons = options.joystick[n].buttons || {}

			// Loop each 6 axes
			_.times(16, function(y){

				// Get the real m
				var m = ++y;

				// Make it true or false
				options.joystick[n].buttons[m] = options.joystick[n].buttons[m] ? true : false;

			});

		});

		// Reset to {} if needed
		options.analog = options.analog || {};

		// Loop each 4 analog values
		_.times(4, function(x){

			// Get the real n
			var n = ++x;

			// Reset to 0 if needed
			options.analog[n] = options.analog[n] || 0;

			// Scale it
			if( options.analog[ n + 1 ] > 1023 ){ options.analog[ n + 1 ] = 1023; }
			if( options.analog[ n + 1 ] < 0 ){ options.analog[ n + 1 ] = 0; }

		});

		// Create a buffer of data to send
		var buf = new Buffer(1024);

		// Fill with 0s
		buf.fill(0);

		// Set the packetIndex
		buf.writeUInt16BE(packetIndex++, 0);

		// If going to overflow next loop, reset it
		if(packetIndex == 65536){ packetIndex = 0; }

		// Set the control byte
		buf.writeUInt8(buildBinary(false, true, options.enabled, options.mode == 1, false, true, options.mode == 2, false), 2);

		// Set the digitalInput byte
		buf.writeUInt8(buildBinary(
			options.digitalIn["8"],
			options.digitalIn["7"],
			options.digitalIn["6"],
			options.digitalIn["5"],
			options.digitalIn["4"],
			options.digitalIn["3"],
			options.digitalIn["2"],
			options.digitalIn["1"]
		), 3);

		// Set the team number
		buf.writeUInt16BE(team, 4);

		// Set the alliance
		buf.write(options.alliance, 6);

		// Set the position
		buf.write(options.position, 7);

		// The starting position of the byte
		var j = 8;

		// Loop all 4 joystick
		_.times(4, function(x) {

			// Get the real n
			var n = ++x;

			// Loop all possible 6 axes
			_.times(6, function(y) {

				// Get the real m
				var m = ++y;

				// Set the byte
				buf.writeInt8(options.joystick[n].axes[m], j++);

			});

			// Set the joystick buttons 1-8
			buf.writeUInt8(buildBinary(
				options.joystick[n].buttons["1"],
				options.joystick[n].buttons["2"],
				options.joystick[n].buttons["3"],
				options.joystick[n].buttons["4"],
				options.joystick[n].buttons["5"],
				options.joystick[n].buttons["6"],
				options.joystick[n].buttons["7"],
				options.joystick[n].buttons["8"]
			), j++);

			// Set the joystick buttons 9-16
			buf.writeUInt8(buildBinary(
				options.joystick[n].buttons["9"],
				options.joystick[n].buttons["10"],
				options.joystick[n].buttons["11"],
				options.joystick[n].buttons["12"],
				options.joystick[n].buttons["13"],
				options.joystick[n].buttons["14"],
				options.joystick[n].buttons["15"],
				options.joystick[n].buttons["16"]
			), j++);

		});

		// Set the analog values
		buf.writeUInt16BE(options.analog["1"], 40);
		buf.writeUInt16BE(options.analog["2"], 42);
		buf.writeUInt16BE(options.analog["3"], 44);
		buf.writeUInt16BE(options.analog["4"], 46);

		// Unknown Values
		buf.writeUInt8(48, 72);
		buf.writeUInt8(50, 73);

		// Set the Driver Station version
		buf.write("02121300", 74);

		// Set the crc and add it to the end
		buf.writeUInt32BE(crc32.unsigned(buf), 1020);

		// Send a control packet
		socket.send(buf, 0, 1024, 1110, "10." + parseInt(team / 100) + "." + team % 100 + ".2");

	}

	// Bind to the correct port
	socket.bind(1150);

}

// Export the FRC function
module.exports = DriverStation;