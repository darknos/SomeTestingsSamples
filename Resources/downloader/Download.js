var Backbone = require("lib/Backbone");
var Utils    = require("downloader/utils");
var log      = Utils.createLogger("Download.js", true);

// ===== Tools =====

	function deepClone(src) {
		var result = {};
		for (var key in src) {
			var o = src[key];
			if (o === Object(o)) {
				result[key] = deepClone(o);
			} else {
				result[key] = o;
			}
		}
		return result;
	}

	function defined(/* arguments */) {
		var a = Array.prototype.slice.call(arguments);
		for (var i = 0; i < a.length; i++) {
			if (a[i] !== undefined) return a[i];
		}
	}

// =================


/*var downloads = Ti.App.Properties.getObject("downloads", {});
function rememberDownload(d, id) {}
function forgetDownload(id)      {}

function init() {
	for (var key in downloads) {
		var d = downloads[key];
		if (d.autorestart && !d.downloaded) d.start();
	}
}

init();*/

/**

	@Class Download

	Backbone model for Download object.

	@param {Object} [params] Parameters
	@param {String} [params.name] Name for download. Is not used by the class
	@param {String} [params.url] URL of download. Must be set before download will start
	@param {Boolean} [params.autostart=true] Whether or not start download immediately

	// @param {String} [params.id]
	// @param {String} [params.path]
	// @param {Boolean} [params.isZip]
	// @param {Boolean} [params.keepZip]
	// @param {Boolean} [params.autoclean]
	// @param {Boolean} [params.autorestart]
	// @param {Integer} [params.retryInterval]
	// @param {Integer} [params.retryCount] 
	// @param {Boolean} [params.forceRewrite]


	@property {Boolean} STARTED=false @readonly
	Is true if download was ever started

	@property {Boolean} IN_PROGRESS=false @readonly
	Is true if download currently recieving any data

	@property {Boolean} DOWNLOADED=false @readonly
	@property {Boolean} FAILED=false @readonly
	// @property {Boolean} CANCELED=false @readonly

	@property {Float} DOWNLOADED_PERCENT=0 @readonly
	Percents of downloaded amount

	@property {Object} DOWNLOADED_DATA @readonly result of download
	@property {String} DOWNLOADED_TEXT @readonly text result of download

	// status: "not_started",

	// progressPercent: 0,
	// progressBytes:   0,
	// totalBytes:      0,


	@method start
	Fails instantly if
		* there's no internet connection
		* url has been not specified

	@method cancel

	@method clean

 */


 var Download = Backbone.Model.extend({

	defaults: {

		name: undefined,
		url:  undefined,
		autostart: true,

		STARTED:     false,
		IN_PROGRESS: false,
		DOWNLOADED:  false,
		FAILED:      false,

		ERROR_CODE: 0,
		ERROR_MESSAGE: "",

		DOWNLOADED_PERCENT: 0,

		DOWNLOADED_DATA: null,
		DOWNLOADED_TEXT: ""

	},

	initialize: function() {

		this.get("autostart") && this.start();

	},

	start: function() {

		function fail(reason) {
			log(
				"Download failed" + 
				(reason ? ". Reason: " + reason : "")
			);
		}

		if (!Ti.Network.online) {
			fail("Can't start download: no internet connection");
			return false;
		}

		var download = this;
		var url = download.get("url");

		if (!url) {
			fail("Can't start download: URL not specified");
			return false;
		}

		log("Starting download...");			

		download.set("STARTED", true);

		var c = Ti.Network.createHTTPClient({

			ondatastream: function(event) {
				// log("ondatastream", Utils.prettyStringify(event));
				// log("ondatastream", event.progress.toFixed(4));
				download.set("DOWNLOADED_PERCENT", 100 * event.progress);
			},

			// success: {
			// 	code: 0,
			// 	success: true,
			//  ...
			// }
			onload: function(event) {
				log("onload", Utils.prettyStringify(event, true));
				if (c.status === 200) {
					log("URL downloaded", url);
					download.set({
						DOWNLOADED: true,
						DOWNLOADED_DATA: this.responseData,
						DOWNLOADED_TEXT: this.responseText
					});
				} else {
					download.set("FAILED", true);
					log("Couldn't download URL " + url + ", error code " + c.status);
				}
			},

			// wrong url: {
			// 	code: 1,
			// 	error: "A connection failure occurred",
			// 	success: false,
			// 	...
			// }
			// minimized while loading, randomly while loading after some time: {
			// 	code: 2,
			// 	error: "The request timed out",
			// 	success: false,
			// 	...
			// }
			onerror: function(event) {
				log("onerror", Utils.prettyStringify(event, true));
				download.set({
					FAILED: true,
					ERROR_CODE: event.code,
					ERROR_MESSAGE: event.error
				});
				log(
					"Couldn't download URL " + url + ", " + 
					"error code " + event.code + ": " + event.error
				);
			},

			onreadystatechange: function(event) {
				log(
					"onreadystatechange readyState = " + this.readyState + 
					" // " + DEBUG_STATE_CODES[this.readyState]
					// Utils.prettyStringify(event, true),
					// Utils.prettyStringify(this, true)
				);
				switch (this.readyState) {
					case this.LOADING:
						if (!download.get("IN_PROGRESS")) download.set("IN_PROGRESS", true);
						break;
					case this.DONE:
						if (download.get("IN_PROGRESS")) download.set("IN_PROGRESS", false);
						break;
				}
			},
			onsendstream: function(event) { log("onsendstream", Utils.prettyStringify(event, true)); },

			// file: download.path

			timeout: 60000

		});

		var DEBUG_STATE_CODES = [];
		["UNSENT",
		"OPENED",
		"HEADERS_RECEIVED",
		"LOADING",
		"DONE"].forEach(function(e) {
			// log(e + " = " + c[e]);
			DEBUG_STATE_CODES[c[e]] = e;
		});


		log("Opening request");
		c.open("GET", url);
		log("Sending request");
		c.send();

	},


	cancel: function() {



	},


	clean: function() {}

});



module.exports = Download;