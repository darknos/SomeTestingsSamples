/**
 * Works similar to JSON.stringify, except for output is more accurate.
 * Doesn't works for circular structures.
 * @param {Object} obj Object to stringify
 * @param {Boolean} [multiline] If false will return single line
 * @param {String} [prefix] Used for identation, you'd probably want to leave it blank
 * @return {String} Stringified object
 */
function prettyStringify(obj, multiline, prefix) {

	try {
		JSON.stringify(obj);
	} catch(e) {
		return "Can't stringify " + obj;
	}
	if (obj !== Object(obj)) return Object.prototype.toString.call(obj);

	result = "{";
	var keys = Object.keys(obj);
	if (keys.length > 0) {
		prefix = prefix || "";
		result += multiline ? "\n" : " ";
		Object.keys(obj).forEach(function(key, i, arr) {
			if (multiline) result += prefix + "\t";
			if (key.indexOf(":") !== -1) {
				result += "\"" + key + "\"";
			} else {
				result += key;
			}
			result += ": ";
			if (obj[key] === Object(obj[key])) {
				result += prettyStringify(obj[key], multiline, prefix + "\t");
			} else {
				result += JSON.stringify(obj[key]);
			}
			if (i < arr.length - 1) result += multiline ? ",\n" : ", ";
		});
		result += multiline ? "\n" + prefix + "}" : " }";
	} else {
		result += "}";
	}
	return result;
}



/**
 * Creates a logger function. It's silent for production version.
 * May optinally have timestamp and prefix.
 * @param {String} [prefix]
 * @param {Boolean} [timestamp] If true, log message will include timestamp
 * @param {Boolean} [disabled] If true, will not log anything.
 * @return {Function} Logger function ready to use
 */
function createLogger(prefix, timestamp, disabled) {

	if (disabled || Ti.App.deployType === "production") return function() {};
	
	return function(/* arguments */) {

		var p = "";
		if (timestamp) p += timeStamp() + " ";
		if (prefix)    p += prefix + ": ";

		console.log(p + Array.prototype.join.call(arguments, ", "));
		
	};

}



function timeStamp(d) {
	d = d || new Date();
	return [ "Hours", "Minutes", "Seconds", "Milliseconds" ].map(
		function(e, i) {
			e = d["get" + e]();
			if (i < 3)   return e < 10 ? "0" + e : e;
			if (e <  10) return "00" + e;
			if (e < 100) return "0"  + e;
			return e;
		}
	).join(":");
}



module.exports.createLogger    = createLogger;
module.exports.prettyStringify = prettyStringify;