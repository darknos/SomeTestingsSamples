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

	// @property {Boolean} params.DOWNLOADED=false,
	// @property {Boolean} params.STARTED=false,
	// @property {Boolean} params.FAILED=false,
	// @property {Boolean} params.CANCELED=false,
	// @property {Boolean} params.IN_PROGRESS=false,

	// status: "not_started",

	// progressPercent: 0,
	// progressBytes:   0,
	// totalBytes:      0,

	// type: "text" | "data"


	@method start
	Fails instantly if
		* there's no internet connection
		* url has been not specified

	@method cancel

	@method clean

 */


function Download(params) {

	this.name      = params.name;
	this.url       = params.url;
	this.autostart = defined(params.autostart, true);
	// this.path      = defined(params.path, md5(this.url));

	// if (id) {
	// 	if (downloads[id]) {
	// 		return downloads[id];
	// 	} else {
	// 		rememberDownload(this, id);
	// 	}
	// }


	this.model = new (Backbone.Model.extend({
		defaults: {
			started:     false
			// downloaded:  false,
			// failed:      false,
			// canceled:    false,
			// downloading: false,
			// errorCode: undefined
		}
	}))();

	this.autostart && this.start();

}



Download.prototype.start = function() {

	this.model.set("started", true);

	function fail(reason) {
		log(
			"Download failed" + 
			(reason ? ". Reason: " + reason : "")
		);
	}

	log("Starting download...");

	var download = this;
	var url = download.url;

	if (!Ti.Network.online) {
		fail("No internet connection");
		return false;
	}

	if (!url) {
		fail("URL not specified");
		return false;
	}


	var c = Ti.Network.createHTTPClient({

		ondatastream: function(event) {
			log("ondatastream", Utils.prettyStringify(event));
		},

		onload: function(event) {
			log("onload", Utils.prettyStringify(event, true));
			if (c.status === 200) {
				log("URL downloaded", url);
				var data = this.responseData;
			} else {
				log("Couldn't download URL " + url + ", error code " + c.status);
			}
		},

		onerror: function(event) {
			log("onerror", Utils.prettyStringify(event, true));
			log("Couldn't download URL " + url + ", error code " + c.status);
		},

		onreadystatechange: function(event) { log("onreadystatechange", Utils.prettyStringify(event, true)/*, Utils.prettyStringify(this, true)*/); },
		onsendstream:       function(event) { log("onsendstream",       Utils.prettyStringify(event, true)); },

		// file: download.path

		timeout: 60000

	});

	log("Opening request");
	c.open("GET", url);
	log("Sending request");
	c.send();

};


Download.prototype.cancel = function() {};


Download.prototype.clean  = function() {};



module.exports = Download;