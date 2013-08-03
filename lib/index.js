// Require the util for the inherits method
var util = require("util");

// Require the DriverStation function
var DriverStation = require('./DriverStation');

// Require the NetConsole function
var NetConsole = require('./NetConsole');

// The main FRC namespace function
function FRC(options) {

	// If Driver Station enabled
	if(options.DriverStation === true) {

		// Call the driver station constructor
		DriverStation.call(this, options.team);

		// Inherit the driver station methods
		util.inherits(this, DriverStation);

	}

	// If NetConsole enabled
	if(options.NetConsole === true) {

		// Call the NetConsole constructor
		NetConsole.call(this);

		// Inherit the NetConsole methods
		util.inherits(this, NetConsole);

	}

}

// Export the FRC function
module.exports = FRC;