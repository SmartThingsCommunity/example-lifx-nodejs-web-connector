"use strict";

const log = require('../local/log');
const st = require('./st');
const lifx = require('../api/lifx');
const config = require('config');
const deviceProfileId = config.get('deviceProfiles.color');

/**
 * Utility methods
 */
module.exports = {

    /**
     * Compares device lists from LIFX and SmartThings, creating and deleting devices as necessary
     *
     * @param token SmartThings access token
     * @param locationId SmartThings location ID
     * @param lifxDevices List of devices from LIFX
     * @param smartThingsDevices List of devices from SmartThings
     */
    reconcileDeviceLists: function (token, locationId, installedAppId, lifxDevices, smartThingsDevices) {
        // Iterate over lights to see if any are missing from SmartThings and need to be added
        lifxDevices.forEach(function (light) {
            if (!smartThingsDevices.find(function (device) { return device.app.externalId == light.id; })) {

                // Device from LIFX not found in SmartThings, add it
                let map = {
                    label: light.label,
                    profileId: deviceProfileId,
                    locationId: locationId,
                    installedAppId: installedAppId,
                    externalId: light.id
                };

                st.createDevice(token, map).then(function (data) {
                    log.debug("created device " + data.deviceId);
                    st.sendEvents(token, data.deviceId, lifx.allLightEvents(light))
                }).catch(function (err) {
                    log.error(`${err}  creating device`);
                });
            }
        });

        // Iterate over all lights in SmartThings and delete any that are missing from LIFX
        smartThingsDevices.forEach(function(device) {
            if (!lifxDevices.find(function(light) { return device.app.externalId == light.id; })) {

                // Device in SmartThings but not LIFX, delete it
                st.deleteDevice(token, device.deviceId).then(function(data) {
                    log.debug(`deleted device ${device.deviceId}`);
                }).catch(function (err) {
                    log.error(`${err}  deleting device`);
                });
            }
        });
    },

    /**
     * Returns LIFX access token, which is in Redis persisted state when using OAuth with clientId and clientSecret
     * or in a configuration setting when users enter personal tokens directly
     *
     * @param state
     * @param configuration
     */
    lifxAccessToken: function(state, configuration) {
        if (state) {
            return state.lifxAccessToken;
        }
        else {
            return configuration.lifxAccessToken[0].stringConfig.value;
        }
    }
};