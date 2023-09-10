import {ludomans} from './index.js';

export let getTopLudomans = (game) =>
	new Promise (async (res, rej) => {

	let obj1 = {};

	obj1[`${game}`] = {$exists: true};

	let obj2 = {};

	obj2[`${game}.wins`] = -1;

	let projection = {
		_id: 0,
		user_id: 0
	};

	return res(ludomans
		.find(obj1, {projection})
		.sort(obj2)
		.toArray())
	});	

