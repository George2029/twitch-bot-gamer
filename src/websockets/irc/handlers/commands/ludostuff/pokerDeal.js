import {deck} from './deck.js';
import pokersolver from 'pokersolver';
const {Hand} = pokersolver;

export let deal = (hostlogin, opplogin) => {

	let generated9Cards = [];

	for (let i = 0; i<9; i++) {

		let randomIndex = Math.floor(Math.random() * deck.length);
		
		generated9Cards.push(deck[randomIndex]);

		deck.splice(randomIndex, 1);	
		
	}

	let game = {
		hosthand: {
			init: generated9Cards.slice(0, 2),
			total: generated9Cards.slice(0, 7),
		},
		opphand: {
			init: generated9Cards.slice(7),
			total: generated9Cards.slice(2),
		},
		row: generated9Cards.slice(2, 7)
	}

	let hand1 = Hand.solve(game.hosthand.total);
	let hand2 = Hand.solve(game.opphand.total);

	hand1.owner = hostlogin;
	hand2.owner = opplogin;

	let winners = Hand.winners([hand1, hand2]);

	game.winner =  winners.length === 1 ? winners[0].owner : false;  

	game.descr = winners[0].descr;

	let winnerStr = game.winner ? `${game.winner} won!` : `Draw!`;

	game.result = `***GG*** ${winnerStr}: ${game.descr}`;

	return game;
} 

