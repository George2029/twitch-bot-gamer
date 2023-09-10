import {createClient} from 'redis';
import logger from '../utils/logger.js';
import get_new_access_token from './refresh_token.js';

const redis_client = createClient();
redis_client.on('error', err => console.log('Redis Client Error', err));
await redis_client.connect();

export default (app_name, acc)=>  {
	return new Promise(async (res, rej) => {
		let token_data = await redis_client.HGET(app_name, acc);
		let token_data_parsed = JSON.parse(token_data);
        	fetch(
            		"https://id.twitch.tv/oauth2/validate",
            		{
               			method: "GET",
                		headers: {
                    			Authorization: "Bearer " + token_data_parsed.access_token
                		}
            		}
        	)
		.then(resp => {return resp.json()
			.then(async data => {
				if (resp.status != 200 || data.expires_in <= 3600) {
					logger(`auth`, `A new ${acc}'s token will be generated.`, `warning`);
					try {
						await get_new_access_token(token_data_parsed, redis_client, app_name, acc);
						return res('updated token');
					} catch(err) {
						console.log(err);
						return rej('failed to update token');
					}
				} else {
					process.env[`${acc}_access_token`] = token_data_parsed.access_token;
					let h = parseInt(data.expires_in / 3600);
					let m = parseInt(data.expires_in % 3600 / 60);
					let s = data.expires_in % 3600 % 60; 
					logger(`auth`, `${acc}'s token expires in ${h}h:${m}m:${s}s`, 'warning');
					return res();
				}; 
		
			})
		});
	});
}
