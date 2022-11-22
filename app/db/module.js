// init
var mongoose = require('mongoose');
var sanitize = require('mongo-sanitize');
var crypto = require('crypto');
var methods = {};

var db;
var mdls = require('./models.js');
var models;


/**
 * connects to db
 * @author Ruben Meyer
 * @async
 */
methods.connect = async () => {
	if(typeof db !== "undefined") return;

	// connect
	mongoose.connect('mongodb://'+process.env.MONGODB_USER+':'+process.env.MONGODB_PASSWORD+'@mongodb:'+process.env.MONGODB_DOCKER_PORT+'/admin', {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false,
		useCreateIndex: true,
		keepAlive: true,
		keepAliveInitialDelay: 300000
	});


	db = mongoose.connection;
	db = await db.useDb(process.env.MONGODB_DATABASE);
	models = mdls(db);

	// connection error handling
	db.on('error', (data) => {
		log.error('MongoDB connection error:\n', data);
		process.exit(); // exit on connection error
	});
}

/**
 * returns db instance
 * @author Ruben Meyer
 * @return {Object} mongoose
 */
methods.getConnection = () => {
	return db;
}


//  ////////  ////////  ////////  ////////  ////////
//  //           //     //    //     //     //
//  ////////     //     //    //     //     ////////
//        //     //     ////////     //     //
//  ////////     //     //    //     //     ////////
//
////////////////////////////////////////////////////////

/**
 * add new timestamp value
 * @author Ruben Meyer
 * @async
 * @param {Object} obj data obj (token, value[, time])
 * @return {Object} async(bool, err)
 */
methods.addState = async (obj) => {
	if(typeof obj !== 'object') return {err: new TypeError('obj is not an object::database.addState('+JSON.stringify(obj)+')', module.filename)};

	let Doorstate = models.doorstate;
	verify = await methods.verifyAuthCode({token: obj.token});
	if(verify.reply) {
		auth_obj = await methods.getAuthCode({token: obj.token});

		let state = new Doorstate();
		state.sender = mongoose.Types.ObjectId(auth_obj._id);
		state.value = sanitize(obj.value);
		if(obj.time)
			state.time = sanitize(obj.time);

		try {
			reply = await state.save();

			day = (obj.time) ? new Date(state.time).getDay() : new Date().getDay();
			hour = (obj.time) ? new Date(state.time).getHours() : new Date().getHours();
			minute = Math.floor(((obj.time) ? new Date(state.time).getMinutes() : new Date().getMinutes())/5)*5;

			reply2 = await methods.initializeHeatmap();
			reply3 = await methods.updateHeatMap(day, hour, minute, state.value);

			return {reply: true};
		} catch(err) {
			console.error(err);
			return {err: err};
		}
	} else {
		return {reply: false};
	}
};

/**
 * get doorstate time series
 * @author Ruben Meyer
 * @async
 * @param {Object} obj data obj ([rangeFrom, rangeTo])
 * @return {Object} async(bool, err)
 */
methods.getCurrentState = async(obj) => {
	let Doorstate = models.doorstate;

	try {
		data = await Doorstate.find().sort({ time: -1}).limit(1).exec();

		return {reply: data};
	} catch(err) {
		return {err: err};
	}
}

/**
 * get doorstate time series
 * @author Ruben Meyer
 * @async
 * @param {Object} obj data obj ([rangeFrom, rangeTo])
 * @return {Object} async(bool, err)
 */
methods.getStates = async(obj) => {
	let Doorstate = models.doorstate;

	try {
		data = await Doorstate.find().sort({ time: -1}).limit(15).exec();

		return {reply: data};
	} catch(err) {
		return {err: err};
	}
}


//  //    //  ////////  ////////  /////////  ////  ////  ////////  ////////
//  //    //  //        //    //     //      //  //  //  //    //  //    //
//  ////////  //////    //    //     //      //  //  //  //    //  ////////
//  //    //  //        ////////     //      //      //  ////////  //
//  //    //  ////////  //    //     //      //      //  //    //  //
//
//////////////////////////////////////////////////////////////////////////////

methods.initializeHeatmap = async () => {
	let HeatMap = models.heatmap;

	try {
		count = await HeatMap.countDocuments();

		if(count != 0) {
			return {initialized: true, already: true};
		}

		for(d=0; d <= 6; d++) {
			for(h=0; h <= 23; h++) {
			    for(m=0; m < 60; m+=5) {
					hm = new HeatMap();
					hm.day    = d;
					hm.hour   = h;
					hm.minute = m;
					hm.value  = 0;
					hm.total  = 0;

					await hm.save();
				}
			}
		}

		return {initialized: true, already: false};
	} catch(err) {
		return {err: err};
	}

};

