import {isFollower} from './isFollower.js';

export const auth = (user_id, broadcaster) => 
	new Promise (async (res, rej) => {
		if(broadcaster) 
			return res(true);
		if (await isFollower(user_id)) 
			return res(true);
		return res(false);
	})

