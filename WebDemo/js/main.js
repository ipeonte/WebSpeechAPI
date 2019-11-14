var PARTIAL_TEXT = "Please enter last 4 digits of serial number.";
var PARTIAL_REPEAT_TEXT = "Serial number doesn't match. Please repeat last 4 digits of serial number.";
var FULL_TEXT = "Please say the full serial number.";
var ENTER_FULL_TEXT = "Serial number doesn't match. Please enter the full serial number.";
var UNKNOWN_STATE = "System error. Unknown state.";
var INVALID_ENTRY = "Invalid entry. Please repeat.";
var DONE = "Done !";

// msg.voice = speechSynthesis.getVoices().filter(function(voice) { return voice.name == 'Whisper'; })[0];
var VOICE = speechSynthesis.getVoices().filter(function(voice) { return voice.name == 'Whisper'; })[0];

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
var grammar = '#JSGF V1.0; grammar letters; public <letters> = ' + letters.join(' | ') + ' ;';

var recognition = new SpeechRecognition();
var speechRecognitionList = new SpeechGrammarList();
speechRecognitionList.addFromString(grammar, 1);
recognition.grammars = speechRecognitionList;
recognition.lang = 'en-US';
recognition.continuous = true;
recognition.interimResults = false;
recognition.maxAlternatives = 1;

// Recognition state
// 1 - partial info required
// 2 - repeat partial info
// 3 - second repeat partial info
// 4 - enter full info

// 101 - Manual entry for partial info
// 102 - Manual entry for full info

// 0 - done

// -1 - invalid partial entry
// -4 - invalid full entry
var STATE = 0;

// Serial number
var SN;

// Length of text required to match SN
var SN_LEN;

// Recognition started flag
var FLISTEN = false;

// Recognition Text
var RTEXT = "";

$(document).ready(function() {
	// $("#speak").click();

	SN = get_url_param("sn");
	SN_LEN = SN !== undefined ? 4 : 11;
});

function main() {
	if (!FLISTEN) {
		listen();
		FLISTEN = true;
	}

	STATE = SN !== undefined ? 1 : 4;
	run();
}

function run() {
	console.log("STATE: " + STATE);

	switch (STATE) {
	case -1:
	case -2:
	case -3:
	case -4:
		setTimeout(function() {
			clear_sn_text();
		}, 500);
		play_sound(INVALID_ENTRY);
		STATE = -STATE;
		break;
	case 1:
		play_sound(PARTIAL_TEXT);
		break;
	case 2:
	case 3:
		setTimeout(function() {
			clear_sn_text();
		}, 500);
		play_sound(PARTIAL_REPEAT_TEXT);
		break;
	case 4:
		setTimeout(function() {
			clear_sn_text();
		}, 500);
		play_sound(FULL_TEXT);
		break;
	case 0:
		setTimeout(function() {
			clear_sn_text();
		}, 500);
		console.log("== " + SN + " ==");
		recognition.stop();
		play_sound(DONE);

		STATE = 1;
		FLISTEN = false;
		break;
	default:
		play_sound(UNKNOWN_STATE);
	}
}

function play_sound(message) {
	$("#speech").html(message);
	speak(message);
}

function speak(message) {
	var msg = new SpeechSynthesisUtterance(message);
	msg.voice = VOICE;
	speechSynthesis.speak(msg);
}

function listen() {
	$("#letters").html("");
	recognition.start();
}

recognition.onresult = function(event) {
	var last = event.results.length - 1;
	var letters = event.results[last][0].transcript;

	$("#letters").html(letters);
	console.log("input: " + letters);

	// Go uppercase and strip spaces
	letters = letters.replace(/\s/g, '').toUpperCase();
	$("#sn_text").html(letters);
	console.log("sn_text: " + letters);

	switch (STATE) {
	case 1:
		match_partial_sn(letters, 1);
		break;
	case 2:
	case 3:
		match_partial_sn(letters, 2);
		break;
	case 4:
		match_full_sn(letters);
		break;
	default:
		play_sound(UNKNOWN_STATE);
	}
	// play_sound(PARTIAL_REPEAT_TEXT);
};

function match_full_sn(letters, state) {
	set_sn_text(RTEXT + letters);

	if (!match_length(letters, 11)) {
		run();
		return;
	}

	// Take as is
	STATE = 0;
	// The end
	run();
}

function match_partial_sn(letters, state) {
	set_sn_text(RTEXT + letters);

	// Check if 4 letters received
	if (letters.length != 4) {
		if (letters.length > 4) {
			STATE = -1;
			run();
		}

		return;
	}

	// Match last 4 numbers
	if (SN.substr(7) == letters) {
		STATE = 0;
		// The end
		run();
	} else {
		STATE++;
		run();
	}
}

function match_length(letters, len) {
	// Check all 11 letters received
	if (letters.length != len) {
		if (letters.length > len) {
			STATE = -STATE;
		}

		return false;
	}

	return true;
}

recognition.onspeechend = function() {
	console.log("end");
	// recognition.stop();
};

recognition.onnomatch = function(event) {
	console.error("I didn't recognise that color.");
};

recognition.onerror = function(event) {
	console.error('Error occurred in recognition: ' + event.error);
};

function get_url_param(name) {
	url = location.search;
	if (url === undefined || url == "")
		return;

	var query = url.substr(1);
	var result;
	query.split("&").forEach(function(part) {
		var item = part.split("=");
		if (item[0] == name)
			result = decodeURIComponent(item[1]);
	});

	return result;
}

function add_number(btn) {
	if (STATE <= 100) {
		STATE = SN_LEN == 4 ? 101 : 102;
		clear_sn_text();
	}

	var cell = $(btn);
	var num = cell.text();
	set_sn_text(RTEXT + num);
	console.log(num);

	cell.css("background-color", "#a1ec51");

	setTimeout(function() {
		cell.css("background-color", "#e3f0d5");
	}, 500);

	if (RTEXT.length == SN_LEN) {
		if (SN_LEN == 4) {
			if (SN.substr(7) == RTEXT) {
				STATE = 0;
				// The end
				run();
			} else {
				// Enter full sn
				SN_LEN = 11;
				STATE++;
				play_sound(ENTER_FULL_TEXT);
				clear_sn_text();
			}
		} else {
			// Takes entry as is
			STATE = 0;
			// The end
			run();
		}
	}
}

function clear_sn_text() {
	set_sn_text("");
}

function set_sn_text(msg) {
	RTEXT = msg;
	$("#sn_text").html(msg);
}