/**
 * update heatmap value
 * @author Ruben Meyer
 * @async
 * @param {Number} day
 * @param {Number} hour
 * @param {Number} minute
 * @param {Number} value 0 or 1
 * @return {Object} async(obj, err)
 */
methods.updateHeatMap = async (day, hour, minute, value) => {
	let HeatMap = models.heatmap;

	try {
		hm = await HeatMap.findOneAndUpdate({
			day: day,
			hour: hour,
			minute: minute,
			$or: [
				// only documents which are older than 3 days
				{ lastUpdate: {$lt: new Date((new Date())-1000*60*60*72)} },
				{ lastUpdate: {$exists: false} }
			]
		}, {
			$inc: {
				total: 1,
				value: value
			},
			$currentDate: {
				lastUpdate: true
			}
		}).exec();

		return {reply: true};
	} catch(err) {
		return {err: err};
	}
};

/**
 * update heatmap value
 * @author Ruben Meyer
 * @async
 * @param {Number} day
 * @param {Number} hour
 * @param {Number} minute
 * @param {Number} value 0 or 1
 * @return {Object} async(obj, err)
 */
methods.getHeatMap = async () => {
	let HeatMap = models.heatmap;

	try {
		hm = await HeatMap.find().limit(2050).exec();

		return {reply: hm};
	} catch(err) {
		return {err: err};
	}
};

//  ////////  //    //  /////////  //    //
//  //    //  //    //     //      //    //
//  ////////  //    //     //      ////////
//  //    //  //    //     //      //    //
//  //    //  ////////     //      //    //
//
//////////////////////////////////////////////

/**
 * create authentcation code for 'name'
 * @author Ruben Meyer
 * @async
 * @param {Object} obj data obj (name)
 * @return {Object} async(obj, err)
 */
methods.createAuthCode = async (obj) => {
	if(typeof obj !== 'object') return {err: new TypeError('obj is not an object::database.createAuthCode('+JSON.stringify(obj)+')', module.filename)};

	let AuthCode = models.authCode;

	let auth = new AuthCode();
	auth.name = sanitize(obj.name);
	auth.token = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, (c) => (c ^ crypto.randomBytes(new Uint8Array(1).length)[0] & 15 >> c / 4).toString(16));

	try {
		reply = await auth.save();
		return {reply: true};
	} catch(err) {
		return {err: err};
	}
}

/**
 * get authentication token object
 * @author Ruben Meyer
 * @async
 * @param {Object} obj data obj (token)
 * @return {Object} async(obj, err)
 */
methods.getAuthCode = async (obj) => {
	if(typeof obj !== 'object') return {err: new TypeError('obj is not an object::database.verifyAuthCode('+JSON.stringify(obj)+')', module.filename)};

	let AuthCode = models.authCode;

	try {
		data = await AuthCode.findOne({
			token: sanitize(obj.token)
		}).exec();

		if(typeof data==="object") {
			if(data === null || data === []) return {reply: false};
			else return {reply: data};
		}
	} catch(err) {
		return {err: err};
	}
}

/**
 * verify authentication token
 * @author Ruben Meyer
 * @async
 * @param {Object} obj data obj (token)
 * @return {Object} async(bool, err)
 */
methods.verifyAuthCode = async (obj) => {
	if(typeof obj !== 'object') return {err: new TypeError('obj is not an object::database.verifyAuthCode('+JSON.stringify(obj)+')', module.filename)};

	let AuthCode = models.authCode;

	try {
		data = await AuthCode.findOne({
			token: sanitize(obj.token)
		}).exec();

		if(typeof data==="object") {
			if(data === null || data === []) return {reply: false};
			else return {reply: true};
		}
	} catch(err) {
		return {err: err};
	}
}


//  ////////  ////////  ////////  ////////  ////////
//  //           //     //    //     //     //
//  ////////     //     //    //     //     ////////
//        //     //     ////////     //           //
//  ////////     //     //    //     //     ////////
//
////////////////////////////////////////////////////////

/**
 * returns user count
 * @author Ruben Meyer
 * @async
 * @return {Object} async(int, err)
 */
methods.doorstateCount = async () => {
	let stateModel = models.doorstate;

	try {
		count = await stateModel.countDocuments({}).exec();
		return {reply: count};
	} catch(err) {
		return {err: err};
	}
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////


module.exports = methods;
