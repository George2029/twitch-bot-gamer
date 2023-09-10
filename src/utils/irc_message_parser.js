export default (message) => {
	let parsedMessage = {
		command: null,
		parameters: null,
		source: null,
		tags: null
	}
   	
	let idx = 0;
 
	let rawTagsComponent = null;
    	let rawSourceComponent = null; 
    	let rawCommandComponent = null;
    	let rawParametersComponent = null;
	    
	if (message[idx] === '@') {  // The message includes tags.
       		let endIdx = message.indexOf(' ');
        	rawTagsComponent = message.slice(1, endIdx);
        	idx = endIdx + 1; // Should now point to source colon (:).
    	}

	// Get the source component (nick and host) of the IRC message.
    	// The idx should point to the source part; otherwise, it's a PING command.

    	if (message[idx] === ':') {
       		idx += 1;
        	let endIdx = message.indexOf(' ', idx);
        	rawSourceComponent = message.slice(idx, endIdx);
        	idx = endIdx + 1;  // Should point to the command part of the message.
    	}
    	// Get the command component of the IRC message.

    	let endIdx = message.indexOf(':', idx);  // Looking for the parameters part of the message.
    	if (-1 == endIdx) {                      // But not all messages include the parameters part.
       		endIdx = message.length;                 
    	}
	rawCommandComponent = message.slice(idx, endIdx).trim();
    	if (endIdx != message.length) {  // Check if the IRC message contains a parameters component.
       		idx = endIdx + 1;            // Should point to the parameters part of the message.
        	rawParametersComponent = message.slice(idx);
    	}

 	parsedMessage.command = parseCommand(rawCommandComponent);
   	// Only parse the rest of the components if it's a command
    	// we care about; we ignore some messages.
    	if (null == parsedMessage.command) {  // Is null if it's a message we don't care about.
       		return null; 
    	}
    	else {
        	if (null != rawTagsComponent) {  // The IRC message contains tags.
		     	parsedMessage.tags = parseTags(rawTagsComponent);
        	}

        	parsedMessage.source = parseSource(rawSourceComponent);

        	parsedMessage.parameters = rawParametersComponent;
        	if (rawParametersComponent && rawParametersComponent[0] === '!') {  
            	// The user entered a bot command in the chat window.            
	            	parsedMessage.command = parseParameters(rawParametersComponent, parsedMessage.command);
        	}
    	}

    return parsedMessage;
}

function parseCommand(rawCommandComponent) {
    let parsedCommand = null;
    let commandParts = rawCommandComponent.split(' ');

    switch (commandParts[0]) {
        case 'JOIN':
		parsedCommand = {
			command: commandParts[0],
			channel: commandParts[1]
		}
		break;
        case 'PART':
		parsedCommand = {
			command: commandParts[0],
			channel: commandParts[1]
		}
		break;
        case 'NOTICE':
        case 'CLEARCHAT':
        case 'HOSTTARGET':
        case 'PRIVMSG':
            parsedCommand = {
                command: commandParts[0],
                channel: commandParts[1]
            }
            break;
        case 'PING':
            parsedCommand = {
                command: commandParts[0]
            }
            break;
        case 'CAP':
            parsedCommand = {
                command: commandParts[0],
                isCapRequestEnabled: (commandParts[2] === 'ACK') ? true : false,
                // The parameters part of the messages contains the 
                // enabled capabilities.
            }
            break;
        case 'GLOBALUSERSTATE':  // Included only if you request the /commands capability.
                                 // But it has no meaning without also including the /tags capability.
            parsedCommand = {
                command: commandParts[0]
            }
            break;               
        case 'USERSTATE':   // Included only if you request the /commands capability.
        case 'ROOMSTATE':   // But it has no meaning without also including the /tags capabilities.
            parsedCommand = {
                command: commandParts[0],
                channel: commandParts[1]
            }
            break;
        case 'RECONNECT':  
            console.log('The Twitch IRC server is about to terminate the connection for maintenance.')
            parsedCommand = {
                command: commandParts[0]
            }
            break;
        case '421':
            console.log(`Unsupported IRC command: ${commandParts[2]}`)
            return null;
        case '001':  // Logged in (successfully authenticated). 
            parsedCommand = {
                command: commandParts[0],
                channel: commandParts[1]
            }
            break;
        case '002':  // Ignoring all other numeric messages.
        case '003':
        case '004':
        case '353':  // Tells you who else is in the chat room you're joining.
        case '366':
        case '372':
        case '375':
        case '376':
            return null;
        default:
            console.log(`\nUnexpected command: ${commandParts[0]}\n`);
            return null;
    }

    return parsedCommand;
}

function parseTags(tags) {
	let dictParsedTags = {};
	let parsedTags = tags.split(';');
	parsedTags.forEach(tag=> {
		let parsedTag = tag.split('=');  // Tags are key/value pairs.
       	let tagValue = (parsedTag[1] === '') ? null : parsedTag[1];
		switch (parsedTag[0]) {  // Switch on tag name

					case 'badges': 
						if(tagValue) { 
							let [key, val]  = tagValue.split('/');
							if(key == 'broadcaster') {
								dictParsedTags[key] = !!parseInt(val);
							}	
						}
						break;
					case 'id':
						dictParsedTags[parsedTag[0]] = tagValue;
						break;
					case 'user-id':
						dictParsedTags.user_id = tagValue;
						break;
					case 'vip':
					case 'mod':
						dictParsedTags[parsedTag[0]] = !!parseInt(tagValue);
						break;
		}
	})
	return dictParsedTags;
} 


function parseSource(rawSourceComponent) {
    if (null == rawSourceComponent) {  // Not all messages contain a source
        return null;
    }
    else {
        let sourceParts = rawSourceComponent.split('!');
        return {
            nick: (sourceParts.length == 2) ? sourceParts[0] : null,
            host: (sourceParts.length == 2) ? sourceParts[1] : sourceParts[0]
        }
    }
}

function parseParameters(rawParametersComponent, command) {
    let commandParts = rawParametersComponent.slice(1); 
    let paramsIdx = commandParts.indexOf(' ');

    if (-1 == paramsIdx) { // no parameters
        command.botCommand = commandParts.slice(0); 
    }
    else {
        command.botCommand = commandParts.slice(0, paramsIdx); 
        command.botCommandParams = commandParts.slice(paramsIdx + 1);
    }

    return command;
}
