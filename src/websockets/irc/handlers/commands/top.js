import {getTopLudomans} from './../db/getTopLudomans.js';
import {performanceLog} from './../../../../utils/logger.js';

export let top = ({params}) =>
	new Promise (async (res, rej) => {

		switch (params) {
			case 'poker':
			case undefined:
				params = 'poker';
				break;
			case '21':
			case 'blackjack':
				params = 'blackjack';
				break;
			default:
				return res('no such game');
		}

		let ts1 = performance.now();
		let top = await getTopLudomans(params);
		let ts2 = performance.now();
		performanceLog(`getTopLudomans`, Math.floor(ts2-ts1));
		let str = top
			.slice(0, 5)
			.map(
				(lud, idx) =>  {
					let ludych = lud.user_login;
					let wins = lud[params].wins || 0;
					let s = wins === 1 ? '' : 's';	
					let total = lud[params].total || 0;
					return `${idx+1}. ${ludych}: ${wins} win${s}. (${total}$)`;
				}
			)
			.join(' ');
		return res(str);
	});
