import {performanceLog, default as logger} from './../../../../utils/logger.js';

export default (to_user_id, message) =>
	new Promise ( async (res, rej) => {
		let url = new URL('https://api.twitch.tv/helix/whispers');
		url.search = new URLSearchParams([
			['from_user_id', process.env.bot_id],
			['to_user_id', to_user_id]
		]);
		console.log(to_user_id, message);
		let tsStart = performance.now();
		let r = await fetch(url, 
			{
				method: 'POST',
				headers: {
					'client-id': process.env.client_id,
					'authorization': 'Bearer ' + process.env[`${process.env.bot}_access_token`],
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					message 
				})
			}
		);
		let tsEnd = performance.now();
		let timeSpent = Math.floor(tsEnd-tsStart);
		performanceLog(`sendWhisper`, timeSpent);
		if (r.status === 204) {
			return res({allgood: true});
		} else {

			let {message} = await r.json();

			logger(`req`, `[SENDWHISPER]: ${r.status} | ${message}`, `error`);

			return res({
				status: r.status,
				message
			});
		}
	})
