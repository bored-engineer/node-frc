//Requires
var dgram = require("dgram");
var events = require('events');
var util = require('util');

//Global constructor
function DriverStation(){

	//Call the EventEmitter super method
	events.EventEmitter.call(this);

}

//Inherit event methods
util.inherits(DriverStation, events.EventEmitter);

//Export values
module.exports = DriverStation;