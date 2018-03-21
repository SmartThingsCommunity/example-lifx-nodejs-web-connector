"use strict"

const redis = require("redis");
const config = require('config');
const redisClient = redis.createClient({host: config.get('redis.host'), port: config.get('redis.port')});

function key(installedAppId) {
	return "lifx:" + installedAppId;
}

/**
 * Redis-based storage and retrival of account data
 */
module.exports = {

	/**
	 * Saves data map associated with an installed instance of the app
	 */
	put: function(installedAppId, map, callback) {
		let args = [key(installedAppId)];
		for (let key in map) {
			if (map.hasOwnProperty(key)) {
				args.push(key);
				args.push(map[key]);
			}
		}
		redisClient.hmset(args, function(err, reply) {
			if (err) {
				console.log("REDIS ERROR " + JSON.stringify(err));
			}
			else if (callback) {
				callback(reply);
			}
		});
	},

	/**
	 * Delete the entry
	 */
	delete: function(installedAppId, callback) {
		redisClient.del(key(installedAppId), function(err, reply) {
			if (err) {
				console.log("REDIS ERROR " + JSON.stringify(err));
			}
			else if (callback) {
				callback(reply);
			}
		});
	},

	/**
	 * Gets the entry for an installed app instance
	 */
	get: function(installedAppId, callback) {
		redisClient.hgetall(key(installedAppId), function(err, reply) {
			if (err) {
				console.log("REDIS ERROR " + JSON.stringify(err));
			}
			else if (callback) {
				callback(reply);
			}
		});
	}
};
