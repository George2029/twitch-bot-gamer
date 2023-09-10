import {ludomans} from './../db/index.js';
import {performanceLog} from './../../../../utils/logger.js';

export let winrate = ({user: {user_id}, params}) => 
	new Promise ( async (res, rej) => {
		let ts1 = performance.now();
		switch (params) {
			case 'poker':
			case undefined:
				params = 'poker'
				break;
			case 'blackjack':
				params = 'blackjack'
				break;
			default:
				return res('no such game');
		}


		let lud = await ludomans.findOne({user_id});
		if (!lud?.[params]) return res(`You haven't been ludomaning this game so far`);
		let wins = lud[params].wins || 0;
		let games = lud[params].games;
		let total = lud[params].total || 0;
		let ts2 = performance.now();
		performanceLog(`winrate`, Math.floor(ts2-ts1));
		return res(`${parseInt(wins * 100 / games)}%. (${total}$)`);
	});
