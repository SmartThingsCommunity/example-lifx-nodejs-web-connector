'use strict';

const log = require('../local/log');
const db = require('../local/db');
const lifx = require('../api/lifx');
const st = require('../api/st');
const util = require('../api/util');

module.exports = {

    /**
     * Handles device command events, calling LIFX to control the bulb and generating the appropriate events
     *
     * @param eventData
     * @param commandsEvent
     */
    handleDeviceCommand: function(eventData, commandsEvent) {
        let deviceCommandsEvent = commandsEvent.deviceCommandsEvent;
        let token = eventData.authToken;
        db.get(eventData.installedApp.installedAppId, function(state) {
            let lifxAccessToken = util.lifxAccessToken(state, eventData.installedApp.config);
            deviceCommandsEvent.commands.forEach(function(cmd) {
                switch (cmd.command) {
                    case "on": {
                        lifx.sendCommand(lifxAccessToken, deviceCommandsEvent.externalId, {power: "on"}, function (data, resp) {
                            let body = [
                                {
                                    component: "main",
                                    capability: "switch",
                                    attribute: "switch",
                                    value: "on"
                                }
                            ];
                            st.sendEvents(token, deviceCommandsEvent.deviceId, body);
                        });
                        break;
                    }
                    case "off": {
                        lifx.sendCommand(lifxAccessToken, deviceCommandsEvent.externalId, {power: "off"}, function (data, resp) {
                            let body = [
                                {
                                    component: "main",
                                    capability: "switch",
                                    attribute: "switch",
                                    value: "off"
                                }
                            ];
                            st.sendEvents(token, deviceCommandsEvent.deviceId, body);
                        });
                        break;
                    }
                    case "setLevel": {
                        let level = cmd.arguments[0];
                        let lifxLevel =level / 100.0;
                        lifx.sendCommand(lifxAccessToken, deviceCommandsEvent.externalId, {
                            power: "on",
                            brightness: lifxLevel
                        }, function (data, resp) {
                            let body = [
                                {
                                    component: "main",
                                    capability: "switch",
                                    attribute: "switch",
                                    value: "on"
                                },
                                {
                                    component: "main",
                                    capability: "switchLevel",
                                    attribute: "level",
                                    value: level
                                }
                            ];
                            st.sendEvents(token, deviceCommandsEvent.deviceId, body);
                        });
                        break;
                    }
                    case "setHue": {
                        let hue = cmd.arguments[0];
                        let lifxHue =hue * 3.6;
                        lifx.sendCommand(lifxAccessToken, deviceCommandsEvent.externalId, {
                            power: "on",
                            color: `hue:${lifxHue}`
                        }, function (data, resp) {
                            let body = [
                                {
                                    component: "main",
                                    capability: "switch",
                                    attribute: "switch",
                                    value: "on"
                                },
                                {
                                    component: "main",
                                    capability: "colorControl",
                                    attribute: "hue",
                                    value: hue
                                }
                            ];
                            st.sendEvents(token, deviceCommandsEvent.deviceId, body);
                        });
                        break;
                    }
                    case "setSaturation": {
                        let saturation = cmd.arguments[0];
                        let lifxSat = saturation  / 100.0;
                        lifx.sendCommand(lifxAccessToken, deviceCommandsEvent.externalId, {
                            power: "on",
                            color: `saturation:${lifxSat}`
                        }, function (data, resp) {
                            let body = [
                                {
                                    component: "main",
                                    capability: "switch",
                                    attribute: "switch",
                                    value: "on"
                                },
                                {
                                    component: "main",
                                    capability: "colorControl",
                                    attribute: "saturation",
                                    value: saturation
                                }
                            ];
                            st.sendEvents(token, deviceCommandsEvent.deviceId, body);
                        });
                        break;
                    }
                    case "setColorTemperature": {
                        let kelvin = cmd.arguments[0];
                        lifx.sendCommand(lifxAccessToken, deviceCommandsEvent.externalId, {
                            power: "on",
                            color: `kelvin:${kelvin}`
                        }, function (data, resp) {
                            let body = [
                                {
                                    component: "main",
                                    capability: "switch",
                                    attribute: "switch",
                                    value: "on"
                                },
                                {
                                    component: "main",
                                    capability: "colorTemperature",
                                    attribute: "colorTemperature",
                                    value: kelvin
                                }
                            ];
                            st.sendEvents(token, deviceCommandsEvent.deviceId, body);
                        });
                        break;
                    }
                    case "setColor": {
                        let map = cmd.arguments[0];
                        let lifxHue = map.hue * 3.6;
                        let lifxSat = map.saturation  / 100.0;
                        lifx.sendCommand(lifxAccessToken, deviceCommandsEvent.externalId, {
                            power: "on",
                            color: `hue:${lifxHue} saturation:${lifxSat}`
                        }, function (data, resp) {
                            let body = [
                                {
                                    component: "main",
                                    capability: "switch",
                                    attribute: "switch",
                                    value: "on"
                                },
                                {
                                    component: "main",
                                    capability: "colorControl",
                                    attribute: "hue",
                                    value: map.hue
                                },
                                {
                                    component: "main",
                                    capability: "colorControl",
                                    attribute: "saturation",
                                    value: map.saturation
                                }
                            ];
                            st.sendEvents(token, deviceCommandsEvent.deviceId, body);
                        });
                        break;
                    }
                }
            });
        });
    },

    /**
     * Handles the periodic polling event
     *
     * @param eventData
     * @param scheduleEvent
     */
    handleScheduledEvent: function(eventData, scheduleEvent) {
        let token = eventData.authToken;
        st.listDevices(token, eventData.installedApp.locationId, eventData.installedApp.installedAppId).then(function(devices) {
            db.get(eventData.installedApp.installedAppId, function(state) {
                let lifxAccessToken = util.lifxAccessToken(state, eventData.installedApp.config);
                let lifxLocationId = eventData.installedApp.config.lifxLocationId[0].stringConfig.value;
                lifx.getLights(lifxAccessToken, lifxLocationId, function(lights) {
                    lights.forEach(function(light) {
                        let device = devices.find(function(d) { return d.app.externalId == light.id; });
                        if (device) {
                            log.debug(`Sending events for ${light.id}`);
                            st.sendEvents(eventData.authToken, device.deviceId, lifx.allLightEvents(light))
                        }
                    });
                    util.reconcileDeviceLists(token, eventData.installedApp.locationId, eventData.installedApp.installedAppId, lights, devices);
                });
            });
        });
    }
};
