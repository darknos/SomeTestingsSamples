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
			url: {String} path to a resource
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

	@property {Integer} TOTAL_SIZE @readonly Size of the download in bytes

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
		TOTAL_BYTES: 0,

		DOWNLOADED_DATA: null,
		DOWNLOADED_TEXT: "",
		DOWNLOADED_XML: null,

		STATUS: "UNSENT"

	},

	_httpClient: null,

	initialize: function() {

		this.get("autostart") && this.start();

	},

	start: function() {

		function fail(reason) {
			log(
				"Download failed" + 
				(reason ? ". Reason: " + reason : "")
			);
			return false;
		}

		var download = this;

		if (!Ti.Network.online) return fail("Can't start download: no internet connection");

		var status = download.get("STATUS");
		if (status !== "UNSENT" && status !== "DONE") {
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

				clientDetails = _.extend(
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
					]),
					clientDetails
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

				file = url.file;

				url = url.url;

			} else {

				callbacks = {};
				method = "GET";
				arguments = {};

			}

		// ======================

		log("Starting download...");			

		download.set({

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
			TOTAL_BYTES: 0,

			STATUS: "UNSENT"

		});



		download._httpClient = Ti.Network.createHTTPClient(_.extend(clientDetails, {


			ondatastream: function(event) {
				// log("ondatastream", Utils.prettyStringify(event));
				// log("ondatastream", event.progress.toFixed(4));
				if (typeof callbacks.ondatastream === "function") callbacks.ondatastream(event);
				download.set("DOWNLOADED_PERCENT", 100 * event.progress);
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
						var size = parseInt(this.getResponseHeader("Content-length"));
						size && download.set("TOTAL_BYTES", size);
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

			// file: download.path

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

		file = download.get("path") || file;
		if (file) {
			if (FileIO.fileExists(file)) {
				if (!download.get("forceOverwrite")) {
					return fail("File already exists: " + file);
				} else {
					log("Overwriting existing file: " + file);
				}
			}
			getFile(file, true).remoteBackup = !!download.get("remoteBackup");
			download._httpClient.file = file;
		}

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

		if (this._httpClient.file) {

			var file = FileIO.getFile(this._httpClient.file);
			if (file.exists()) FileIO.deleteFile();

		}

	}

});



module.exports = Download;