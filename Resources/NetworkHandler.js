/*
1. get url
2. get cloud
3. get zip
4. cache?

features:
	cross platform
	background loading
	? ETA * based on last N seconds
	? minimal update interval
	? multi-thread download
	? progress bar
	? idleTimerDisabled
*/

var LOGGING_ENABLED = true;
function log(/* arguments */) {
	LOGGING_ENABLED && console.log(
		"NetworkHandler: " +
		Array.prototype.join.call(arguments, ", ")
	);
}

function prettyStringify(obj, multiline, level) {
	result = "{";
	var keys = Object.keys(obj);
	if (keys.length > 0) {
		level = level || "";
		result += multiline ? "\n" : " ";
		Object.keys(obj).forEach(function(key, i, arr) {
			if (multiline) result += level + "\t";
			if (key.indexOf(":") !== -1) {
				result += "\"" + key + "\"";
			} else {
				result += key;
			}
			result += ": ";
			if (obj[key] === Object(obj[key])) {
				result += prettyStringify(obj[key], multiline, level + "\t");
			} else {
				result += JSON.stringify(obj[key]);
			}
			if (i < arr.length - 1) result += multiline ? ",\n" : ", ";
		});
		result += multiline ? "\n" + level + "}" : " }";
	} else {
		result += "}";
	}
	return result;
}


var osName = Ti.Platform.name;

var OS_IOS     = osName === "iPhone OS";
var OS_ANDROID = osName === "android";


var osVersion = (Ti.Platform.version.match(/\d+/) || [])[0];

var BG_DOWNLOAD_SUPPORT = OS_IOS && osVersion >= 7;


var URLSession = BG_DOWNLOAD_SUPPORT ? require("com.appcelerator.urlSession") : null;



var lastSessionID = "";

function bgLoad(url, params) {

	params = params || {};

	log("bgLoad", url)

	var sessionID = "bgLoad :: " + url + " :: " + new Date();
	if (lastSessionID === sessionID) sessionID += "-2";
	lastSessionID = sessionID;

	log("sessionID = " + sessionID)

	var cfg     = URLSession.createURLSessionBackgroundConfiguration(sessionID);
	var session = URLSession.createURLSession(cfg);
	var taskID  = URLSession.backgroundDownloadTaskWithURL(session, url);

	log("taskID = " + taskID);

	function removeListeners() {

		log("Removing listeners");

		Ti.App.iOS.removeEventListener("downloadcompleted",  listeners.dlCompleted);
		Ti.App.iOS.removeEventListener("downloadprogress",   listeners.dlProgress);

		Ti.App.iOS.removeEventListener("backgroundtransfer",     listeners.backgroundtransfer);
		Ti.App.iOS.removeEventListener("sessioncompleted",       listeners.sessioncompleted);
		Ti.App.iOS.removeEventListener("sessioneventscompleted", listeners.sessioneventscompleted);
		
	}

	var onComplete = params.onComplete;
	var onProgress = params.onProgress;
	var onFail     = params.onFail;

	lastProgressUpdate = {
		time: 0,
		size: 0,
		percent: 0,
		timeStart: 0
	};

	var listeners = {

		dlCompleted: function(e) {
			log("download completed", prettyStringify(e, true));
			if (e.taskIdentifier !== taskID) return;
			if (typeof onComplete === "function") onComplete(e.data);
			removeListeners();
			URLSession.invalidateAndCancel(session);
		},

		dlProgress: function(e) {
			// log("download progress", prettyStringify(e));
			if (e.taskIdentifier !== taskID) return;
			if (typeof onProgress === "function") {

				// shortcuts
				var t = params.progressUpdateInterval;
				var s = params.progressUpdateSize;
				var p = params.progressUpdatePercent;

				var have  = e.totalBytesWritten;
				var total = e.totalBytesExpectedToWrite;

				var d = new Date();
				var c = 100 * have / total;

				// bool flags
				var time, size, percent, firstTick;

				if (
					have === total ||
					t === s === p === undefined || 
					( firstTick = lastProgressUpdate.timeStart === 0 ) ||
					( time    = t !== undefined && t >= d    - lastProgressUpdate.time    ) ||
					( size    = s !== undefined && s >= have - lastProgressUpdate.size    ) ||
					( percent = p !== undefined && p >= c    - lastProgressUpdate.percent )
				) {
					if (firstTick) lastProgressUpdate.timeStart = d;
					if (time)      lastProgressUpdate.time = d;
					if (size)      lastProgressUpdate.size = have;
					if (percent)   lastProgressUpdate.percent = c;
					onProgress(
						have, total,
						// ETA based on amount of loaded data since start
						(total - have) / (have / (d - lastProgressUpdate.timeStart))
					);
				}
			}
		},

		/*dlFailed: function() {
			if (e.taskIdentifier !== taskID) return;
			if (typeof onFail === "function") onFail();
		}*/

		backgroundtransfer:     function(e) { log("backgroundtransfer",     prettyStringify(e, true)); },
		sessioncompleted:       function(e) { log("sessioncompleted",       prettyStringify(e, true)); }, // { errorCode: -1100, message: "The requested URL was not found on this server.", success: false, ...
		sessioneventscompleted: function(e) { log("sessioneventscompleted", prettyStringify(e, true)); }

	};

	log("Establishing listeners");

	Ti.App.iOS.addEventListener("downloadcompleted", listeners.dlCompleted);
	Ti.App.iOS.addEventListener("downloadprogress",  listeners.dlProgress);

	Ti.App.iOS.addEventListener("backgroundtransfer",     listeners.backgroundtransfer);
	Ti.App.iOS.addEventListener("sessioncompleted",       listeners.sessioncompleted);
	Ti.App.iOS.addEventListener("sessioneventscompleted", listeners.sessioneventscompleted);

	return { 
		abort: function() {
			log("aborting " + sessionID);
			removeListeners();
			URLSession.invalidateAndCancel(session);
		}
	};
}



