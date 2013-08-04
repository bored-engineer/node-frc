// Require the udp module to send messages
var dgram = require("dgram");

// Require the util module
var util = require("./util");

// Require the crc32 method becuase I suck at writing crc code for binary data
var crc32 = require('buffer-crc32');

// Variables used in loops
var i, j;

/** 
 * DriverStation class
 * Sets up the IPs given an team #
 * @name DriverStation
 * @class DriverStation
 * @classdesc This is the main class for simulating a driver station
 * @constructor
 */
function DriverStation(team) {

	// Save the tea, nu,ber
	this._team = team;

	// Get an ip given a team
	this._ips = util.getIP(team);

}

/**
 * Enum for different modes
 * @readonly
 * @enum {Integer}
 */
DriverStation.MODE = {
	TELEOP: 1,
	AUTONOMOUS: 2,
	TEST: 3
};

/**
 * Enum for different alliances
 * @readonly
 * @enum {Boolean}
 */
DriverStation.ALLIANCE = {
	RED: true,
	BLUE: false
};

/**
 * Enum for different positions
 * @readonly
 * @enum {Integer}
 */
DriverStation.POSITION = {
	1: 0,
	2: 1,
	3: 2
};

/**
 * The Packet Index, starting at 0
 * @private
 * @type {Integer}
 */
DriverStation.prototype._packetIndex = 0;

/**
 * Attempt to connect to the cRIO
 * @name DriverStation#connect
 * @function
 */
DriverStation.prototype.connect = function() {

	// Create a socket for controlling the robot
	this._socket = dgram.createSocket('udp4');

	// Set callback to handle new message
	this._socket.on("message", callback);

	// Bind to the correct port
	this._socket.bind(1150);

};

/**
 * Default to values
 * @private
 * @type {Object}
 */
DriverStation.prototype._to = {
	digitalIn: [false, false, false, false, false, false, false, false],
	control: [
		// Unknown
		false,
		// Unknown
		true,
		// Enabled / Disabled
		false,
		// Autonomous Mode
		false,
		// Unknown
		false,
		// Unknown
		true,
		// Test Mode
		false,
		// Unknown
		false
	],
	analog: [0, 0, 0, 0],
	joysticks: [
		{
			axes: [0, 0, 0, 0, 0, 0],
			buttons: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
		},
		{
			axes: [0, 0, 0, 0, 0, 0],
			buttons: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
		},
		{
			axes: [0, 0, 0, 0, 0, 0],
			buttons: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
		},
		{
			axes: [0, 0, 0, 0, 0, 0],
			buttons: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
		}
	]
};

/**
 * Default from values
 * @private
 * @type {Object}
 */
DriverStation.prototype._from = {
	control: [
		// Unknown
		false,
		// Unknown
		true,
		// Enabled / Disabled
		false,
		// Autonomous Mode
		false,
		// Unknown
		false,
		// Unknown
		true,
		// Test Mode
		false,
		// Unknown
		false
	],
	mac: "00:00:00:00:00",
	battery: 0
};

/**
 * Emergency stop the robot
 * @name DriverStation#stop
 */
DriverStation.prototype.__defineSetter__("stop", function(value) {

	// Flip the estop bit
	this._to.control[1] = value ? true : false;

});

/**
 * If the robot it emergency stoped
 * @name DriverStation#stoped
 */
DriverStation.prototype.__defineGetter__("stoped", function() {

	// Get the control bit
	return this._from.control[1];

});

/**
 * Set the enable/disable state of the robot
 * @name DriverStation#enable
 */
DriverStation.prototype.__defineSetter__("enable", function(value) {

	// Flip the control bit
	this._to.control[2] = value ? true : false;

});

/**
 * Get the enable/disable state of the robot
 * @name DriverStation#enabled
 */
DriverStation.prototype.__defineGetter__("enabled", function() {

	// Get the enabled bit
	return this._from.control[2];

});

