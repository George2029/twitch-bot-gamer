// returns false if a chatter is not a follower, true if they are
import {performanceLog} from './../../../../utils/logger.js';

export let isFollower = (userId) => 
	new Promise (async (res, rej) => {
		let url = new URL('https://api.twitch.tv/helix/channels/followers');
		url.search = new URLSearchParams([
			['broadcaster_id', process.env.broadcaster_id],
			['user_id', userId]
		]);
		let ts1 = performance.now();

	//	console.log(`broadcaster_id: ${process.env.broadcaster_id}`);
	//	console.log(`user_id: ${userId}`);
	//	console.log(`client-id: ${process.env.client_id}`);
	//	console.log(`user access token: "Bearer ${process.env[`${process.env.bot}_access_token`]}"`);

		let r = await fetch(url,
			{
				method: 'GET',
				headers: {
					"Client-ID": process.env.client_id,
					"Authorization": `Bearer ${process.env[`${process.env.bot}_access_token`]}`
				}
			}
		)
		let ts2= performance.now();
		performanceLog('isFollower', Math.floor(ts2-ts1));
		let data = await r.json();
		if (r.status !== 200) {
			console.log(data);
			return rej(r.status);
		}
		return res(!!data.data.length);
	}) 
