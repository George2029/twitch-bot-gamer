// main command handler

import * as commands from './commands/index.js';

let activeUsers = {};

export default 
	({
		command: {botCommand: name, botCommandParams: params}, 
		tags: {
			user_id, 
			mod, 
			broadcaster,
			vip
		},
		source: {nick: user_login}
	}, say) => {  
		return new Promise( async (res, rej) => {
			if (activeUsers[user_id]) return res(`You're sending messages too quickly`);
			activeUsers[user_id] = true;
			let result;
			const commandData = {
				user: {user_id, user_login},
				user_type: {vip, mod, broadcaster},
				name,
				params,
				say,
			}
			switch (name) {

				// points related

				// poker

				case 'poker':
				case 'check':
				case 'call':
				case 'raise':
				case 'fold':
				case 'cancel':
				case 'reject':
				case 'bet':

				// blackjack
				case 'blackjack':
				case 'hit':
				case 'split':
				case 'stand':
				case 'dd':
				case 'accept':
				case 'decline':
				case 'sur':

				//games-info
				case 'top':
				case 'winrate':
					result = await commands[name](commandData);
					break;

   		 	}

			activeUsers[user_id] = null;
			return res(result);
		})
	}
