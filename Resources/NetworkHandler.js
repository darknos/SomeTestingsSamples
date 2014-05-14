/*
1. get url
2. get cloud
3. get zip
4. cache?

features:
	cross platform
	background loading
	timeout
	? speed
	? ETA * based on last N seconds
	? minimal update interval
	? multi-thread download
	? progress bar
	? idleTimerDisabled

todo:
	remove files on dl fail
*/



// ===== Tools =====

	var LOGGING_ENABLED = true;

	function log(/* arguments */) {
		LOGGING_ENABLED && console.log(
			timeStamp() + " NetworkHandler: " +
			Array.prototype.join.call(arguments, ", ")
		);
	}


	function timeStamp(d) {
		d = d || new Date();
		return [ "Hours", "Minutes", "Seconds", "Milliseconds" ].map(
			function(e, i) {
				e = d["get" + e]();
				if (i < 3)   return e < 10 ? "0" + e : e;
				if (e <  10) return "00" + e;
				if (e < 100) return "0"  + e;
				return e;
			}
		).join(":");
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


	function toPositiveNumber(v) {
		var type = typeof v;
		if (type === "string") {
			v |= 0; // aka parseint
			if (!isNaN(v) && isFinite(v)) return v;
		} else {
			if (type === "number") return Math.max(v, 0);
		}
		return undefined;
	}


	function clone(obj) {
	    var result = {};
	    for (var key in obj) result[key] = obj[key];
	    return obj;
	}

// =================



var osName = Ti.Platform.name;

var OS_IOS     = osName === "iPhone OS";
var OS_ANDROID = osName === "android";


var osVersion = (Ti.Platform.version.match(/\d+/) || [])[0];

var BG_DOWNLOAD_SUPPORT = OS_IOS && osVersion >= 7;


var URLSession = BG_DOWNLOAD_SUPPORT ? require("com.appcelerator.urlSession") : null;



var lastSessionID = "";

function bgLoad(url, params) {


	// validate params

	params = clone(params || {});
	[ "Interval", "Size", "Percent" ].forEach(function(e) {
		var name = "progressUpdate" + e;
		params[name] = toPositiveNumber(params[name]);
	});
	// params.timeout         = toPositiveNumber(params.timeout);
	// params.progressTimeout = toPositiveNumber(params.progressTimeout);

	// shortcuts
	var onStart    = params.onStart;
	var onComplete = params.onComplete;
	var onProgress = params.onProgress;
	var onFail     = params.onFail;



	var sessionID = (function() {
		var result = "bgLoad :: " + url + " :: " + new Date();
		if (lastSessionID === result) result += "-2";
		lastSessionID = result;
		return result;
	})();

	var cfg     = URLSession.createURLSessionBackgroundConfiguration(sessionID);
	var session = URLSession.createURLSession(cfg);
	var taskID  = URLSession.backgroundDownloadTaskWithURL(session, url);


	var loadingActive = true;

	// var failTimeoutID = -1;
	// var progressFailTimeoutID = -1;

	var lastProgressUpdate = {
		time: 0,
		size: 0,
		percent: 0,
		timeStart: 0
	};


	log("IDs: " + prettyStringify({
		session: sessionID,
		task:    taskID
	}, true));


	function finish(reason) {

		if (!loadingActive) {
			log(
				"Can't finish inactive downloading" + 
				(reason ? " for reason " + reason : "")
			);
			return;
		}

		reason && log(reason);
		log("Removing listeners");

		[
			"backgroundtransfer",
			"downloadcompleted", "downloadprogress",
			"sessioncompleted",  "sessioneventscompleted"
		].forEach(function(e) {
			Ti.App.iOS.removeEventListener(e, listeners[e]);
		});

		loadingActive = false;
		URLSession.invalidateAndCancel(session);

	}


	// function resetProgressTimeoutFail() {
	// 	if (params.progressTimeout !== undefined && progressFailTimeoutID !== -1) {
	// 		clearTimeout(progressFailTimeoutID);
	// 		progressFailTimeoutID = setTimeout(function() {
	// 			progressFailTimeoutID = -1;
	// 			finish("Aborting download: progress timeout exceed");
	// 			// abort("progress timeout exceed");
	// 		}, params.progressTimeout);
	// 	}
	// }

	

	

	var listeners = {

		downloadcompleted: function(e) {

			if (e.taskIdentifier !== taskID) return;

			log("downloadcompleted", prettyStringify(e, true));
			if (typeof onComplete === "function") onComplete(e.data);

			finish("Download complete");

		},

		downloadprogress: function(e) {

			if (e.taskIdentifier !== taskID) return;

			// log("downloadprogress", prettyStringify(e));

			var d = new Date();
			var have  = e.totalBytesWritten;
			var total = e.totalBytesExpectedToWrite;
			var firstTick = lastProgressUpdate.timeStart === 0;
			if (firstTick) {
				lastProgressUpdate.timeStart = d;
				// if (failTimeoutID !== -1) clearTimeout(failTimeoutID);
				if (typeof onStart === "function") onStart(total);
			}

			// resetProgressTimeoutFail();

			if (typeof onProgress === "function") {

				// shortcuts
				var t = params.progressUpdateInterval;
				var s = params.progressUpdateSize;
				var p = params.progressUpdatePercent;

				var c = 100 * have / total;

				// bool flags
				
				var time    = t !== undefined && t <= d    - lastProgressUpdate.time;
				var size    = s !== undefined && s <= have - lastProgressUpdate.size;
				var percent = p !== undefined && p <= c    - lastProgressUpdate.percent;

				if (
					have === total ||
					t === undefined && s === undefined && p === undefined || 
					firstTick || time || size || percent
				) {
					// log("downloadprogress filtered", prettyStringify(e));
					if (time)    lastProgressUpdate.time = d;
					if (size)    lastProgressUpdate.size = have;
					if (percent) lastProgressUpdate.percent = c;
					var speed = have / (d - lastProgressUpdate.timeStart);
					onProgress(
						have, total,
						speed, (total - have) / speed						
					);
				}
			}
		},

		// { errorCode: -1100, message: "The requested URL was not found on this server.", success: false, ...
		sessioncompleted: function(e) {

			if (e.taskIdentifier !== taskID) return;

			log("sessioncompleted", prettyStringify(e, true));

			if (!e.success) {

				if (typeof onFail === "function") onFail(e.errorCode, e.message);

				finish("Download failed");

			}

		},

		backgroundtransfer:     function(e) { e.taskIdentifier === taskID && log("backgroundtransfer",     prettyStringify(e, true)); },
		sessioneventscompleted: function(e) { e.taskIdentifier === taskID && log("sessioneventscompleted", prettyStringify(e, true)); }

	};



	log("Establishing listeners");

	[
		"backgroundtransfer",
		"downloadcompleted", "downloadprogress",
		"sessioncompleted", "sessioneventscompleted"
	].forEach(function(e) {
		Ti.App.iOS.addEventListener(e, listeners[e]);
	});

	

	// if (timeout !== undefined) {
	// 	failTimeoutID = setTimeout(function() {
	// 		failTimeoutID = -1;
	// 		finish("Aborting download: start timeout exceed");
	// 	}, params.timeout);
	// }

	// if (params.progressTimeout !== undefined) resetProgressTimeoutFail();

	return {
		abort: function() { finish("Aborting download due to request"); }
	};
}


/*
	params = {

		onStart:    function(size: <int>),
		onProgress: function(have: <int>, total: <int>, speed: <float>, eta: <int>),
		onComplete: function(data: <TiBlob>),
		onFail:     function(errCode: <int>, errMesage: <string>),

		// Time in ms
		progressUpdateInterval: <int>,

		// Size in bytes
		progressUpdateSize: <int>,

		// Percents
		progressUpdatePercent: <int>,

		// timeout: <int>,
		// startTimeout: <int>
	}
 */
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

function doNetworkTest(url) {

	if (!url) return;

	latestLoader = download(url,
		{
			onStart: function(size) {
				log("Download started, size: " + size)
			},
			onComplete: function(data) {
				latestLoader = null;
				log("Loading complete. Recieved data is ", data);
			},
			onFail: function(errCode, errMsg) {
				latestLoader = null;
				log("Loading failed: [" + errCode + "]: " + errMsg);
			},
			onProgress: function(have, total, speed, eta) {
				log("Loading... " + (100 * have / total).toFixed(2) + "%, ETA: " + parseInt(eta / 1000) + "s");
			},
			// progressUpdateInterval: 500
			progressUpdateSize: 10 * 1024 * 1024 // 10mb
			// progressUpdatePercent: 5
			
			// timeout: 3000,
			// progressTimeout: 5000,
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

		// ===== UI =====

			var buttons = [

				{
					color: "#aaffaa", label: "Download 35mb zip",
					rect: [ 0, 0, width, height / 4 ],
					callback: function() {
						log("Initiating downloading 35mb zip");
						doNetworkTest("http://www.ex.ua/load/29563076");
					}
				},

				{
					color: "#ffffaa", label: "Download 18gb zip",
					rect: [ 0, height / 4, width, height / 4 ],
					callback: function() {
						log("Initiating downloading 18gb zip");
						doNetworkTest("http://www.ex.ua/load/102326988");
					}
				},

				{
					color: "#ffaaaa", label: "Abort latest download",
					rect: [ 0, 2 * height / 4, width, height / 4 ],
					callback: function() {
						log("Aborting latest download");
						abortLatestDownload();
					}
				},

				{
					color: "#ffaaff", label: "Test broken download",
					rect: [ 0, 3 * height / 4, width, height / 4 ],
					callback: function() {
						log("Initiating incorrect downloading");
						doNetworkTest("http://path/to/incorrect/url");
					}
				},

			];

			buttons.forEach(function(e) {

				var s = platino.createSprite({
					color: e.color,
					x: e.rect[0] | 0,
					y: e.rect[1] | 0,
					width:  Math.ceil(e.rect[2]),
					height: Math.ceil(e.rect[3])
				});

				// hex color to 3 channels 0..1
				s.color.apply(s, e.color.match(/[\da-fA-F]{2}/g).map(function(e) {
					return parseInt(e, 16) / 255;
				}));

				s.addEventListener("touchstart", e.callback);

				var t = platino.createTextSprite({
					text: e.label,
					textAlign: Ti.UI.TEXT_ALIGNMENT_CENTER,
					x: e.rect[0] + e.rect[2] / 2,
					y: e.rect[1] + e.rect[3] / 2
				});

				scene.add(s);
				scene.add(t);

			});



			game.addEventListener("touchstart", function(e) {
				buttons.some(function(btn) {
					if (
						e.x >= btn.rect[0] &&
						e.y >= btn.rect[1] &&
						e.x <= btn.rect[0] + btn.rect[2] &&
						e.y <= btn.rect[1] + btn.rect[3]
					) {
						btn.callback && btn.callback();
						return true;
					}
				});
			});

		// ==============

	});



	window.add(game);

	// load debug functions
	// Ti.include("debug.js");

	window.open({ fullscreen: true, navBarHidden: true });

// ================