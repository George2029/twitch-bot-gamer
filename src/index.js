import 'dotenv/config';
import validate from './auth/validate.js';
import InternetRelayChatWebSocket from './websockets/irc/index.js';

let {app_name, bot, broadcaster} = process.env;

await validate(app_name, bot);

setInterval( ()=> {
	validate(app_name, bot); 
}, 15*60*1000); // validate every 15 min

const ircws = new InternetRelayChatWebSocket('ws://irc-ws.chat.twitch.tv:80');
