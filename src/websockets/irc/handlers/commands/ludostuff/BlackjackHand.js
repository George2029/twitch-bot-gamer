// Array-Emitter class which calcs hand value on 'push'

import {EventEmitter} from 'node:events';

let arrayPrototype = Object.fromEntries(
	Object.getOwnPropertyNames(
	Object.getPrototypeOf([])
	)
	.map(prop=>
		[prop, Object.getPrototypeOf([])[prop]]
	));

let emitterPrototype = Object.getPrototypeOf(new EventEmitter());

// copy props of 2 prototypes to a new obj which will be used as a parent prototype 

// --------------------- PROTOTYPE BUILDING -------------------------------

let blackjackHandPrototype = {}; 
Object.assign(blackjackHandPrototype, arrayPrototype);
Object.assign(blackjackHandPrototype, emitterPrototype);
// define additional props
blackjackHandPrototype.value = 0;
blackjackHandPrototype.info = '';
blackjackHandPrototype.push = function (...args) {
	Object.getPrototypeOf([]).push.call(this, ...args);
	this.emit('push');
}

// --------------------------------------------------------------------------------

export const BlackjackHand = class {

	constructor(cards, bet) {
		let obj = Object.create(blackjackHandPrototype);
		obj.on('push', this.valueCalc);
		obj.push(...cards);
		obj.bet = bet;
		
		return obj;
	}

	valueCalc () {

		let sum = 0;
		let aceNum = 0;
		let titles = [];

		this.forEach(({title, value})=>{
			if (value === 11) {
				aceNum++;
			} else {
				sum += value;	
			}
			titles.push(title);
		})	

		for (let i = 0; i < aceNum; i++) {
			if (sum+11 <= 21) {
				sum += 11;
			} else {
				sum += 1;
			}
		}

		if (sum >= 21) {

			if (sum > 21) {
				this.busted = true;
			}

			if (sum === 21 ) { 
				this.resolved = true;
				if (this.length === 2) {
					this.blackjack = true;
				}
			}
		}

		this.info = titles.join(', ');

		this.value = sum;
	}

}

