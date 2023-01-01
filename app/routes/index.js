var express = require('express');
var router = express.Router();
var asyncer = require('express-async-handler');
var debug = require('debug')('app:routes:index');
var moment = require('moment-timezone');
var tz = "Europe/Berlin";


function timeSince(date) {
	var seconds = Math.floor((new Date() - date) / 1000);
	days = Math.floor(seconds / 86400);
	seconds -= days * 86400;
	hours = Math.floor(seconds / 3600);
	seconds -= hours * 86400;
	minutes = Math.floor(seconds / 60);
	seconds -= minutes * 60;

	str = "";
	if(days > 0) str += ` ${days}d`;
	if(hours > 0) str += ` ${hours}h`;
	if(minutes > 0 && days < 100) str += ` ${minutes}m`;
	if(seconds > 0 && days < 1) str += ` ${seconds}s`;

	return str;
}

let getRoutes = async () => {
	// mongooseConnection
	let db = require('../db/module');
	await db.connect();
	let con = db.getConnection();

	setTimeout(function () {
		if(process.env.DISCORD_PUSH_ON_STARTUP == 1)
			db.pushCurrentState();
		else {
			console.log(`do not push current state on startup ${process.env.DISCORD_PUSH_ON_STARTUP}`);
		}
	}, 2000);

	// Default page
	router.get('/default', asyncer(async (req, res, next) => {
		res.render('default', { title: 'Default page' });
	}));

	// Set-State API
	// GET: token: String, val: Boolean
	router.get('/setState', asyncer(async (req, res, next) => {
		console.log(req.query);
		obj = {
			token: req.query.token,
			value: req.query.value,
		};
		if(req.query.time)
			obj.time = req.query.time;

		data = await db.addState(obj);

		db.pushCurrentState(); // await not needed

		res.send(JSON.stringify(data));
	}));

	router.get('/getHeatMap', asyncer(async (req, res, next) => {
		data = await db.getHeatMap();
		res.send(JSON.stringify(data));
	}));

	// Create AuthCode
	// POST: token: String, val: Boolean
	router.get('/createAuthCode', asyncer(async (req, res, next) => {
		console.log(req.query);
		obj = {
			name: req.query.name,
			token: req.query.token
		};

		data = await db.createAuthCode(obj);

		res.send(JSON.stringify(data));
	}));

	// Dashboard page
	router.get('/', asyncer(async (req, res, next) => {
		data = await db.getStates();
		if(data.reply) {
			history = data.reply;
			for (var i = 0; i < history.length; i++) {
				if(history[i].value == 1) history[i].open = true;
				else if(history[i].value == 0) history[i].closed = true;
				else history[i].error = true;
				history[i].class = (history[i].value == 1) ? "open" : (history[i].value == 0 ? "closed" : "error");
				history[i].timeTitle = moment(new Date(history[i].time)).tz(tz).format();
				history[i].timeFormatted = moment(new Date(history[i].time)).tz(tz).format("Y-MM-DD HH:mm");
			}
		}
		else {
			history = [{class:"error", time: "404"}];
		}

		data2 = await db.getCurrentState();
		if(data2.reply && data2.reply.length >= 1) {
			currentState = data2.reply[0];
			state = {
				class: (currentState.value == 1) ? "open" : (currentState.value == 0 ? "closed" : "error"),
				state: (currentState.value == 1) ? "geöffnet" : (currentState.value == 0 ? "geschlossen" : "error"),
				duration: timeSince(currentState.time)
			};
		} else {
			state = {class:"closed", state:"geschlossen", duration:"-1h 65min 69s"};
		}
		res.render('dashboard.pug', { title: 'Status Page', history: history, state: state });
	}));

	// SpaceAPI
	router.get('/status/spaceapi.json', asyncer(async (req, res, next) => {
		data = await db.getCurrentState();
		open = data.reply[0].value == 1;
		lastchange = moment(new Date(data.reply[0].time)).tz(tz).unix();

		res.set('Content-Type', 'application/json; charset=utf-8');
		json = {
			"api":"0.13",
			"api_compatibility": ["0.14"],
			"space":"metameute",
			"logo":"https://www.metameute.de/logos/logo.png",
			"url":"https://www.metameute.de",
			"location":{"lat":53.83379316748737,"lon":10.704296399131595,"address":"Gebäude 64, Ratzeburger Allee 160, 23562 Lübeck, Germany"},
			"contact":{"email":"metameute@asta.uni-luebeck.de"},
			"issue_report_channels":["email"],
			"state":{
				"icon":{"open":"https://status.metameute.de/images/opened.png","closed":"https://status.metameute.de/images/closed.png"},
				"open":open,
				"lastchange":lastchange
			},
			"open":open,
			"feeds":{"blog":{"type":"application/rss+xml","url":"https://www.metameute.de/feed.xml"},
			"calendar":{"type":"text/calendar","url":"https://www.metameute.de/events.ics"}},
			"projects":["https://www.metameute.de/projects/"],
		};

		res.send(JSON.stringify(json));
	}));

	// RSS-Feed
	router.get('/rss', asyncer(async (req, res, next) => {
		history = await db.getStates();
		if(history.reply) {
			history = history.reply;
			for (var i = 0; i < history.length; i++) {
				history[i].title = history[i].value == 1 ? "opened" : "closed";
				history[i].ISODate = moment(new Date(history[i].time)).tz(tz).format("Y-MM-DD HH:mm");
				history[i].guid = "https://status.metameute.de/"+moment(new Date(history[i].time)).tz(tz).unix();
			}
		}
		// title, guid, ISODate
		else history = [{title: "error", guid:"error", ISODate: moment(new Date(history[i].time)).tz(tz).format("Y-MM-DD HH:mm")}];
		res.set('Content-Type', 'application/xml; charset=utf-8');
		res.render('rss.pug', { history: history});
	}));
	return router;
}

module.exports = {routes: getRoutes};
