var log = require("downloader/utils").createLogger("FileIO");



function getFile(filepath, allowNewFolder) {

	filepath = filepath
		.replace(/\.{2}/g, "")
		.replace(/\/{2,}/g, "/")
		.replace(/^\/|\/$/g, "");

	if (allowNewFolder && filepath.indexOf("/") !== -1) {
		createFolder(filepath.substr(0, filepath.lastIndexOf("/")));
	}
	return Ti.Filesystem.getFile(
		Ti.Filesystem.applicationDataDirectory,
		filepath
	);
}

function fileExists(filename) {
	return getFile(filename).exists();
}



function createFolder(folderName) {

	log("Creating folder " + folderName);

	folderName = folderName
		.replace(/\.{2}/g, "")
		.replace(/\/{2,}/g, "/")
		.replace(/^\/|\/$/g, "");


	var file = getFile(folderName);
	if (file && file.exists() && file.isDirectory()) {
		log("Folder already exists");
		file = null;
		return true;
	}


	var folders = [];
	if (folderName.indexOf("/") !== -1) {
		var folders = folderName
			.split("/")
			.map(function(e, i, a) {
				return a.slice(0, i + 1).join("/")
			});
	} else {
		folders = [ folderName ];
	}

	return folders.every(function(e) {

		var file = getFile(e);
		var success;

		if (file.exists()) {
			success = file.isDirectory();
			if (success) {
				log("Folder already exists");
			} else {
				log("Error: " +	e + " exists but is not a folder");
			}
		} else {
			success = file.createDirectory();
			if (success) {
				file.remoteBackup = false;
				log("Folder created");
			} else {
				log("Error: Couldn't create folder");
			}
		}

		file = null;
		return success;

	});

}



function writeFile(filename, data) {

	log("Caching file " + filename);

	var file = getFile(filename, true);
	var success;

	if (!(success = file.exists())) {
		success = file.createFile();
	} else {
		log("File exists, will be overwriteen");
	}

	if (success) {
		file.remoteBackup = false;
		if (success = file.write(data)) {
			log("File has been written");
		} else {
			log("Couldn't write file");
		}
	} else {
		log("Couldn't create file");
	}

	file = null;
	return success;

}



function readFile(filename) {

	log("Reading file " + filename);

	var file = getFile(filename);

	if (file.exists()) {

		var result = file.read();

		if (result) {
			log("File has been read");
		} else {
			log("Couldn't read file (perhaps it's empty)");
		}

		file = null;
		return result;

	} else {

		log("File doesn't exists");

		file = null;
		return false;

	}

}



function deleteFile(filename) {

	log("Deleting file " + filename);

	var file = getFile(filename);

	if (file.exists()) {

		var success = file.deleteFile();

		if (success) {
			log("File has been deleted");
		} else {
			log("Couldn't delete file");
		}

		file = null;
		return success;

	} else {

		log("File doesn't exists");

		file = null;
		return true;

	}

}