var Utils = require("downloader/utils");
var log   = Utils.createLogger("BackgroundDownloader", true);



// ===== Tools =====

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



var URLSession = require("com.appcelerator.urlSession");



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
	// 			finish("Canceling download: progress timeout exceed");
	// 			// cancel("progress timeout exceed");
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

		// {
		// 	errorCode: -1100,
		// 	message: "The requested URL was not found on this server.",
		// 	success: false,
		// 	...
		// }
		sessioncompleted: function(e) {

			if (e.taskIdentifier !== taskID) return;

			log("sessioncompleted", prettyStringify(e, true));

			if (!e.success) {

				if (typeof onFail === "function") onFail(e.errorCode, e.message);

				finish("Download failed");

			}

		},

		backgroundtransfer:     function(e) {
			e.taskIdentifier === taskID && log("backgroundtransfer",     prettyStringify(e, true));
		},
		sessioneventscompleted: function(e) {
			e.taskIdentifier === taskID && log("sessioneventscompleted", prettyStringify(e, true));
		}

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
	// 		finish("Canceling download: start timeout exceed");
	// 	}, params.timeout);
	// }

	// if (params.progressTimeout !== undefined) resetProgressTimeoutFail();

	return {

		cancel: function() {

			if (typeof onFail === "function") onFail(0, "Download canceled");

			finish("Canceling download due to request");

		}
		
	};
}



module.exports = bgLoad;