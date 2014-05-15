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
		v = parseFloat(v) || parseInt(v);
		return !isNaN(v) && isFinite(v) ? Math.max(v, 0) : undefined;
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
	var onAfter    = params.onAfter;



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

		if (typeof onAfter === "function") onAfter();

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

		abort: function() {

			if (typeof onFail === "function") onFail(0, "Aborted by request");

			finish("Aborting download due to request");

		}
		
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



// ===== Tracking loaders =====

	var loaders = [];
	function rememberLoader(obj) {
		var id = loaders.push(obj);
		log("Added loader " + id + " to array");
		return id;
	}

	function removeLoader(id) {
		log("Removing loader " + id + " from array");
		delete loaders[id];
	}

	function abortLatestDownload() {
		var i = loaders.length - 1;
		var l;
		while (i > 0 && !(l = loaders[i])) i--;
		if (i < 0) {
			log("Nothing to abort");
		} else {
			loaders[i].abort();
		}
	}

// ============================



function doNetworkTest(url) {

	if (!url) return;

	var id;

	loader = download(url,
		{
			onStart: function(size) {
				log("Download started, size: " + size)
			},
			onComplete: function(data) {
				log("Loading complete. Recieved data is ", data);
			},
			onFail: function(errCode, errMsg) {
				log("Loading failed: [" + errCode + "]: " + errMsg);
			},
			onProgress: function(have, total, speed, eta) {
				log("Loading... " + (100 * have / total).toFixed(2) + "%, ETA: " + parseInt(eta / 1000) + "s");
			},
			onAfter: function() {
				log("onAfter");
				removeLoader(id);
			},
			// progressUpdateInterval: 500
			progressUpdateSize: 10 * 1024 * 1024 // 5mb
			// progressUpdatePercent: 5
			
			// timeout: 3000,
			// progressTimeout: 5000,
		}
	);

	id = rememberLoader(loader);

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

			var RETINA = Ti.Platform.displayCaps.density === "high";
			var fontSize = height / 32 * (RETINA ? 2 : 1);

			function Button(label, color, x, y, w, h, callback) {

				var self = this;

				this.color = color;
				this.label = label;
				this.x = x;
				this.y = y;
				this.width  = w;
				this.height = h;
				this.callback = callback;

				this.sprite     = null;
				this.textSprite = null;

				var parsedColor = [];

				this.click = function(time) {
					self.callback && self.callback();
					self.sprite.color.apply(self.sprite, parsedColor);
					setTimeout(function() {
						self.sprite.color(self.color);
					}, time);
				};

				function init() {

					self.sprite = platino.createSprite({
						color: self.color,
						x: self.x | 0,
						y: self.y | 0,
						width:  Math.ceil(self.width),
						height: Math.ceil(self.height)
					});

					// hex color to 3 channels 0..1
					parsedColor = self.color.match(/[\da-fA-F]{2}/g).map(function(e) {
						return parseInt(e, 16) / 255;
					});
					self.sprite.color.apply(self.sprite, parsedColor);

					self.textSprite = platino.createTextSprite({
						text: self.label,
						textAlign: Ti.UI.TEXT_ALIGNMENT_CENTER,
						x: self.x,
						y: self.y + self.height / 2 - fontSize / 2,
						width:  self.width,
						height: self.height,
						fontSize: fontSize
					});

				}

				init();

			}

			var buttons = [

				new Button(
					"Download 35mb zip", "#aaffaa",
					0, 0, width, height / 4,
					function() {
						log("Initiating downloading 35mb zip");
						doNetworkTest("http://www.ex.ua/load/29563076");
					}
				),

				new Button(
					"Download 18gb zip", "#ffffaa",
					0, height / 4, width, height / 4,
					function() {
						log("Initiating downloading 18gb zip");
						doNetworkTest("http://www.ex.ua/load/102326988");
					}
				),

				new Button(
					"Abort latest download", "#ffaaaa",
					0, 2 * height / 4, width, height / 4,
					function() {
						log("Aborting latest download");
						abortLatestDownload();
					}
				),

				new Button(
					"Test broken download", "#ffaaff",
					0, 3 * height / 4, width, height / 4,
					function() {
						log("Initiating incorrect downloading");
						doNetworkTest("http://path/to/incorrect/url");
					}
				),

			];

			buttons.forEach(function(e) {

				scene.add(e.sprite);
				scene.add(e.textSprite);

			});



			game.addEventListener("touchstart", function(e) {
				var x = e.x;
				var y = e.y;
				if (RETINA) {
					x *= 2;
					y *= 2;
				}
				buttons.some(function(btn) {
					if (
						x >= btn.x &&
						y >= btn.y &&
						x <= btn.x + btn.width &&
						y <= btn.y + btn.height
					) {
						btn.click();
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