function download(url, params) {

	params = params || {};

	var loader = null;

	if (BG_DOWNLOAD_SUPPORT) {
		loader = bgLoad(url,  params);
	} else {

	}

	return loader;

}


var latestLoader = null;

function doNetworkTest() {

	latestLoader = download(
		// "http://www.ex.ua/load/102326988", // 18gb zip
		"http://www.ex.ua/load/29563076", // 35mb zip
		{
			onComplete: function(data) {
				latestLoader = null;
				log("Loading complete. Recieved data is ", data);
			},
			onFail: function(e) {
				latestLoader = null;
				log("Loading failed because of " + e);
			},
			onProgress: function(have, total, eta) {
				log("Loading... " + (100 * have / total).toFixed(2) + " %, ETA: " + parseInt(eta / 1000) + "s");
			}
			// progressUpdateInterval: 200
			// progressUpdateSize: 1024 * 1024
			// progressUpdatePercent: 0.05
		}
	);

}

function abortLatestDownload() {
	latestLoader && latestLoader.abort();
}



// ===== Main =====

	var platino = require("com.ti.game2d");
	var window  = Ti.UI.createWindow({ backgroundColor: "black" });

	var game = platino.createGameView();
	game.fps = 30;
	game.color(0, 0, 0);

	var scene = platino.createScene();
	game.pushScene(scene);

	game.addEventListener("onload", function(e) {

	    var width  = game.screen.width;
	    var height = game.screen.height;

	    game.start();

	    console.info("Click upper half to start download, bottom to abort latest one");

	    game.addEventListener("touchstart", function(e) {
	    	if (e.y < height / 2) {
	    		log("Initiating downloading");
	    		doNetworkTest();
	    	} else {
	    		log("Aborting latest download");
	    		abortLatestDownload();
	    	}
	    });

	});



	window.add(game);

	// load debug functions
	// Ti.include("debug.js");

	window.open({ fullscreen: true, navBarHidden: true });

// ================