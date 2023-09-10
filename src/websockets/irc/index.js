import ws from 'ws';
import logger from './../../utils/logger.js';
import irc_message_parser from './../../utils/irc_message_parser.js';
import commandHandler from './handlers/index.js';
import {internetCheck} from './../../utils/internetCheck.js';

class InternetRelayChatWebSocket extends ws {
	static counter = 0;
	static reconnect_url = 'ws://irc-ws.chat.twitch.tv:80';

	constructor(url) {
			super(url);
			this.on('error', this.onError);
			this.on('message', this.onMessage);
			this.on('open', this.onOpen);
			this.on('close', this.onClose);
	}

	async onClose (msg) {
		logger('irc', 'Closed', 'error');
		console.log(msg);
		clearTimeout(this.pingTimeout);
		await internetCheck();
		this.newConnection = await new InternetRelayChatWebSocket(InternetRelayChatWebSocket.reconnect_url); 
		logger('irc', 'Created a new instance of oneself', 'error');
	}

	onError (err) {
		console.log('AAAAAAAAAAAAAAAAAAAAA EEEEEEERRRRRRRROOOOOOOOOORRRRRRRR');
		console.log(err);
		this.terminate();
	}

	onOpen () {
		this.send('CAP REQ :twitch.tv/membership twitch.tv/tags twitch.tv/commands');
    	this.send(`PASS oauth:${process.env[`${process.env.bot}_access_token`]}`);
   		this.send(`NICK ${process.env.bot}`);
		this.send(`JOIN #${process.env.broadcaster}`);

		logger('irc', `Connected: ${++InternetRelayChatWebSocket.counter}`, 'good');
		this.say(`Here.`);
	}

	async onMessage (ircMessage) {
		let rawIrcMessage = ircMessage.toString().trim();
		let messages = rawIrcMessage.split('\r\n');
		messages.forEach( async msg => {
			let parsed_message = irc_message_parser(msg);
			if (parsed_message) {
				let {command: {command: irc_command, botCommand, botCommandParams}, source, tags} = parsed_message;
				if(irc_command === 'PING') return this.onPing(); 
				if (botCommand) {
					let paramsLog = botCommandParams ? `with the following input: ${botCommandParams}` : '';
					logger('user', `${source.nick} uses !${botCommand} ${paramsLog}`, 'user_input');
					let res = await commandHandler(parsed_message, this.say.bind(this));
					if (res !== undefined) {
						this.reply(res, tags.id);
					}
				} 
			}
		});
	}

	onPing() {
		// If the server does not ping for >5 minutes, reconnect
		clearTimeout(this.pingTimeout);
		this.send('PONG :tmi.twitch.tv');
		logger('irc', 'Ping-Pong', 'warning');
		this.pingTimeout = setTimeout(() => {
			logger('irc', 'DIDNOT RECEIVE PING FOR MORE THAN 5 MIN. RECONNECTING', 'error');	
			this.terminate();
		}, 1000*60*5);
		return;
	}

	say (msg) {
		try {
			this.send(`PRIVMSG #${process.env.broadcaster} :${msg}`);
		} catch (err) {
			console.error(err);
		}
	}

	reply (msg, id) {
		try {
			this.send(`@reply-parent-msg-id=${id} PRIVMSG #${process.env.broadcaster} :${msg}`);
		} catch (err) {
			console.error(err);
		}
	}



}

export default InternetRelayChatWebSocket;
