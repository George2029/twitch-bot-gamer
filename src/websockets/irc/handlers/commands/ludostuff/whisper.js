import sendWhisper from './../../requests/sendWhisper.js';
import {pokerLog} from './../../../../../utils/logger.js';

export const whisper = (id, msg, say) => 

	new Promise( async (res, rej) => {

		let whisper = await sendWhisper(id, msg);

		if (whisper.allgood) return res(true);

		if (whisper.status !== 429) return res(false);

// in case of 429 (exceeding twitch api limits (in this case, probably, sending more than 3 msg/s)), retry several (5) times; 

		say(`Having issues with twitch api limits, please wait 5s...`);

		let counter = 0; // make only 5 attempts, then cancel the game.

		let waiting = setInterval( async () => {

			if (counter === 5) {
				clearInterval(waiting);
				return res(429);
			}

			let whisper = await sendWhisper(id, msg);

			if (whisper.allgood) {
				pokerLog(`RECOVERED AFTER 429`, `good`);
				clearInterval(waiting);
				return res(true);
			}

			pokerLog(`Haven't managed to whisper`, `error`);

			counter++;

		}, 1000)
	})

