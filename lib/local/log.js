"use strict"

/**
 * Simple wrapper around the console for logging various kinds of information
 */
module.exports = {
	trace: function(msg) {
		console.log("TRACE - " + msg);
	},
    debug: function(msg) {
        console.log("DEBUG - " + msg);
    },
    info: function(msg) {
		console.log("INFO  - " + msg);
	},
    warn: function(msg) {
        console.log("WARN  - " + msg);
    },
    error: function(msg) {
		console.log("ERROR - " + msg);
	},
    response: function(response, data) {
        console.log(`RESPONSE: ${JSON.stringify(data, null, 2)}`);
        response.json(data);
    }
};