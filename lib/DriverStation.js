//Requires
var dgram = require("dgram");
var events = require('events');
var util = require('util');
var _ = require('underscore');
var crc32 = require('buffer-crc32');

//Global constructor
function DriverStation(team){

	//Parse a packet
	function parsePacket(buf){

		//Get the control packet
		var control = buf.readUInt8(0);

		//Default to 1
		var mode = 1;

		//Default to enabled false
		var enabled = false;

		//If Autonomous
		if(control == 112 || control == 80) mode = 2;

		//If Test
		if(control == 98 || control == 66) mode = 3;

		//If enabled
		if(control == 112 || control == 98 || control == 96) enabled = true;

		//Send the response
		return {
			control: mode,
			enabled: enabled,
			battery: parseInt(buf.toString('hex',1,2) + "." + buf.toString('hex',2,3)),
			mac: buf.toString('hex',10,16).toUpperCase(),
			team: parseInt(buf.readUInt16BE(8)),
			packetIndex: buf.readUInt16BE(30)
		}

	}

	//On new packet
	function message(msg){

		//Send a new update event with the parseResults
		this.emit("update", parsePacket(msg));

	}

	//Call the EventEmitter super method
	events.EventEmitter.call(this);

	//Create a socket for controlling the robot
	var socket = dgram.createSocket('udp4');

	//Bind to the correct port
	socket.bind(1150);

	//Start at 0
	var packetIndex = 0;

	//On a new udp message
	socket.on("message", message.bind(this));

	//Send an update
	this.send = function(options){

		//If no options are sent
		if(_.isUndefined(options)){

			//Set to empty object
			options = {};

		}

		//If analog has been sent
		if(_.has(options, "analog")){

			//Loop for each 4 options
			_.each([0, 1, 2, 3], function(i){

				//If that has been set
				if(_.has(options.analog, i)){

					//Scale to range
					if(options.analog[i] > 1023){ options.analog[i] = 1023; }
					if(options.analog[i] < 0){ options.analog[i] = 0; }

				}else{

					//Default to 0
					options.analog[i] = 0;

				}

			})

		}else{

			//Default all to 0
			options.analog = {
				0: 0,
				1: 0,
				2: 0,
				3: 0
			}

		}

		//If the joystick has been set
		if(_.has(options, "joystick")){

			//Loop for each 4 joysticks
			_.each([0,1,2,3], function(i){

				//If the joystick exists
				if(_.has(options.joystick, i)){

					//Scale to range
					if(options.joystick[i] > 127){ options.joystick[i] = 127; }
					if(options.joystick[i] < -128){ options.joystick[i] = -128; }

				}else{

					//Default to 0
					options.joystick[i] = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

				}

			});

		}else{

			//Default to 0
			options.joystick = {
				0: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
				1: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
				2: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
				3: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
			}

		}

		//Check if the mode set
		if(_.has(options, "mode")){

			//If the value is not one of the correct values
			if(!_.has([0, 1, 2],options.mode)){

				//Default to TeleOp Mode
				options.mode = 1;

			}

		}else{

			//Default to TeleOp Mode
			options.mode = 1;

		}

		//Covert the mode to the correct mode
		options.mode = ([64, 80, 66])[options.mode];

		//If no options set
		if(!_.has(options, "enabled")){

			//Default to false
			options.enabled = false;

		}

		//Add the enabled value
		options.mode += (options.enabled) ? 32 : 0;

		//If a digitalIn was set
		if(_.has(options, "digitalIn")){

			//Loop each 8 possible digitalIn
			_.each([0, 1, 2, 3, 4, 5, 6, 7], function (i){

				//If not set
				if(!_.has(options.digitalIn, i)){

					//Default to false
					options.digitalIn = false;

				}

			});

		}else{

			//Default to all false
			options.digitalIn = {0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false};

		}

		//Add a digitalIn value
		options.digitalIn.binary = "";

		//For each digitalIn
		_.each([7, 6, 5, 4, 3, 2, 1, 0], function (i){

			//Build a binary string
			options.digitalIn.binary += options.digitalIn[i] ? "1" : "0";

		});

		//Convert to a number
		options.digitalIn = parseInt(options.digitalIn.binary, 2);

		//If no alliance set
		if(!_.has(options, "alliance")){

			//Default to Blue becuase blue is cool
			options.alliance = true;

		}

		//Convert alliance to a string
		options.alliance = options.alliance ? "B" : "R";

		//If a position was specified
		if(_.has(options, "position")){

			//If it's a legal value
			if(!_.has([0, 1, 2], options.position)){

				//Reset to 0
				options.position = 0;

			}

		}else{

			//Default to 0
			options.position = 0;

		}

		//Make position a string
		options.postion += "";

		//The actual data buffer of the udp message
		var buffer = new Buffer(1024);

		//Fill with 0s
		buffer.fill(0);

		//Set the packetIndex
		buffer.writeUInt16BE(packetIndex++, 0);

		//If going to overflow next loop
		if(packetIndex == 65536){

			//Reset to 0
			packetIndex = 0;

		}

		//Set the control packet
		buffer.writeUInt8(options.mode, 2);

		//Set the dsDigitalIn value
		buffer.writeUInt8(options.digitalIn, 3);

		//Set the team number
		buffer.writeUInt16BE(team, 4);

		//Set the Alliance
		buffer.write(options.alliance,6);

		//Set the Position 
		buffer.write(options.position,7);

		//Start the index at 8
		var index = 8;

		//For each joystick
		_.each([0, 1, 2, 3], function(joy){

			//Loop 
			_.each([0, 1, 2, 3, 4, 5], function(axis){

				//Send the axis value
				buffer.writeInt8(options.joystick[joy][axis], index++);

			});

			//Add some since we haven't figured out buttons yet
			index += 2;

		});

		//Send the analog values
		buffer.writeUInt16BE(options.analog[0], 40);
		buffer.writeUInt16BE(options.analog[1], 42);
		buffer.writeUInt16BE(options.analog[2], 44);
		buffer.writeUInt16BE(options.analog[3], 46);

		//Send the Driver Station Version
		buffer.write("02121300", 74);

		//Set the crc and add it to the end
		buffer.writeUInt32BE(crc32.unsigned(buf), 1020);

		//Send a control packet
		socket.send(buf, 0, 1024, 1110, "10." + parseInt(team / 100) + "." + team % 100 + ".2");

	}

	//Kickstart the messages
	this.send();

}

//Inherit event methods
util.inherits(DriverStation, events.EventEmitter);

//Export values
module.exports = DriverStation;