/**
 * Set the mode of the robot
 * @name DriverStation#mode
 */
DriverStation.prototype.__defineSetter__("mode", function(value) {

	// Flip the bits if needed
	this._to.control[3] = (value === DriverStation.MODE.AUTONOMOUS);
	this._to.control[6] = (value === DriverStation.MODE.TEST);

});

/**
 * Get the mode of the robot
 * @name DriverStation#mode
 */
DriverStation.prototype.__defineGetter__("mode", function() {

	// If autonomous
	if (this._from.control[3] === true) return DriverStation.MODE.AUTONOMOUS;

	// If test
	if (this._from.control[6] === true) return DriverStation.MODE.TEST;

	// Default to teleop
	return DriverStation.MODE.TELEOP;

});

/**
 * Get the battery level of the robot
 * @name DriverStation#battery
 */
DriverStation.prototype.__defineGetter__("battery", function() {

	// Return the battery 
	return this._from.battery;

});

/**
 * Get the mac address of the robot
 * @name DriverStation#cRIO_MAC
 */
DriverStation.prototype.__defineGetter__("cRIO_MAC", function() {

	// Return the cRIO MAC address
	return this._from.cRIO_MAC;

});

/**
 * Set the alliance of the robot
 * @name DriverStation#alliance
 */
DriverStation.prototype.__defineSetter__("alliance", function(value) {

	// Set the value
	this._to.alliance = value ? "R" : "B";

});

/**
 * Set the position of the robot
 * @name DriverStation#position
 */
DriverStation.prototype.__defineSetter__("position", function(value) {

	// If invalid default to 0
	if ([0, 1, 2].indexOf(value) === -1) { value = 0; }

	// Save it
	this._to.position = value;

});

/**
 * Set the digital inputs of the robot
 * @name DriverStation#digitalIn
 */
DriverStation.prototype.__defineGetter__("digitalIn", function() { return []; });

// DIO setter
function digitalInSetter(index, value) {

	// Set the index to the value
	this._to.digitalIn[index] = value ? true : false;

}

// Loop all 8
for (i = 0; i < 8; i++) {

	// Save the setter
	DriverStation.prototype.digitalIn.__defineSetter__(i + 1, digitalInSetter.bind(DriverStation.prototype, i));

}

/**
 * Set the analog inputs of the robot
 * @name DriverStation#analog
 */
DriverStation.prototype.__defineGetter__("analog", function() { return []; });

// analog setter
function analogSetter(index, value) {

	// Fix the values
	if (value > 1023) { value = 1023; }
	if (value < 0) { value = 0; }

	// Set the index to the value
	this._to.analog[index] = value;

}

// Loop each analog
for (i = 0; i < 4; i++) {

	// Define a setter for each
	DriverStation.prototype.analog.__defineSetter__(i + 1, analogSetter.bind(DriverStation.prototype, i));

}

// Create new array for joystick
DriverStation.prototype.__defineGetter("joysticks", function() {

	// Return our empty array
	return [
		{ axes: [], buttons: [] },
		{ axes: [], buttons: [] },
		{ axes: [], buttons: [] },
		{ axes: [], buttons: [] }
	];

});

// Axis setteer
function axisSetter(joystick, axis, value) {

	// Scale it
	if(num > 127){ value = 127; }
	if(num < -128){ value = -128; }

	// Set the value
	_.to.joysticks[joystick].axes[axis] = value;

}

// Button setter
function buttonSetter(joystick, axis, value) {

	// Set the value
	_.to.joysticks[joystick].buttons[axis] = value ? true : false;

}

// Loop each 4 joysticks
for (i = 0; i < 4; i++) {

	// Loop each 6 axes
	for (j = 0; j < 6; j++) {

		// Add each
		DriverStation.prototype.joysticks[i + 1].axes.__defineSetter__(j + 1, axisSetter.bind(DriverStation.prototype, i, j));

	}

	// Loop each 16 buttons
	for (j = 0; j < 16; j++) {

		// Add each
		DriverStation.prototype.joysticks[i + 1].buttons.__defineSetter__(j + 1, buttonsSetter.bind(DriverStation.prototype, i, j));

	}

}

