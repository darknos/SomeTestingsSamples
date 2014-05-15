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

	var p = "";
	if (timestamp) p += timeStamp() + " ";
	if (prefix)    p += prefix + ": ";
	
	return function(/* arguments */) {
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



module.exports = createLogger;