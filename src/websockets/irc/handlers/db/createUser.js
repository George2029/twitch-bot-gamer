import {users} from './index.js';
import {initIncome} from './../commands/config.js';

export default (user_id, user_login) =>
		 db.collection('users').insertOne({
				user_id, 
				user_login, 
				points: initIncome, 
				last_points_reception: new Date(), 
				smurfs: [user_login],
				followed_at: new Date(), 
			}); 
