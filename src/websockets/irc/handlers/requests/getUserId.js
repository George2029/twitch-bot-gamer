export let getUserId = (login) => 
	new Promise ((res, rej) => {
		let params  = new URLSearchParams([
            		[ 'login',   login],
        	]);
		let url = new URL(`https://api.twitch.tv/helix/users`);
		url.search = params;
		fetch(
       		 	url,
        		{
            			method: "GET",
            			headers: {
               				"Client-ID": process.env.client_id,
               				"Authorization": "Bearer " + process.env[`${process.env.bot}_access_token`]
            			}
        		}
    		)
    		.then(r => r.json()
			.then( data => {
					if (r.status != 200) { 
						return rej(r.status)
					} 
					else {
				 		return res(data.data[0].id) 
					}
				}
			)
			.catch(err => rej(err))
		)
		.catch(err => rej(err))
	})
