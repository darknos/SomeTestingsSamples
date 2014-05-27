var Backbone = require("lib/Backbone");

/**

@Class Resource

	Resource is
	 * local folder / zip / file
	OR
	 * remote file / zip
	Most commonly it's remote zip file
	
	How to use it:

	First, make sure it is ready to use (`STATE` = Resource.STATE_READY).
	Reasons to be not ready:
	 * It's remote and is not downloaded yet.
	 * It's zip and it's not unpacked yet.

	Then you can use `dataPath` to acces the working
	path of folder or file, depending on resource type.

	If it's not ready, you can use `load`, `obtain` or `download` and `unpack`, and listen for
	`STATE` change (should over at rather Resource.STATE_READY or Resource.STATE_FAILED). 
	For additional info on downloading progress it is possible to monitor `downloadObject`.


	// Todo:
	Handle app restart, and so initializing resources 
	When resource is zip and the source was removed after unpacking,
	it is hard to get is the resource available or not after app restart



@param {Object|String} details
	Object with details or url of remote not compressed file.

@param {String|Object} details.url
    Where to obtain resource data from. May be local or remote.
    If object, it is input for instance of `Download`
	// /Resources/Products/5162/
	// /Resources/Products/5162.zip
	// /Resources/Products/wallpaper.png
	// http://path/to/manifest.txt
	// http://path/to/archive.zip

@param {String} [details.destination = ""]
	Where to place obtained data. May be rather blank or path to folder or file.
	If blank, `dataPath` will be generated based on md5 of the url.
	This field is ignored if the resource is a local file or folder.
	// Todo: copy?

@param {Boolean} [details.local = false]
	Whether the url is local. Otherwise it's considered to be remote

@param {Boolean} [details.compressed = false]
	Whether the data is ZIP archive

@param {Boolean} [details.folder = false]
	Whether the data consist of multiple files.
	For this case `destination` has to be a path to a folder.

@param {Boolean} [details.locked = false]
	Whether data is locked, isn't used by the class
	and is designed for other's purpose.

@param {Boolean} [details.autoLoad = false]
@param {Boolean} [details.autoDownload = false]
@param {Boolean} [details.autoUnpack = false]

@param {Boolean} [details.remoteBackup = false]

@property {Boolean} locked
@property {Resource.STATE_*} STATE

@property {Download} downloadObject

@property {String} dataPath
*/
var Resource = Backbone.model.extend({

	defaults: {

		STATE: Resource.STATE_IDLE,

		IS_ZIP:    false,
		IS_FOLDER: false,
		IS_LOCAL:  false,

		locked: false,

		url:      "",
		dataPath: "",

		downloadObject: null

	},

	constructor: function(params) {

		var self = this;

		// ===== Shortcuts =====

			var get = this.get;

			// silent set
			function init(name, value) {
				var params;
				if (!isString(name)) {
					params = {};
					params[name] = value;
				} else {
					params = name;
				}
				self.set(params, { silent: true });
			}

		// =====================

		// normalize input
		if (isString(params)) params = { url: params };

		init({

			IS_LOCAL:  !!params.local,
			IS_FOLDER: !!params.folder,
			IS_ZIP:    !!params.compressed,

			url:      params.url         || "",
			dataPath: params.destination || "",

			locked: !!params.locked,

			autoLoad:     !!params.autoLoad,
			autoDownload: !!params.autoDownload,
			autoUnpack:   !!params.autoUnpack

		});

		if (get("IS_LOCAL")) init("STATE", Resource.STATE_READY);

		function autoLoad() {
			// ...
			if (fail) this.obtain();
		}
		function autoDownload() {
			if (IS_LOCAL) {
				autoUnpack();
				return;
			}
			// ...
			if (success) autoUnpack();
		}
		function autoUnpack() {
			if (!IS_ZIP) return;
			// ...
		}

		if (params.autoLoad) autoLoad();

		// Launch original constructor without 1st param
		Backbone.Model.apply(this,
			[ undefined ].concat(Array.prototype.slice.call(arguments, 1))
		);

	}

}, {

	LOCAL:  0x1,
	REMOTE: 0x2,

	STATE_IDLE:        0,
	STATE_DOWNLOADING: 1,
	STATE_UNPACKING:   2,
	STATE_READY:       3,
	STATE_FAILED:      4,

	load: function() {
		// restore Resource from persistant data, such as files, Ti.App.Properties
	},

	download: function() {
		// download resource
	},

	unpack: function() {
		// unpack zip
	},

	obtain: function() {
		// download if needed
		// unpack if needed
	}

});