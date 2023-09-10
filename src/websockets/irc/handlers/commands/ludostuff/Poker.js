import {deal} from './pokerDeal.js';
import {pokerLog} from './../../../../../utils/logger.js';
import {users, ludomans} from './../../db/index.js';
import {whisper} from './whisper.js';

let games = [];

export let allowedToCreate = (user_id) => {

//	if (games.length >= 5) {
//		return {status: false, reason: 'Too many people playing already'}	
//	} ;

	if (getGame(user_id)) {
		return {status: false, reason: 'You are already playing'}
	}

	return {status: true};
	
}

export const getGame = (user_id) => games.find(({host, opp}) => host.id === user_id || opp.id === user_id); 

// export deleteGame = (id) => {games = games.filter(game => game.id !== id);}

export const createGame = (obj) => games.push(new Poker(obj));

export const Poker = class {

	static counter = 0;

	constructor({host, opp, say}) {

		this.id = ++Poker.counter;
		this.host = host;
		this.opp = opp;
		this.say = say;
		this.stage = (!this.host.left || !this.opp.left) ? 5 : 1;
		this.currentTurnPlayer = this.host;
		this.waitingTurnPlayer = this.opp;
		this.bank = 2 * this.host.inBank; 
		this.options = ['bet', 'check'];
		this.roundBet = 0;
		

		pokerLog(`[CREATED]: ${this.host.login} creates a game VS ${this.opp.login}: $${this.host.inBank}`, `good`);

// autocancelling timeout

		this.autocancelling = setTimeout(()=> {
		
			let str = `[TIMEOUT] Game between ${this.host.login} and ${this.opp.login} cancelled`;

			this.cancel(str);

		}, 60 * 1000);

	}

// ------------------ CANCEL ------------------------

	cancel (msg) {

		if (msg) this.say(`***${msg}***`);

// autoremoval from the array

		games = games.filter(game=>game.id!==this.id);

		pokerLog(msg, `error`);
	}


// -------------------- START ----------------------------

	async start () {

		this.generate();

		if (this.stage === 5) {
			this.say(`All in from the start!!!`);
			this.finish();
			return;
		}

		let hostWhisper = await whisper(this.host.id, this.host.hand, this.say);	
		
		if (hostWhisper === false) 
			return this.cancel(`It seems ${this.opp.login} enabled blocking messages from strangers. Cancelling the game`);
		if (hostWhisper === 429) 
			return this.cancel(`Haven't managed to handle Twitch restrictions :(`);

		let oppWhisper = await whisper(this.opp.id, this.opp.hand, this.say);	

		if (oppWhisper === false) 
			return this.cancel(`It seems ${this.opp.login} enabled blocking messages from strangers. Cancelling the game`);
		if (oppWhisper === 429) 
			return this.cancel(`Haven't managed to handle Twitch restrictions :(`);

		let log = `${this.host.login} VS ${this.opp.login} has started!`;

		let chat = `***Game ${log} Cards are in your whispers!***`;

		this.say(chat);

		pokerLog(log, 'good');

		this.setClock();

		this.say(`${this.currentTurnPlayer.login}'s turn. Options: ${this.options.join(', ')}`);
	}

// --------------------- GENERATE -----------------

	generate () {
		let game = deal(this.host.login, this.opp.login);
		this.row = game.row; 
		if (game.winner) {
			if (game.winner === this.host.login) {
				this.winner = this.host;
				this.loser = this.opp;
			} else {
				this.winner = this.opp;
				this.loser = this.host;
			}
		}
		this.host.hand = game.hosthand.init.join(', ');
		this.opp.hand = game.opphand.init.join(', ');
		this.result = game.result;

		pokerLog(`[GENERATION]: ${this.host.login}: ${this.host.hand}. ${this.opp.login}: ${this.opp.hand}. ${this.winner?.login ? this.winner.login : 'DRAW!'} (${this.result})`, `good`);

	}

// --------------------- FINISH -------------------

	async finish (message) {

		if(!this.winner) {

			if (this.showRiverAtTheEnd) this.say(`[RIVER] ${this.row.join(', ')}`);
			this.say(this.result);
			games = games.filter(game=>game.id!==this.id);
			pokerLog(`[FINISHED]: ${this.host.login} & ${this.opp.login}: TIE`, `good`);
			return;

		}

		let {winner, loser} = this;

		if (!message) message = 'GG';

// the message is either 'FOLD' or 'TIMEOUT'.
// options is empty array to decline any extra messages while this function is running

		this.options = [];

		let lostPoints = loser.inBank;

		await users.updateOne({user_id: winner.id}, {$inc: {points: lostPoints}});
		await users.updateOne({user_id: loser.id}, {$inc: {points: -lostPoints}});

		ludomans.updateOne(
			{user_id: winner.id}, 
			{
				$setOnInsert: {user_login: winner.login}, 
				$inc: {
					"poker.games": 1, 
					"poker.wins": 1, 
					"poker.total": lostPoints
				}
			}, 
			{upsert: true});

		ludomans.updateOne(
			{user_id: loser.id}, 
			{
				$setOnInsert: 
					{user_login: loser.login}, 
				$inc: {
					"poker.games": 1, 
					"poker.total": -lostPoints
				}
			},
			{upsert: true});

		if (this.showRiverAtTheEnd) this.say(`[RIVER] ${this.row.join(', ')}`);
		
		let log = `[FINISHED]: ${message}: ${winner.login} wins $${loser.inBank}`;

		this.say(`***${log}***`);
		
		pokerLog(log, `good`);

		games = games.filter(game=>game.id!==this.id);
	}

	setClock () {
		this.timeout = setTimeout(()=>{
			this.loser = this.currentTurnPlayer;
			this.winner = this.waitingTurnPlayer;
			this.finish('TIMEOUT');
		}, 2 * 60 * 1000);
	}

	getCardRow () {
		let cardRow;
		switch (this.stage) {
			case 2:
				cardRow = `[FLOP] ${this.row.slice(0, 3).join(', ')}`;
				break;
			case 3:
				cardRow = `[TURN] ${this.row.slice(0, 4).join(', ')}`;
				break;
			case 4:
				cardRow = `[RIVER] ${this.row.join(', ')}`;
		}	
		return cardRow;
	}
	
	endOfTurn (msg, endOfRound) {

		let b = this.currentTurnPlayer;

		this.currentTurnPlayer = this.waitingTurnPlayer;

		this.waitingTurnPlayer = b;

		this.say(msg);

		if (endOfRound) {
			this.checked = false;
			let cardRow = this.getCardRow();
			this.roundBet = 0;
			this.say(cardRow);
		}

		this.say(`${this.currentTurnPlayer.login}'s turn. Options: ${this.options.join(', ')}`);

		pokerLog(`[TURN]: ${this.currentTurnPlayer.login}'s turn`, `warning`);

		this.setClock(); // setting the timeout
	}

// ----------------------- BET --------------------------

	bet (bet) {

		let {currentTurnPlayer} = this;

		if (!bet) bet = 100;

		clearTimeout(this.timeout);

		if (bet === 'all') {
			bet = currentTurnPlayer.left;  
		} else if (isNaN(parseInt(bet))) {
			pokerLog(`${currentTurnPlayer.login} entered invalid bet: ${bet}`, `warning`);
			return `Invalid bet`
		} else {
			bet = parseInt(bet);
		}


// the current player should have enough money left to make a certain bet

		if(currentTurnPlayer.left < bet) { 
			pokerLog(`${currentTurnPlayer.login} bet impossible: ${bet}. They have: ${currentTurnPlayer.left}`, `warning`); 
			this.setClock();
			return `Not possible: you have only ${currentTurnPlayer.left}`;
		} 

// if the current player makes bet which is equal or greater than opp's savings he forces the end of the game

		if (bet >= this.waitingTurnPlayer.left) { 
			pokerLog(`${currentTurnPlayer.login} forces all-in`, `warning`);
			if (this.stage !== 4) {
				this.showRiverAtTheEnd = true;
			}
			bet = this.waitingTurnPlayer.left;
			this.stage = 4;
			this.options = ['call', 'fold'];

		} else {

// if the current player won't have any money after this bet, it's going to be the last round

			if (!(currentTurnPlayer.left - bet)) { 
				pokerLog(`${currentTurnPlayer.login} all-ins!`, `warning`);
				if (this.stage !== 4) {
					this.showRiverAtTheEnd = true;
				}
				this.stage = 4;
				this.options = ['call', 'fold'];
			} else {
				// if it's regular bet, stage stays the same and opp can call and raise
				this.options = ['call', 'raise', 'fold'];
			}

		}

// regular bet procedures

		currentTurnPlayer.inBank += bet;	
		currentTurnPlayer.left -= bet;
		this.bank += bet;
		this.roundBet = bet;

		this.endOfTurn(`${currentTurnPlayer.login} bet $${bet}!`); // switch turns

	}

// ---------------------- CALL ----------------------
	
	call () {

		clearTimeout(this.timeout);

// call is always possible

		this.currentTurnPlayer.left = this.currentTurnPlayer.bankroll - this.waitingTurnPlayer.inBank;
		
		this.currentTurnPlayer.inBank = this.waitingTurnPlayer.inBank;	

		this.bank = this.waitingTurnPlayer.inBank * 2; 

		this.stage++;

// if next round is 5, it is the finish.

		if (this.stage === 5) {

			// says the winner with some delay;

			this.say(`${this.currentTurnPlayer.login} calls!`);

			this.finish();

			return;

		}

// if it is not, turns switch, stage increments, options and check-state reset, 
// cardRow gets new cards and after restarting the clock outputs all relevant cards into the chat

		this.options = ['bet', 'check'];

		this.endOfTurn(`${this.currentTurnPlayer.login} calls!`, true);
	
	}

// ---------------------- RAISE ----------------------
	
	raise (extrabet) {

		let {currentTurnPlayer} = this;

		clearTimeout(this.timeout);

// default raise bet 

		if (!extrabet) extrabet = 100;

		let callbet = this.waitingTurnPlayer.inBank - currentTurnPlayer.inBank;  

		if (extrabet === 'all') {
			extrabet = currentTurnPlayer.left - callbet;  
		} else if (isNaN(parseInt(extrabet))) {
			pokerLog(`${currentTurnPlayer.player} entered invalid extrabet: ${extrabet}`, `warning`);
			return `Invalid bet`
		} else {
			extrabet = parseInt(extrabet);
		}

// raise bet = call bet + extra bet

		let	raise = callbet + extrabet;
		
		if(currentTurnPlayer.left < raise) {
			pokerLog(`${currentTurnPlayer.login} extrabet impossible: ${extrabet}. They have: ${currentTurnPlayer.left}`, `warning`); 
			this.setClock();
			return `Not possible. You have only ${currentTurnPlayer.left} left`;
		} 

// bet checks if the situation becomes final for one of the players

// for the waiting player

		if (extrabet >= this.waitingTurnPlayer.left) {
			pokerLog(`${currentTurnPlayer.login} forces all-in`, `warning`);
			if (this.stage !== 4) {
				this.showRiverAtTheEnd = true;
			}

			this.stage = 4;
			raise = callbet + waitingTurnPlayer.left;
			this.options = ['call', 'fold'];

// for the current player

		} else {
			if (!(currentTurnPlayer.left - raise)) {
				pokerLog(`${currentTurnPlayer.login} all-ins`, `warning`);
				if (this.stage !== 4) {
					this.showRiverAtTheEnd = true;
				}

				this.stage = 4; 
				this.options = ['call', 'fold'];
			} else {
				this.options = ['call', 'raise', 'fold'];
			}
		}

		this.bank += raise;
		currentTurnPlayer.left -= raise;
		currentTurnPlayer.inBank += raise;
		this.roundBet += raise;

		this.endOfTurn(`${currentTurnPlayer.login} raises to $${this.roundBet}!`);

	}

// ----------------------- FOLD ---------------------------

	fold () {
		clearTimeout(this.timeout);
		this.say(`${this.currentTurnPlayer.login} folded!`);
		this.loser = this.currentTurnPlayer;
		this.winner = this.waitingTurnPlayer;
		this.finish('FOLD');
	}

// ----------------------- CHECK ----------------------------

	check () {

		clearTimeout(this.timeout);

		let str = `${this.currentTurnPlayer.login} checked!`;

// if one player has already checked endOfTurn, stage increments
// if last player hasn't checked before, stage stays the same, end of turn


		if (this.checked) {
			this.stage++;

			if(this.stage == 5) {
				this.say(str);
				this.finish();
				return;
			}

			this.checked = false;

		} else {

			this.checked = true;
		}

		this.endOfTurn(str, !this.checked);
	}

};

