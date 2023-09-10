import 'dotenv/config';
import {createClient} from 'redis';
import fs from 'fs';

let redis_client = createClient();	
await redis_client.connect();

let {access_token} = JSON.parse(await redis_client.HGET('twitch_bot', process.env.bot));

let params  = new URLSearchParams([
       	[ 'login', process.env.broadcaster],
		[ 'login', process.env.bot]
   	]);
		let url = new URL(`https://api.twitch.tv/helix/users`);
		url.search = params;
		fetch(
       		 	url,
        		{
            			method: "GET",
            			headers: {
               				"Client-ID": process.env.client_id,
               				"Authorization": "Bearer " + access_token
            			}
        		}
    		)
    		.then(r => r.json()
				.then( data => {
					if (r.status != 200) { 
						console.log(r);
					} 
					else {
						fs.appendFileSync('.env', `broadcaster_id=${data.data[0].id}\n`);
						fs.appendFileSync('.env', `bot_id=${data.data[1].id}`);
						process.exit();
					}
				})
			)
