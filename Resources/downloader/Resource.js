var Backbone    = require("lib/Backbone");
var Compression = require("ti.compression");
var Download    = require("downloader/Download");

// ===== Tools =====

	function isString(obj) {
		return Object.prototype.toString.call(obj) === "[object String]";
	}

// =================



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

	Then you can use `dataPath` to acces the working path of folder or file, depending on resource type.

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

@param {String} [details.id]
	Id of the resource, used for restoring Resource. Default is value of `details.url`

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


@property {String} id
@property {Boolean} locked

@property {Resource.STATE_*} STATE @readonly

@property {Boolean} IS_ZIP    @readonly
@property {Boolean} IS_FOLDER @readonly
@property {Boolean} IS_LOCAL  @readonly

@property {Download} downloadObject @readonly

@property {String} dataPath @readonly

*/

function Resource(params) {

	var self = this;

	// Normalize input
	if (isString(params)) params = { url: params };

	this.model = null;

	this.downloadModel = null;

	this.IS_ZIP    = false;
	this.IS_FOLDER = false;
	this.IS_LOCAL  = false;

	this.url      = "";
	this.id       = "";
	this.dataPath = "";



	// ===== Init =====

		this.IS_LOCAL  = !!params.local;
		this.IS_FOLDER = !!params.folder;
		this.IS_ZIP    = !!params.compressed;

		if (params.url)      this.url      = params.url;
		if (params.dataPath) this.dataPath = params.destination;
		this.id = params.id || params.url || "";

		this.autoDownload = !!params.autoDownload;
		this.autoUnpack   = !!params.autoUnpack;

		this.model = new ResourceModel({
			STATE: this.IS_LOCAL && !this.IS_ZIP ? Resource.STATE_READY : Resource.STATE_IDLE,
			locked: !!params.locked
		});

		if (this.model.get("STATE") === Resource.STATE_READY) return this;

		var goOn = true;
		if (params.autoLoad) goOn = !this.load();
		if (!goOn) return this;

		var autoUnpack = this.IS_ZIP && params.autoUnpack;
		if (this.IS_LOCAL) {
			autoUnpack && this.unpack();
		} else
		if (params.autoDownload) this.download(
			autoUnpack ? function() { this.unpack(); } : undefined
		);
		
	// ================

}



// ===== Model =====

	var ResourceModel = Backbone.Model.extend({

		defaults: {

			STATE:      Resource.STATE_IDLE,
			ERROR_CODE: Resource.ERROR_NONE,

			locked: false

		}

	});
	
// =================



// ===== Methods =====

	// Save Resource to persistant data, such as files, Ti.App.Properties etc
	Resource.prototype.save = function() {
		


	};


	// Restore Resource from persistant data, such as files, Ti.App.Properties etc
	Resource.prototype.load = function() {



		// this.update();

	};


	// Sets `STATE` to `Resource.STATE_FAILED` if resulting file(s) was deleted
	Resource.protype.update = function() {



	};



	// download resource
	// Can't be done if `STATE` is not `STATE_IDLE` nor `STATE_FAILED`
	Resource.prototype.download = function(onOk, onFail, onAnyway) {

		function success(/* arguments */) {
			if (typeof onOk     === "function") onOk.apply(this, arguments);
			if (typeof onAnyway === "function") onAnyway();
			return true;
		}

		function fail() {
			if (typeof onFail   === "function") onFail();
			if (typeof onAnyway === "function") onAnyway();
			return false;
		}

		var state = this.model.get("STATE");
		if (state !== Resource.STATE_IDLE && state !== Resource.STATE_FAILED) return fail();

		this.model.set("STATE", Resource.STATE_DOWNLOADING);

		this.downloadModel = new Download(this.url, {
			onOk: success,
			onFail: fail
		});

	};

	// XXX unpack zip
	Resource.prototype.unpack = function(onOk, onFail, onAnyway) {
		var zipFilePath; // Ti.Filesystem.applicationDataDirectory + filepath,
		var destination; // Ti.Filesystem.applicationDataDirectory + zipFilepath,
		var overwrite = true;
		var success = Compression.unzip(zipFilepath, destination, overwrite);
		if (success) {
			// todo:
			// If zip contained single file, move it to `destination`
			// Delete zip if needed
			// Permanently mark resource as obtained
			this.model.set("STATE", Resource.STATE_DONE);
		} else {
			this.model.set({
				STATE:      Resource.FAILED,
				ERROR_CODE: Resource.ERROR_UNPACK_FAILED
			});
		}
		this.model.set("STATE", success ? Resource.STATE_DONE : Resource.STATE_FAILED);
		return success;
	};



	Resource.prototype.obtain = function() {
		// download if needed
		// unpack if needed
		if (this.IS_LOCAL) {
			if (this.IS_ZIP && this.autoUnpack) this.unpack();
		} else {
			this.download();
		}
	};

// ===================



// ===== Constants =====


	Resource.prototype.STATE_IDLE        = 0;
	Resource.prototype.STATE_DOWNLOADING = 1;
	Resource.prototype.STATE_READY       = 2;
	Resource.prototype.STATE_FAILED      = 3;

	Resource.prototype.ERROR_NONE          = 0;
	Resource.prototype.ERROR_UNPACK_FAILED = 1;

	// Resource.prototype.LOCAL  = 1;
	// Resource.prototype.REMOTE = 2;

// =====================