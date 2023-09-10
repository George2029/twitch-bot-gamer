import {auth} from './../requests/auth.js';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {EventEmitter} from 'node:events';
import {findOneAndUpdate} from './../db/findOneAndUpdate.js';
import {shuffleBJDeck} from './ludostuff/shuffleBJDeck.js';
import {BlackjackHand} from './ludostuff/BlackjackHand.js';
import {updatePoints} from './../db/updatePoints.js';
import {ludomans} from './../db/index.js'; 

let gamesArr = [];

let bjDocs = `"dd" stands for Double Down which is double bet with condition that player is dealt with exactly 1 more card. "insur" stands for Insurance which is a side bet which pays 2:1 when a dealer has BJ, and it's asked for whenever the dealer's face-up card is Ace. "sur" stands for Surrender, which is resigning from a game, while losing 1/2 of the original bet. The dealer hits on soft 17. BJ payouts are 3:2. For vips it's 2:1. Single deck`;

let Blackjack = class extends EventEmitter {
	static counter = 0;
	static docs = bjDocs; 

	constructor({user_id, user_login, bet, vip, left, say}) {
		super();
		this.id = Blackjack.counter++;

		this.gamblerId = user_id; 
		this.gambler = user_login; 
		this.left = left;							 
		this.say = say;
		this.deck = shuffleBJDeck();
		this.coeff = vip ? 2 : 1.5;
		this.hands = [];
		this.dealerHand = null;
		this.options = [];
		this.currentHandIndex = 0;
		this.bet = bet;
		this.sidebet = 0;
		this.finished = false;
	}
	
	start () {

		this.say(`${this.gambler}'s game has started!`);

		let gamblerDeal = [this.deck.pop(), this.deck.pop()];
		let newGamblerHand = new BlackjackHand(gamblerDeal, this.bet);
		this.hands.push(newGamblerHand);
		this.currentHand = this.hands[0];

		this.say(`${this.gambler} draws ${this.currentHand.info}. (${this.currentHand.value})`);

		if (this.currentHand.blackjack) { 
			this.say(`${this.gambler} GOT A BLACKJACK!`);
		}

		let faceUp = this.deck.pop();
		let dealerDeal = [faceUp, this.deck.pop()];
		let newDealerHand = new BlackjackHand(dealerDeal);
		this.dealerHand = newDealerHand;	

		this.say(`The dealer draws ${faceUp.title}. (${faceUp.value})`)

		if (this.currentHand[0].value === this.currentHand[1].value) {
			this.options = ['hit', 'stand', 'dd', 'split', 'sur']; 
		} else {
			this.options = ['hit', 'stand', 'dd', 'sur']; 
		}

		if (faceUp.value === 11) {
			this.say(`Insurance available! (${Math.floor(this.bet)}$)`);
			this.backup = this.options.slice();
			this.options = ['accept', 'decline'];
			return this.say(`${this.gambler}, !${this.options.join(', !')}`);
		}
		
		if (this.currentHand.blackjack) {
			return this.finish();	
		} else {
			this.say(`${this.gambler}, !${this.options.join(', !')}`);
		}
	}

	finish (surrendered) {
		return new Promise (async (res, rej) => {

			this.say(`${this.gambler} finishing...`);

			let winnings = this.sidebet;
			let games = 0;
			let draws = 0;
			let wins = 0;

			if (!surrendered) {

				let showDealerCards = this.hands.some(hand=>!hand.busted);

				if (showDealerCards) {
					this.resolveDealerHand();
				}

				// calc hands which are <= 21 (as others are calced in hitting section);

				const dealerWin = (hand) => { 
					return hand.value < this.dealerHand.value && !this.dealerHand.busted || 
					this.dealerHand.blackjack && !hand.blackjack 
				}

				this.hands.forEach((hand)=>{
					if(!hand.busted) {
						this.say(`${hand.info} (${hand.value}) VS ${this.dealerHand.info} (${this.dealerHand.value})`)
					} else {
						winnings -= hand.bet; 
						this.say(`${hand.info} (${hand.value}) BUSTED! -${hand.bet}$`);
						games++;
						return;
					}

					if (dealerWin(hand)) {
						this.say(`${this.gambler} loses ${hand.bet}$`);
						winnings -= hand.bet; 
					} else if (
						this.dealerHand.busted || 
						hand.value > this.dealerHand.value || 
						!this.dealerHand.blackjack && hand.blackjack 
					) {
						let payout = hand.bet * this.coeff;
						this.say(`${this.gambler} wins ${payout}$!`);
						winnings += payout;
						wins++;
					} else {
						this.say(`DRAW!`);
						draws++;
					}
					games++;
				})

				if (this.hands.length > 1 || this.sidebet) {
					this.say(`In total: ${winnings}$!`);
				} else {
					games = 1;
				}
			}

			await updatePoints(this.gamblerId, winnings);

			ludomans.updateOne(
				{user_id: this.gamblerId}, 
				{
					$setOnInsert: 
						{user_login: this.gambler}, 
						$inc: 
						{"blackjack.games": games, "blackjack.wins": wins, "blackjack.total": winnings}
				},
				{upsert: true}
			);

			// remove itself 

			//this.finished = true;

			gamesArr = gamesArr.filter(game=>game.id !==this.id);

			return res(`TFP!`);

		});
	}

	handOver () {
		if (this.hands[this.currentHandIndex + 1]) {
			this.currentHand = this.hands[++this.currentHandIndex];
			this.say(`${this.gambler}, switching to your next hand! ${this.currentHand.info}. (${this.currentHand.value})`)
			if (this.currentHand.blackjack) { 
				this.say(`${this.gambler} GOT A BLACKJACK!`);
				return this.handOver();
			}
			if (this.currentHand[0].value === this.currentHand[1].value) {
				this.options = ['hit', 'stand', 'dd', 'split', ]; 
			} else {
				this.options = ['hit', 'stand', 'dd', ]; 
			}
			this.say(`${this.gambler}, !${this.options.join(', !')}`);
			
			
		} else {
			return this.finish();
		}
	}


		// resolving dealer's hand 
		// take cards till it gets to hard 17 (sum of card values is 17 and cannot be changed (i.e. no aces))
		// or the dealer gets busted (score > 21)
		// show how dealer draws cards if they need

	resolveDealerHand () {

		this.say(`The dealer shows his hand: ${this.dealerHand.info} (${this.dealerHand.value})`);
		if (this.dealerHand.value === 21) {	
			this.say(`The dealer has a BLACKJACK!`);
		}

		while(this.dealerHand.value < 17) {
			let newCard = this.deck.pop();
			this.dealerHand.push(newCard);	
			this.say(`The dealer draws ${newCard.title}. (${this.dealerHand.value})`);
		}
		if (this.dealerHand.value > 21) {
			this.say(`The dealer BUSTED!`);
		} else {
			this.say(`The dealer is ready!`);
		}

	}  

 	// ---------------------------- GAME OPTIONS ---------------------------------

	hit () {
		let card = this.deck.pop();
		this.currentHand.push(card);
		this.say(`${this.gambler} draws ${card.title}. (${this.currentHand.value})`)
		
		if(this.currentHand.busted) {
			this.say(`${this.gambler} BUSTED! (${this.currentHand.value})`);
			return this.handOver();
		} else if (this.currentHand.resolved) {
			this.say(`${this.gambler} scored exactly 21!`);
			return this.handOver();			
		} else {
			this.options = ['hit', 'stand'];
			this.say(`${this.gambler}, !${this.options.join(', !')}`);
		}
	}

	stand () {
		this.say(`${this.gambler} stands!`);
		this.currentHand.resolved = true;	
		return this.handOver();
	}

	dd () {
		if (this.gambler.left < this.bet) 
			return `Not enough bankroll`;
		this.currentHand.bet *= 2;
		let card =  this.deck.pop();
		this.currentHand.push(card);
		this.say(`${this.gambler} draws ${card.title}. (${this.currentHand.value})`);

		if(this.currentHand.value > 21) {
			this.say(`${this.gambler} BUSTED!`);
		}

		return this.handOver();
	}

	accept () {
		// sidebet which equals to half the original bet and pays 2:1 if dealer has a blackjack
		// add it to this.sidebet only in case of bj absence (as bj makes it draw and finish)

		let halfbet = Math.floor(this.bet / 2);

		if(this.gambler.left < halfbet) 
			return `Not enough bankroll`;

		this.say(`${this.gambler} accepts insurance! (-${halfbet}$)`);

		if (this.dealerHand.blackjack) {
			this.say(`${this.gambler} got it right! The dealer indeed has a BLACKJACK: ${this.dealerHand.info}! (+${this.bet})`);
			this.sidebet += this.bet;
			return this.finish();
		} else {
			this.sidebet -= halfbet;
			this.say(`${this.gambler} releived, you discover the dealer does not have a blackjack.`);
			this.options = this.backup;
			this.say(`${this.gambler}, !${this.options.join(', !')}`);
		}
	}

	decline () {
		this.say(`${this.gambler} rejects insurance.`);
		this.options = this.backup;
		this.say(`${this.gambler}, !${this.options.join(', !')}`);
	}
	
	async sur () {
		// forfeit the game losing half the bet

		this.sidebet = -Math.floor(this.bet / 2);	
		this.say(`The cowardly ${this.gambler} flees from battle. ${this.sidebet}$`);

		return this.finish('sur'); 
	}
	
	split () {

		this.say(`${this.gambler} splits!`);

		let splitted = this.currentHand.pop();
		let newCard = this.deck.pop();

		// adding new card to splitted hand

		let newCard2 = this.deck.pop();

		this.currentHand.push(newCard);

		let newHand = new BlackjackHand([splitted, newCard2], this.bet)

		this.hands.push(newHand);	

		this.say(`${this.gambler} draws ${newCard.title} for his previous hand: ${this.currentHand.info} (${this.currentHand.value}). And ${newCard2.title} for a new one: ${this.hands[this.hands.length - 1].info} (${this.hands[this.hands.length - 1].value})`);

		if (this.currentHand.blackjack) {
			this.say(`${this.gambler} got a BLACKJACK!`);
			return this.handOver();
		}

		// new array for new hand

		if (this.currentHand[0].value === this.currentHand[1].value) {
			this.options = ['hit', 'stand', 'dd', 'split', ]; 
		} else {
			this.options = ['hit', 'stand', 'dd', ]; 
		}

		this.say(`${this.gambler}, current hand: ${this.currentHand.info} (${this.currentHand.value}). !${this.options.join(', !')}.`);

	}

// ----------------------------- END OF CLASS --------------------------	
	
}

