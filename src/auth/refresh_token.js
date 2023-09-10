import logger from './../utils/logger.js';

export default (token_data_parsed, redis_client, app_name, acc) => 
	new Promise( async (res, rej) => {
        let token_url = new URL('https://id.twitch.tv/oauth2/token');
        token_url.search = new URLSearchParams([
            [ 'grant_type',      'refresh_token' ],
            [ 'refresh_token',  token_data_parsed.refresh_token ],
            [ 'client_id',     token_data_parsed.client_id ],
            [ 'client_secret',     token_data_parsed.client_secret ]
        ]);

        fetch(
            token_url,
            {
                method: "POST",
                headers: {
						"Content-Type": "x-www-form-urlencoded",
                    	"Accept": "application/json"
                }
            }
        )
		.then(resp=>resp.json()
		.then(async data => {
			if (resp.status == 200) {
				token_data_parsed = {client_id: token_data_parsed.client_id, client_secret: token_data_parsed.client_secret, ...data};
				process.env[`${acc}_access_token`] = data.access_token;
				logger(`auth`, `${acc}'s token has been updated`, 'good');
				await redis_client.HSET(app_name, acc, JSON.stringify(token_data_parsed));
				return res('token updated');
			} else {
				console.log(data);
				return rej(data.message);
			};
		}))
	});	
