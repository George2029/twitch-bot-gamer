import {BlackjackHand} from './BlackjackHand.js';
import {shuffleBJDeck} from './shuffleBJDeck.js';

let testDeck = shuffleBJDeck();
let gamblerHand = testDeck.slice(0, 3);
let dealerHand = testDeck.slice(2, 4);
let ts1 = performance.now();
let {value, blackjack, resolved, busted, splittable} = new BlackjackHand(gamblerHand);
let ts2 = performance.now();

console.log( {
	value,
	blackjack,
	resolved,
	busted,
	splittable
})

console.log(ts2-ts1);
