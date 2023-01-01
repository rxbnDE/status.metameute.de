// .env file
const dotenv = require('dotenv');
dotenv.config();

// moment.js - date objects
var moment = require('moment-timezone');
var tz = "Europe/Berlin";

// run start api
require('./bin/www')

const db = require('./db/module');
db.connect();

const CronJob = require('cron').CronJob;
job = new CronJob(
	'15 */2 * * * *',
	function() {
		(async () => {
			currentState = await db.getCurrentState();
			
			date = moment(new Date()).tz("Europe/Berlin");
			day = date.day();
			hour = date.hour();
			minute = Math.floor(date.minute()/5)*5;

			initialized = await db.initializeHeatmap();
			if (initialized.initialized) {
				currentState = await db.getCurrentState();

				if(currentState.reply && currentState.reply.length >= 1) {
					reply = await db.updateHeatMap(day, hour, minute, (currentState).reply[0].value);
					if(reply !== null) {
						console.log(`updated heatmap ${day}/${hour}:${minute}`);
					}
				} else {
					console.error("error updating heatmap - error getting current state");
				}


			} else {
				console.log("error updating heatmap");
			}
		})()
	},
	null,
	true
);
