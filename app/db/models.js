var mongoose = require('mongoose');
var models = {};

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

// user
models.doorstate = new Schema({
	time: { type: Date, default: Date.now},
	value: Number, // -1: error, 0: closed, 1: open
	sender: Schema.Types.ObjectId // reference to authCode
}, {
	timeseries: {
		timeField: 'time',
		granularity: 'minutes'
	}
});

// heatmap data
models.heatmap = new Schema({
	day: Number, // 0 to 6
	hour: Number,
	minute: Number,
	value: Number, // -1: error, 0: closed, 1: open,
	total: Number, // incr.
	lastUpdate: { type: Date, default: Date.now}
})

// simple authcodes
models.authCode = new Schema({
	name: String,
	token: String,
	lastUsed: { type: Date, default: Date.now }
});

module.exports = (con) => {
	let mdls = {};

	// initialize models
	mdls.doorstate = con.model('Doorstate', models.doorstate);
	mdls.authCode = con.model('AuthCode', models.authCode);
	mdls.heatmap = con.model('Heatmap', models.heatmap);

	// return models for further processing
	return mdls;
};
