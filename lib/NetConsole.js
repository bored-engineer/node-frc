//Requires
var dgram = require("dgram");
var events = require('events');
var util = require('util');

//Global constructor
function NetConsole(){

	//Call the EventEmitter super method
	events.EventEmitter.call(this);

}

//inherit event methods
util.inherits(NetConsole, events.EventEmitter);

//On new message
function message(msg){

	//Emit data
	this.emit("data", msg);

}

//Start the listener
NetConsole.prototype.start = function(){

	//Setup the server
	var server = dgram.createSocket("udp4");

	//Listen on the netconsole port
	server.bind(6666);

	//Emit ready event
	self.emit("ready");

	//On new message
	server.on("message", message.bind(this));
}

//Export values
module.exports = NetConsole;