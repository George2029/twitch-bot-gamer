import {auth} from './../requests/auth.js';
import {getChatters} from './../requests/getChatters.js';
import {findOneAndUpdate} from './../db/findOneAndUpdate.js';
import {pokerLog} from './../../../../utils/logger.js';
import {createGame, getGame, allowedToCreate} from './ludostuff/Poker.js';
import {whisper} from './ludostuff/whisper.js';

export let poker = ({user_type: {broadcaster}, user: {user_id, user_login}, params, name, say}) => 

	new Promise( async (res, rej) => { 

		params = params?.toLowerCase();

		switch (name) {

			case 'poker':

				let authorized = await auth(user_id, broadcaster); 
				if (!authorized) 
					return res('Unauthorized');

				if (!params) 
					return res(`To play enter opp's nickname. Note: Players should be followers and allow whispers from bot`);

				say(`Please wait, sending test whispers...`);

				let permission = allowedToCreate(user_id);

				if(!permission.status) {
					 return res(`Not possible: ${permission.reason}`);
				}

				// if a permission has been given:

				let [opp, bet] = params.toLowerCase().split(' ');

				if (opp === process.env.bot) 
					return res(`Bots can't play with you:(`);

				if (opp === user_login) 
					return res(`You can't play with yourself`);

				// starting to check bunch of things to start a game..

				let host = await findOneAndUpdate(user_id, user_login);

				if (bet === 'all') {
					bet = host.points;

				} else {
					bet = parseInt(bet) || 100;
				}

				if (bet < 100) 
					return res(`Bet should be bigger than 100`);

				if (host.points < bet) 
					return res('Not enough points');

				let hostMessage = 'Hello this is a test message to see if I can send you cards privately';

				let hostWhisper = await whisper(user_id, hostMessage, say);

				if (hostWhisper === false) 
					return res(`You might have enabled blocking messages from strangers. Cancelling the game`);
				if (hostWhisper === 429) 
					return res(`Haven't managed to handle Twitch restrictions :(`);

				let chatters = await getChatters();

				opp = chatters.find(chatter=> chatter.user_login === opp); 

				if (!opp) 
					return res(`Not found in the chat. Maybe it's due to a twitch delay`);

				let isOppAuthorized = await auth(user_id, broadcaster); 
				if (!isOppAuthorized) 
					return res('Opp should be a follower too');

				opp = await findOneAndUpdate(opp.user_id, opp.user_login);

				if(opp.points < 100) 
					return res(`Opp has less than 100 points.`);

				if(opp.points < bet) {
					bet = opp.points;
				}

				let oppMessage = `Hello ${opp.user_login}, ${user_login} wants to play with you. To accept their challenge, enter !call in chat.`;

				let oppWhisper = await whisper(opp.user_id, oppMessage, say);
	
				if (oppWhisper === false) 
					return res(`${opp.user_login} might have enabled blocking messages from strangers. Cancelling the game`);

				if (oppWhisper === 429) 
					return res(`Haven't managed to handle Twitch restrictions :(`);


			// ----------------------

				createGame({

					host: {
						id: user_id, 
						login: user_login,
						bankroll: host.points,
						inBank: bet,
						left: host.points - bet
					},

					opp: {
						id: opp.user_id, 
						login: opp.user_login,
						bankroll: opp.points,
						inBank: bet,
						left: opp.points - bet
					},

					say,
 
				});

				return res(`Created a game. Waiting for the ${opp.user_login} to enter '!call'`);

			case 'call':
			case 'fold':
			case 'check':
			case 'bet':
			case 'cancel':
			case 'reject':
			case 'raise':

					// for !cancel !reject !call !bet !raise !fold !check commands

					let game = getGame(user_id);

					if (!game) {

						return res(`You're not playing atm`);
					}
					
					if (!game.active) {

						switch (name) {

							case 'call':

								if (game.opp.id !== user_id) return res('You cannot start game with yourself');

								clearTimeout(game.autocancelling);

								game.active = true;

								return res(game.start());
								
							case 'cancel':
							case 'reject':

								let verb = name === 'cancel' ? 'cancelled' : 'rejected';
								clearTimeout(game.autocancelling);
								let log = `[${name.toUpperCase()}]: ${user_login} ${verb} the 
												game ${game.host.login} VS ${game.opp.login}`;
								game.cancel(log);
								return res();
						}

						return res('!call, !reject, !cancel');
					}

					if (game.currentTurnPlayer.id !== user_id) return res(`Opp's turn`); 

					if (!game.options.some(option => option === name)) return res(`No such option`);

					return res(game[name](params));
// switch end
			}


	});
