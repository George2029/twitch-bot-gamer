import {users} from './index.js';

export let updatePoints = (user_id, points) => users.updateOne({user_id}, {$inc: {points}});
