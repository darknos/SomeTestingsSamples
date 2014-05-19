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

var osName = Ti.Platform.name;

var OS_IOS     = osName === "iPhone OS";
var OS_ANDROID = osName === "android";


var osVersion = (Ti.Platform.version.match(/\d+/) || [])[0];

// var BG_DOWNLOAD_SUPPORT = OS_IOS && osVersion >= 7;
var BG_DOWNLOAD_SUPPORT = false;


var Utils    = require("downloader/utils");
var log      = Utils.createLogger("NetworkHandler", true);
var Download = require("downloader/Download");
var bgLoad   = BG_DOWNLOAD_SUPPORT ? require("downloader/BackgroundDownloader") : function() {};
var _        = require("lib/underscore");



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

		loader = new Download({
			name: params.label,
			url: url,
			autostart: false
		});

		loader.on("change", function(model, changes) {
			log(
				"Model changed: " +
				Object.keys(changes.changes).map(
					function(key) {
						var value = loader.get(key);
						if (key === "DOWNLOADED_TEXT") {
							if (typeof value === "string") {
								value = "String[" + value.length + "]";
							} else {
								value = Object.prototype.toString.call(value) + " // " + typeof value;
							}
						}
						return key + " = " + value;
					}
				).join(", ")
			);
		});

		loader.start();

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

	function getLatestDownload() {
		var i = loaders.length - 1;
		var l;
		while (i > 0 && !(l = loaders[i])) i--;
		if (i >= 0) return loaders[i];
	}

	function cancelLatestDownload() {
		var l = getLatestDownload();
		if (l) {
			l.cancel();
		} else {
			log("Nothing to cancel");
		}
	}

// ============================



function doNetworkTest(url, label) {

	if (!url) return;

	var id;

	loader = download(url,
		{
			label: label,
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
				log(
					"Loading... " + (100 * have / total).toFixed(2) + "%, " +
					"ETA: " + parseInt(eta / 1000) + "s"
				);
			},
			onAfter: function() {
				log("onAfter");
				removeLoader(id);
			},
			// progressUpdateInterval: 500
			progressUpdateSize: 10 * 1024 * 1024 // 10mb
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
					0, 0, width, height / 5,
					function() {
						log("Initiating downloading 35mb zip");
						doNetworkTest("http://www.ex.ua/load/29563076", this.label);
					}
				),

				new Button(
					"Download 18gb zip", "#ffffaa",
					0, height / 5, width, height / 5,
					function() {
						log("Initiating downloading 18gb zip");
						doNetworkTest("http://www.ex.ua/load/102326988", this.label);
					}
				),

				new Button(
					"Cancel latest download", "#ffaaaa",
					0, 2 * height / 5, width, height / 5,
					function() {
						log("Canceling latest download");
						cancelLatestDownload();
					}
				),

				new Button(
					"Test broken download", "#ffaaff",
					0, 3 * height / 5, width, height / 5,
					function() {
						log("Initiating incorrect downloading");
						doNetworkTest("http://path/to/incorrect/url", this.label);
					}
				),

				new Button(
					"Print latest download model", "#aaffff",
					0, 4 * height / 5, width, height / 5,
					function() {
						log("Printing latest download model");
						var model = (getLatestDownload() || {}).attributes;
						if (!model) {
							log("No download found");
						} else {
							log(
								"Latest download model: " +
								Utils.prettyStringify(
									_.defaults({ DOWNLOADED_TEXT:
										Object.prototype.toString.call(model.DOWNLOADED_TEXT)
									}, model), true
								)
							);
						}
					}
				)

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