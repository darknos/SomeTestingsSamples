// todo: detect error on resume after timeout

var Backbone = require("lib/Backbone");
var Utils    = require("downloader/utils");
var log      = Utils.createLogger("Download.js", true);
var _        = require("lib/underscore");
var FileIO   = require("downloader/FileIO");

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

	@param {String | Object} [params.url]
	Rather string of a resource, or an object:
		Titanium.Network.HTTPClient extended with {
			url: {String} 
			method: {"GET" | "POST"} request method, default is "GET"
			arguments: {Object | TiBlob}
			response: {String | Array}
				Data, Text, XML
				Default is Data
		}
	URL must be set before download will start

	@param {Boolean} [params.autostart=true] Whether or not start download immediately

	@param {String} [params.path]
	File to write result. Will create the file and its parent folders if needed.
	
	@param {Boolean} [params.forceOverwrite=false] If false, will not overwrite existing files
	@param {Boolean} [params.remoteBackup=false] Whether or not backup the file on iOS cloud.

	// @param {String} [params.id]
	// @param {Boolean} [params.isZip]
	// @param {Boolean} [params.keepZip]
	// @param {Boolean} [params.autoclean]
	// @param {Boolean} [params.autorestart]
	// @param {Integer} [params.retryInterval]
	// @param {Integer} [params.retryCount] 


	@property {Boolean} STARTED=false @readonly
	Is true if download was ever started (no matter automatically or manually)

	@property {Boolean} IN_PROGRESS=false @readonly
	Is true if download currently recieving any data

	@property {Boolean} DOWNLOADED=false @readonly
	@property {Boolean} FAILED=false @readonly
	@property {Boolean} CANCELED=false @readonly

	@property {Float} DOWNLOADED_PERCENT=0 @readonly
	Percents of downloaded amount


	@property {Object} DOWNLOADED_DATA @readonly
	Result of download. Is affected depending on url.response.data (true by default)

	@property {String} DOWNLOADED_TEXT @readonly
	Text result of download. Is affected depending on url.response.text

	@property {Titanium.XML.Document} DOWNLOADED_XML @readonly
	XML result of download. Is affected depending on url.response.xml


	@property {String} STATUS @readonly "UNSENT", "OPENED", "HEADERS_RECEIVED", "LOADING", "DONE"

	@property {Integer} TOTAL_BYTES @readonly Size of the download in bytes

	// progressBytes: 0,
	// totalBytes:    0,


	@method start
	Fails instantly if
		* there's no internet connection
		* url has been not specified
		* download is already taking place

	@method cancel

	@method clean

 */

// var DownloadModel = Backbone.Model.extend({

// 	defaults: {

// 		name: undefined,
// 		url:  undefined,

// 		STATE: Download.STATE_IDLE,

// 		ERROR_CODE: Download.ERROR_NONE,
// 		ERROR_MESSAGE: "",

// 		DOWNLOADED_PERCENT: 0,
// 		DOWNLOADED_BYTES:   0,
// 		TOTAL_BYTES:        0,

// 		DOWNLOADED_DATA: null,
// 		DOWNLOADED_TEXT: "",
// 		DOWNLOADED_XML: null

// 	}

// });

// Download.prototype.STATE_IDLE = 0;
// Download.prototype.STATE_DOWNLOADING = 1;
// Download.prototype.STATE_DONE = 2;
// Download.prototype.STATE_FAILED = 3;


