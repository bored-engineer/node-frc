// Require the util for the inherits method
var util = require("util");

// The main FRC namespace
var FRC = {};

// Require the DriverStation function
FRC.prototype.DriverStation = require('./DriverStation');

// Require the NetConsole function
FRC.prototype.NetConsole = require('./NetConsole');

// Require the NetConsole function
FRC.prototype.Util = require('./Util');

// Export the FRC function
module.exports = FRC;