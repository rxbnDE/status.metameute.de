// .env file
const dotenv = require('dotenv');
dotenv.config();

// run start api
require('./bin/www')

const db = require('./db/module');
db.connect();

const CronJob = require('cron').CronJob;
job = new CronJob(
	'15 */2 * * * *',
	function() {
		(async () => {
			currentState = await db.getCurrentState()
			day = new Date().getDay();
			hour = new Date().getHours();
			minute = Math.floor((new Date().getMinutes())/5)*5;

			await db.initializeHeatmap();
			reply = await db.updateHeatMap(day, hour, minute, (await db.getCurrentState()).reply[0].value);

			console.log("updated heatmap");
		})()
	},
	null,
	true,
	'Europe/Berlin'
);
