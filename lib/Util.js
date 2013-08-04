// Require the crc32 method becuase I suck at writing crc code for binary data
var crc32 = require('buffer-crc32');

// Require underscore because I'm lazy
var _ = require('underscore');

// Create main namespace
var Util = {};

// Get the ip addresses of important things given a team
Util.getIP = function(team) {

	// Get the main part of the ip
	var main = "10." + parseInt(team / 100, 10) + "." + team % 100;

	// Return the different ips
	return {
		cRIO: main + ".2",
		Computer: main + ".5"
	};

};

// Parse a binary byte
Util.parseBinary = function (buf, index) {

	// Get the result as an integer
	var num = buf.readUInt8(index);

	// Convert to a binary string
	var binary = num.toString(2);

	// For each value
	_.times(8 - binary.length, function() { binary = "0" + binary; });

	// Save the result
	var results = {};

	// Loop each 8
	_.times(8, function(n) {

		// Save the result
		results[n] = binary.substring( n + 1, n ) == "1" ? true : false;

	});

	// Return the result
	return results;

};

// Create a binary value
Util.buildBinary = function (binary1, binary2, binary3, binary4, binary5, binary6, binary7, binary8) {

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

};

// Export namespace
module.exports = Util;