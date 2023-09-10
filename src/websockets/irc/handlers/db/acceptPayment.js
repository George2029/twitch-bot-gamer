import {users} from './index.js';

export default (user_id, payment) => users.updateOne({user_id}, {$inc: {points: -payment}}); 