export let blackjack = ({user: {user_id, user_login}, user_type: {broadcaster, vip}, params, name, say, reply}) =>
	new Promise (async (res, rej) => {
		switch (name) {
			case 'blackjack':
				break;
			case 'hit':
			case 'stand':
			case 'split':
			case 'dd':
			case 'sur':
			case 'accept':
			case 'decline':
				let userGame = gamesArr.find(game=>game.gamblerId===user_id);
				if(!userGame)
					return res(`You're not playing atm`);
				if (!userGame.options.some(option=> option === name))
					return res(`No such option`);
				return res(userGame[name]());
		}
		let fol = await auth(user_id, broadcaster);	
		if (!fol) 
			return res(`For followers`);
		if (gamesArr.some(game=>game.gamblerId===user_id))
			return res(`You're already playing`)
		let gambler = await findOneAndUpdate(user_id, user_login);		
		let bet = parseInt(params) || 100;
		if (bet < 100)
			return res(`100 is min bet`);
		if (bet > gambler.points)
			return res(`Not enough points`);

		let game = new Blackjack({
				user_id,
				user_login,
				bet,
				left: gambler.points - bet,
				vip,
				say
			})	

		gamesArr.push(game);

		return res(game.start());
	});

//let newGame = new Blackjack({user_id: '139061679', user_login: 'puzzz0', bet: 500, vip: true, left: 8100, say: console.log});

//await newGame.start();

//const rl = readline.createInterface({ input, output });

//while(!newGame.finished) {
//	const ans = await rl.question('turn: ');
//	await newGame[ans]();
//}

//await rl.close();