/**
 * Send a new update to the cRIO
 * @name DriverStation#_send
 * @private
 * @function
 */
DriverStation.prototype._send = function() {

	// Create a buffer of data to send
	var buf = new Buffer(1024);

	// Fill with 0s
	buf.fill(0);

	// Set the packetIndex
	buf.writeUInt16BE(this._packetIndex++, 0);

	// If going to overflow next loop, reset it
	if (this._packetIndex == 65536) { this._packetIndex = 0; }

	// Set the control byte
	buf.writeUInt8(buildBinary(this._to.control), 2);

	// Set the digitalInput byte
	buf.writeUInt8(buildBinary(
		this._to.digitalIn[8],
		this._to.digitalIn[7],
		this._to.digitalIn[6],
		this._to.digitalIn[5],
		this._to.digitalIn[4],
		this._to.digitalIn[3],
		this._to.digitalIn[2],
		this._to.digitalIn[1]
	), 3);

	// Set the team number
	buf.writeUInt16BE(this._team, 4);

	// Set the alliance
	buf.write(this._to.alliance, 6);

	// Set the position
	buf.write(this._to.position, 7);

	// Save joysticks 0's axes
	buf.writeInt8(options.joysticks[0].axes[0], 8);
	buf.writeInt8(options.joysticks[0].axes[1], 9);
	buf.writeInt8(options.joysticks[0].axes[2], 10);
	buf.writeInt8(options.joysticks[0].axes[3], 11);
	buf.writeInt8(options.joysticks[0].axes[4], 12);
	buf.writeInt8(options.joysticks[0].axes[5], 13);

	// Set the joysticks 0's 0-7 buttons
	buf.writeUInt8(buildBinary(
		this._to.joysticks[0].buttons[0],
		this._to.joysticks[0].buttons[1],
		this._to.joysticks[0].buttons[2],
		this._to.joysticks[0].buttons[3],
		this._to.joysticks[0].buttons[4],
		this._to.joysticks[0].buttons[5],
		this._to.joysticks[0].buttons[6],
		this._to.joysticks[0].buttons[7]
	), 14);

	// Set the joysticks 0's 8-15 buttons
	buf.writeUInt8(buildBinary(
		this._to.joysticks[0].buttons[8],
		this._to.joysticks[0].buttons[9],
		this._to.joysticks[0].buttons[10],
		this._to.joysticks[0].buttons[11],
		this._to.joysticks[0].buttons[12],
		this._to.joysticks[0].buttons[13],
		this._to.joysticks[0].buttons[14],
		this._to.joysticks[0].buttons[15]
	), 15);

	// Save joysticks 1's axes
	buf.writeInt8(options.joysticks[1].axes[0], 16);
	buf.writeInt8(options.joysticks[1].axes[1], 17);
	buf.writeInt8(options.joysticks[1].axes[2], 18);
	buf.writeInt8(options.joysticks[1].axes[3], 19);
	buf.writeInt8(options.joysticks[1].axes[4], 20);
	buf.writeInt8(options.joysticks[1].axes[5], 21);

	// Set the joysticks 1's 0-7 buttons
	buf.writeUInt8(buildBinary(
		this._to.joysticks[1].buttons[0],
		this._to.joysticks[1].buttons[1],
		this._to.joysticks[1].buttons[2],
		this._to.joysticks[1].buttons[3],
		this._to.joysticks[1].buttons[4],
		this._to.joysticks[1].buttons[5],
		this._to.joysticks[1].buttons[6],
		this._to.joysticks[1].buttons[7]
	), 22);

	// Set the joysticks 1's 8-15 buttons
	buf.writeUInt8(buildBinary(
		this._to.joysticks[1].buttons[8],
		this._to.joysticks[1].buttons[9],
		this._to.joysticks[1].buttons[10],
		this._to.joysticks[1].buttons[11],
		this._to.joysticks[1].buttons[12],
		this._to.joysticks[1].buttons[13],
		this._to.joysticks[1].buttons[14],
		this._to.joysticks[1].buttons[15]
	), 23);

	// Save joysticks 2's axes
	buf.writeInt8(options.joysticks[2].axes[0], 24);
	buf.writeInt8(options.joysticks[2].axes[1], 25);
	buf.writeInt8(options.joysticks[2].axes[2], 26);
	buf.writeInt8(options.joysticks[2].axes[3], 27);
	buf.writeInt8(options.joysticks[2].axes[4], 28);
	buf.writeInt8(options.joysticks[2].axes[5], 29);

	// Set the joysticks 2's 0-7 buttons
	buf.writeUInt8(buildBinary(
		this._to.joysticks[2].buttons[0],
		this._to.joysticks[2].buttons[1],
		this._to.joysticks[2].buttons[2],
		this._to.joysticks[2].buttons[3],
		this._to.joysticks[2].buttons[4],
		this._to.joysticks[2].buttons[5],
		this._to.joysticks[2].buttons[6],
		this._to.joysticks[2].buttons[7]
	), 30);

	// Set the joysticks 2's 8-15 buttons
	buf.writeUInt8(buildBinary(
		this._to.joysticks[2].buttons[8],
		this._to.joysticks[2].buttons[9],
		this._to.joysticks[2].buttons[10],
		this._to.joysticks[2].buttons[11],
		this._to.joysticks[2].buttons[12],
		this._to.joysticks[2].buttons[13],
		this._to.joysticks[2].buttons[14],
		this._to.joysticks[2].buttons[15]
	), 31);

	// Save joysticks 3's axes
	buf.writeInt8(options.joysticks[3].axes[0], 32);
	buf.writeInt8(options.joysticks[3].axes[1], 33);
	buf.writeInt8(options.joysticks[3].axes[2], 34);
	buf.writeInt8(options.joysticks[3].axes[3], 35);
	buf.writeInt8(options.joysticks[3].axes[4], 36);
	buf.writeInt8(options.joysticks[3].axes[5], 37);

	// Set the joysticks 3's 0-7 buttons
	buf.writeUInt8(buildBinary(
		this._to.joysticks[2].buttons[0],
		this._to.joysticks[2].buttons[1],
		this._to.joysticks[2].buttons[2],
		this._to.joysticks[2].buttons[3],
		this._to.joysticks[2].buttons[4],
		this._to.joysticks[2].buttons[5],
		this._to.joysticks[2].buttons[6],
		this._to.joysticks[2].buttons[7]
	), 38);

	// Set the joysticks 3's 8-15 buttons
	buf.writeUInt8(buildBinary(
		this._to.joysticks[3].buttons[8],
		this._to.joysticks[3].buttons[9],
		this._to.joysticks[3].buttons[10],
		this._to.joysticks[3].buttons[11],
		this._to.joysticks[3].buttons[12],
		this._to.joysticks[3].buttons[13],
		this._to.joysticks[3].buttons[14],
		this._to.joysticks[3].buttons[15]
	), 39);

	// Set the analog values
	buf.writeUInt16BE(options.analog[0], 40);
	buf.writeUInt16BE(options.analog[1], 42);
	buf.writeUInt16BE(options.analog[2], 44);
	buf.writeUInt16BE(options.analog[3], 46);

	// Unknown Values
	buf.writeUInt8(48, 72);
	buf.writeUInt8(50, 73);

	// Set the Driver Station version
	buf.write("02121300", 74);

	// Set the crc and add it to the end
	buf.writeUInt32BE(crc32.unsigned(buf), 1020);

	// Send a control packet
	this._socket.send(buf, 0, 1024, 1110, this._ips["cRIO"]);

};

// Export the FRC function
module.exports = DriverStation;