import {users} from './index.js';
import {initIncome} from './../commands/config.js';
import {performanceLog} from './../../../../utils/logger.js';


export let findOneAndUpdate = (user_id, user_login) =>
	new Promise( async (res, rej) => {
		let ts1 = performance.now();
		let user = await users
			.findOneAndUpdate(
				{user_id},
				{
					$setOnInsert: {
						user_id, 
						user_login, 
						points: initIncome, 
						last_points_reception: new Date(), 
						smurfs: [user_login],
						added_at: new Date(), 
					}}, 
				{
					upsert: true, 
					returnDocument: 'after'
				}); 

		let ts2 = performance.now();
		performanceLog(`find & update`, Math.floor(ts2-ts1));
		return res(user);
	})

