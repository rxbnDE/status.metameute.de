const {Client, Events, GatewayIntentBits, EmbedBuilder} = require('discord.js');

var client = null;
var channel = null;

let registerExitCalls = async () => {
	// only works when there is no task running
	// because we have a server always listening port, this handler will NEVER execute
	process.on("beforeExit", (code) => {
		console.log("Process beforeExit event with code: ", code);
	});

	// only works when the process normally exits
	// on windows, ctrl-c will not trigger this handler (it is unnormal)
	// unless you listen on 'SIGINT'
	process.on("exit", (code) => {
		console.log("Process exit event with code: ", code);
		stopBot();
	});

	// just in case some user like using "kill"
	process.on("SIGTERM", (signal) => {
		console.log(`Process ${process.pid} received a SIGTERM signal`);
		stopBot();
	});

	// catch ctrl-c, so that event 'exit' always works
	process.on("SIGINT", (signal) => {
		console.log(`Process ${process.pid} has been interrupted`);
		stopBot();
	});

	// what about errors
	// try remove/comment this handler, 'exit' event still works
	process.on("uncaughtException", (err) => {
		console.log(`Uncaught Exception: ${err.message}`);
		stopBot();
	});
};

let startBot = async () => {
	client = new Client({ intents: [GatewayIntentBits.Guilds] });

	// When the client is ready, run this code (only once)
	// We use 'e' for the event parameter to keep it separate from the already defined 'client'
	client.once(Events.ClientReady, e => {
		console.log(`Ready! Logged in as ${e.user.tag}`);
		client.user.setStatus('idle');

		client.channels.fetch(process.env.DISCORD_CHANNEL)
		.then(c => {
			channel = c
		})


	});
	client.login(process.env.DISCORD_TOKEN);

	registerExitCalls();
};

let stopBot = async () => {
	if(client !== null) {
		client.user.setStatus('invisible');
	}
};

let sendState = async (state) => {
	doorStateEmbed = new EmbedBuilder()
		.setURL('https://status.metameute.de/')
		.setAuthor({ name: 'Türstatus', iconURL: 'https://www.metameute.de/icons/meute-icon.png', url: 'https://metameute.de' })
		.setTimestamp();

	switch (state) {
		case 1:
			client.user.setStatus('online');
			doorStateEmbed = doorStateEmbed
			.setColor('08E318') // red: E32E49, green: 08E318
			.setTitle('Der Raum ist nun offen!')
			.setThumbnail('https://status.metameute.de/images/opened.png');
			break;
		case 0:
			client.user.setStatus('idle');
			doorStateEmbed = doorStateEmbed
				.setColor('E32E49')
				.setTitle('Der Raum ist nun geschlossen!')
				.setThumbnail('https://status.metameute.de/images/closed.png');
			break;
		default:
			client.user.setStatus('dnd');
			doorStateEmbed = doorStateEmbed
				.setColor('E32E49')
				.setTitle('Türstatus-FEHLER!')
				.setThumbnail('https://status.metameute.de/images/closed.png');
			break;
	}

	if(channel != null)
		channel.send({embeds: [doorStateEmbed]})
}

module.exports = { startBot: startBot, stopBot: stopBot, sendState: sendState}
