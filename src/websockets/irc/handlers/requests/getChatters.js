import {performanceLog} from './../../../../utils/logger.js';

export let getChatters = () => 
	new Promise ( async (res, rej) => {

		let url = new URL('https://api.twitch.tv/helix/chat/chatters');

		url.search = new URLSearchParams([
			['broadcaster_id', process.env.broadcaster_id], 
			['moderator_id', process.env.bot_id]
		]);
		let ts1 = performance.now();

		let r = await fetch(url, {
			method: 'GET',
			headers: {
				'client-id': process.env.client_id,
				'authorization': 'Bearer ' + process.env[`${process.env.bot}_access_token`],
			}
		});
		let ts2 = performance.now();
		performanceLog(`getChatters`, Math.floor(ts2-ts1));

		if (r.status !== 200) {
			return rej('smth went wrong');	
		}

		let body = await r.json();
		return res(body.data);
	});
