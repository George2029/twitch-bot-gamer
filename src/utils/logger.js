import chalk from 'chalk';
import fs from 'fs';

// styles

const {

	blue, 
	red, 
	green, 
	magenta, 
	cyan, 
	yellow,

	bold, 
	italic

} = chalk;

let hex = chalk.hex.bind(chalk);

const orange = hex('#FFA500');
const violet = hex('#7f00ff');

// header styles

const headerStyles = {

	esws: magenta,
	irc: cyan,
	user: blue,
	auth: red,
	inet: red,
	req: orange,
	poker: violet,
	timer: green
}

// find headers property with max length and return its length
// we need it to calclute padding

let maxLength = Object.keys(headerStyles).sort((a, b) => b.length - a.length)[0].length;

// transform headers obj to array of arrays (key-value pairs) 
// change second element of each key-value array to padded and stylized version of the first element (key)  
// assemble object back and return it to a new variable: stylizedHeaders

const stylizedHeaders = Object.fromEntries(

	Object.entries(headerStyles)
		.map(
				([a, b]) => 
					[a, 
						b(a.padStart(maxLength))
					]
			)
);

let tones = {
	error: bold.red,
	warning: orange,
	good: green,
	user_input: italic.cyan,
	reconnecting: hex(`#f72d00`)
}

const timestyle = blue;

const getTimestamp = () => {

	let date = new Date();
	return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}:${date.getMilliseconds().toString().padStart(3, '0')}`; 

}

const logToFile = (text) => {
	fs.appendFile('file.log', text, err => {
  		if (err) {
   			console.error(err);
  		}
  		// done!
	});
}




// ------------------------------------------- //


export default (from, msg, tone) => {

	let timestamp = getTimestamp();

	let stylizedTs = timestyle(timestamp);

	let stylized_msg = tones[tone](msg);

	let plaintext = `${timestamp} | ${from.padStart(maxLength, ' ')} | ${msg}\n`;

	logToFile(plaintext);

	let log = `${stylizedTs} | ${stylizedHeaders[from]} : ${stylized_msg}`;

	console.log(log);
}

// ------------------------- POKER ------------------------

export let pokerLog = (msg, tone) => {

	let ts = getTimestamp();
	let paddedHeader = 'poker'.padStart(maxLength, ' ');

// to file

	let plaintext = `${ts} | ${paddedHeader} | ${msg}`; 	

	logToFile(plaintext);

// to console

	let stylizedMsg = tones[tone](msg);	
	let stylizedTs = timestyle(ts); 
	let log = `${stylizedTs} | ${stylizedHeaders.poker} | ${stylizedMsg}`;
	console.log(log);
		
}

export let performanceLog = (from, msg) => {
	let timestamp = getTimestamp();
	let paddedHeader = 'timer'.padStart(maxLength, ' ');
	let stylizedTs = timestyle(timestamp);
	let plaintext = `${timestamp} | ${paddedHeader} | [${from}]: ${msg}`; 

	logToFile(plaintext);

	let log = `${stylizedTs} | ${stylizedHeaders.timer} | ${orange(from)} : ${yellow(msg)}`;
	console.log(log);
}
