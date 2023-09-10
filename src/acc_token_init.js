import open from 'open';
import express from 'express';
import {createClient} from 'redis';
import 'dotenv/config';

let {client_id, redirect_uri, client_secret, token_init_port, app_name, bot} = process.env;

let account = bot;

const redis_client = createClient();
redis_client.on('error', err => console.log('Redis Client Error', err));
await redis_client.connect();
const app = express();

app.get('/', (req, res)=>{
	if (req.query) {
		if (req.query.code) {
			console.log(req.query.code);
			let url = new URL('https://id.twitch.tv/oauth2/token');
			url.search = new URLSearchParams([
				['code', req.query.code], 
				['grant_type', 'authorization_code'], 
				['client_id', client_id], 
				['redirect_uri', redirect_uri], 
				['client_secret', client_secret]
				]);
			console.log(url.search);
			fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "x-www-form-urlencoded",
					"Accept": "application/json"
				}
			})
			.then(r=>r.json()
				.then(async data => {
					if (r.status != 200) {
						console.log(data);
						return res.status(400).send('smth is wrong');
					}
				
					data.client_id=client_id;
					data.client_secret = client_secret;
					await redis_client.HSET(app_name, account, JSON.stringify(data));
					console.log(data);
					await redis_client.disconnect();
					res.status(200).send('all good');
					http_server.close();
			}));	
	}
}});

let authUrl = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&scope=chat:read+chat:edit+channel:moderate+user:read:follows+user:read:email+user:manage:chat_color+moderator:read:chat_settings+moderator:manage:chat_settings+moderator:manage:banned_users+moderator:read:blocked_terms+moderator:manage:blocked_terms+moderator:read:chatters+moderator:read:followers+channel:read:polls+channel:manage:polls+channel:manage:broadcast+moderation:read+user:manage:whispers`;


process.on('exit', () => console.log(`${account}'s token init finished`));
var http_server = app.listen(token_init_port, () => console.log(`${account}'s token init started`));

open(authUrl);