var Download = Backbone.Model.extend({

	defaults: {

		name: undefined,
		url:  undefined,
		path: undefined,
		autostart: true,

		forceOverwrite: false,
		remoteBackup: false,

		STARTED:     false,
		IN_PROGRESS: false,
		DOWNLOADED:  false,
		FAILED:      false,
		CANCELED:    false,

		ERROR_CODE: 0,
		ERROR_MESSAGE: "",

		DOWNLOADED_PERCENT: 0,
		DOWNLOADED_BYTES: 0,
		TOTAL_BYTES: 0,

		DOWNLOADED_DATA: null,
		DOWNLOADED_TEXT: "",
		DOWNLOADED_XML: null,

		STATUS: "UNSENT"

	},



	_httpClient: null,

	_smartSet: function(key, value) {
		var map;
		if (typeof key === "string") {
			map = {};
			map[key] = value;
		} else {
			map = _.clone(key);
		}
		for (var key in map) {
			var v = this.get(key);
			if (v === value/* || typeof v === "TiBlob"*/) delete map.key; // XXX
		}
		if (Object.keys(map).length > 0) this.set(map);
	},



	initialize: function() {
		this.get("autostart") && this.start();
	},



	// Methods
	// -------

	start: function() {

		var download = this;

		function fail(reason) {
			log(
				"Download failed" + 
				(reason ? ". Reason: " + reason : "")
			);
			download._smartSet({
				FAILED: true,
				STATUS: "DONE",
				ERROR_MESSAGE: reason,
				ERROR_CODE: -1
			});
			return false;
		}

		if (!Ti.Network.online) return fail("Can't start download: no internet connection");

		var status = download.get("STATUS");
		if (status !== "UNSENT" && status !== "DONE") {
			download.cancel();
			return fail("Can't start download: it is already taking place");
		}

		var url = download.get("url");

		if (!url || _.isObject(url) && !url.url) {
			return fail("Can't start download: URL not specified");
		}

		// ===== Get params =====

			var clientDetails = { timeout: 60000 };
			var callbacks, method, arguments, file;
			var response = {
				data: true,
				text: false,
				xml:  false
			};

			if (_.isObject(url)) {

				_.extend(clientDetails,
					_.pick(url, [
						"autoEncodeUrl",
						"autoRedirect",
						"cache",
						"domain",
						"enableKeepAlive",
						"password",
						"timeout",
						"tlsVersion",
						"username",
						"validatesSecureCertificate",
						"withCredentials"
					])
				);

				callbacks = _.pick(url, [
					"ondatastream",
					"onerror",
					"onload",
					"onreadystatechange",
					"onsendstream"
				]);

				if (url.method && url.method.match(/^(get|post)$/i)) method = url.method.toUpperCase();


				if (url.response) {
					var rResp = /^(data|text|xml)$/i;
					response.data = response.text = response.xml = false;
					if (typeof url.response === "string" && rResp.test(url.response)) {
						response[url.response.toLowerCase()] = true;
					} else
					if (isArray(url.response)) {
						url.response.forEach(function(e) {
							if (rResp.test(e)) response[e.toLowerCase()] = true;
						});
					}
				}

				if (!response.data && !response.text && !response.xml) response.data = true;


				if (url.arguments !== undefined) arguments = url.arguments;

				fname = url.file;

				url = url.url;

			} else {

				callbacks = {};
				method = "GET";
				arguments = {};

			}



			var fname = download.get("path") || fname;
			if (fname) {
				file = FileIO.getFile(fname, true);
				if (file.exists()) {
					if (!download.get("forceOverwrite")) {
						if (file.size !== 0) {
							return fail("File already exists: " + file);
						} else {
							log("File exists but it's empty, overwriting...");
						}
					} else {
						log("Overwriting existing file: " + file);
					}
				} else {
					file.createFile();
				}
				file.remoteBackup = !!download.get("remoteBackup");
			}

		// ======================

		log("Starting download...");			

		download._smartSet({

			STARTED:    true,
			DOWNLOADED: false,
			FAILED:     false,
			CANCELED:   false,

			ERROR_CODE: 0,
			ERROR_MESSAGE: "",

			DOWNLOADED_DATA: null,
			DOWNLOADED_TEXT: "",
			DOWNLOADED_XML: null,

			DOWNLOADED_PERCENT: 0,
			DOWNLOADED_BYTES: 0,
			TOTAL_BYTES: 0,

			STATUS: "UNSENT"

		});



		download._httpClient = Ti.Network.createHTTPClient(_.extend(clientDetails, {


			ondatastream: function(event) {
				// log("ondatastream", Utils.prettyStringify(event));
				// log("ondatastream", event.progress.toFixed(4));
				log("ondatastream", Utils.prettyStringify(this, true));
				log("responseData", this.responseData);
				if (download.get("TOTAL_BYTES") === 0) {
					var size = parseInt(this.getResponseHeader("Content-length"));
					size && download.set("TOTAL_BYTES", size);
				}
				if (typeof callbacks.ondatastream === "function") callbacks.ondatastream(event);
				download.set({
					DOWNLOADED_PERCENT: 100 * event.progress,
					DOWNLOADED_BYTES: Math.floor(event.progress * download.get("TOTAL_BYTES"))
				});
			},



			// success: {
			// 	code: 0,
			// 	success: true,
			//  ...
			// }
			onload: function(event) {
				log("onload", Utils.prettyStringify(event, true));
				if (typeof callbacks.onload === "function") callbacks.onload(event);
				if (this.status === 200) {
					log("URL downloaded", url);
					var result = {};
					if (response.data) result.DOWNLOADED_DATA = this.responseData;
					if (response.text) result.DOWNLOADED_TEXT = this.responseText;
					if (response.xml) {
						var xml = null;
						try { xml = this.responseXML; } catch(e) {}
						result.DOWNLOADED_XML = xml;
					}
					download.set(_.extend({ DOWNLOADED: true }, result));
				} else {
					download.set({
						FAILED: true,
						ERROR_CODE: event.code,
						ERROR_MESSAGE: "Code " + this.status
					});
					log("Couldn't download URL " + url + ", error code " + this.status);
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
				if (typeof callbacks.onerror === "function") callbacks.onerror(event);
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
				if (typeof callbacks.onreadystatechange === "function") {
					callbacks.onreadystatechange(event);
				}
				// log("Headers: " + this.allResponseHeaders);
				switch (this.readyState) {
					case this.HEADERS_RECEIVED:
						// var size = parseInt(this.getResponseHeader("Content-length"));
						// size && download.set("TOTAL_BYTES", size);
						break;
					case this.LOADING:
						if (!download.get("IN_PROGRESS")) download.set("IN_PROGRESS", true);
						break;
					case this.DONE:
						if (download.get("IN_PROGRESS")) download.set("IN_PROGRESS", false);
						break;
				}
				download.set("STATUS", DEBUG_STATE_CODES[this.readyState]); // XXX
			},



			onsendstream: function(event) {
				if (typeof callbacks.onsendstream === "function") callbacks.onsendstream(event);
				log("onsendstream", Utils.prettyStringify(event, true));
			}

		}));


		var DEBUG_STATE_CODES = [];
		[
			"UNSENT",
			"OPENED",
			"HEADERS_RECEIVED",
			"LOADING",
			"DONE"
		].forEach(function(e) {
			// log(e + " = " + download._httpClient[e]);
			DEBUG_STATE_CODES[download._httpClient[e]] = e;
		});


		log("Opening request");
		download._httpClient.open("GET", url);

		if (file) download._httpClient.file = file;

		log("Sending request");
		download._httpClient.send(arguments);

		return true;

	},



	cancel: function() {

		var status = this.get("STATUS");
		if (!this._httpClient || status === "UNSENT" && status === "DONE") {
			log("Can't abort download: it's not taking place");
			return false;
		}

		this.set({
			STATUS: "DONE",
			IN_PROGRESS: false,
			CANCELED: true
		});
		this._httpClient.abort();
		this._httpClient = null;

		return true;

	},



	clean: function() {

		var fname = this._httpClient.file;

		fname && FileIO.deleteFile(fname);

	},



});



module.exports = Download;