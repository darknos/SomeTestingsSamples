var log = require("downloader/logger")("Download.js", true);

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

	Here goes description

	@param {Object} [params]

		// Name for download. Is not used by the class
		name: {String},

		// url of download. Must be set before `start`
		url: {String}

		// id, path, autostart, isZip, autoclean, autorestart, retryInterval, retryCount, forceRewrite

	@method start
		Fails instantly if
			* there's no internet connection
			* url has been not specified

	@method cancel

	@method clean

 */

Download = Backbone.Model.extend({

	initialize: function() {

		// if (id) {
		// 	if (downloads[id]) {
		// 		return downloads[id];
		// 	} else {
		// 		rememberDownload(this, id);
		// 	}
		// }

	},

	defaults: {

		name: undefined,
		url:  undefined

		// path: path || url && md5(url),

		// get id()        { return id;          },
		// get autostart() { return !!autostart; },
		// get isZip()     { return !!isZip;     },

		// downloaded: false,
		// started:    false,
		// inProgress: false,
		// failed:     false,
		// aborted:    false,

		// status: "not_started",

		// progressPercent: 0,
		// progressBytes:   0,
		// totalBytes:      0,

	},

	start: function() {

		function fail(reason) {
			log(
				"Download failed" + 
				(reason ? ". Reason: " + reason : "")
			);
		}

		log("Starting download...");

		var download = this;

		if (!Ti.Network.ONLINE) {
			fail("No internet connection");
			return false;
		}

		if (!download.url) {
			fail("URL not specified");
			return false;
		}


		var c = Ti.Network.createHTTPClient({

			ondatastream: function(event) {
				log("ondatastream", prettyStringify(event, true));
			}

			onload: function(event) {
				log("onload", prettyStringify(event, true));
				if (c.status === 200) {
					log("URL downloaded", download.url);
					var data = this.responseData;
				} else {
					log("Couldn't download URL " + download.url + ", error code " + c.status);
				}
			},

			onerror: function(event) {
				log("onerror", prettyStringify(event, true));
				log("Couldn't download URL " + download.url + ", error code " + c.status);
			},

			onreadystatechange: function(event) { log("onreadystatechange", prettyStringify(event)); },
			onsendstream:       function(event) { log("onsendstream",       prettyStringify(event)); },

			// file: download.path

			timeout: 60000

		});

		log("Opening request");
		c.open("GET", url);
		log("Sending request");
		c.send();

	},

	cancel: function() {

	},

	clean: function() {

	}

});



module.exports = Download;