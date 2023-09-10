import ping from 'ping';
import logger from './logger.js';

let connection = () => ping.promise.probe('archlinux.org');

export let internetCheck = () =>

		new Promise (async (res, rej) => {

			let {alive} = await connection();

			if(!alive) {

				logger('inet', 'No internet connection', 'error');

				let waiting = setInterval( async () => {

					let {alive} = await connection();

					if(alive) {
						clearInterval(waiting);
						logger('inet', 'Internet connection is back!', 'good');
						return res();
					}

					logger('inet', 'Waiting for reconnection...', 'reconnecting');

				}, 5000);

			} else {
				return res();
			}
		})

