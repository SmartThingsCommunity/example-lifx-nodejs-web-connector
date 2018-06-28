'use strict';

const log = require('../local/log');
const db = require('../local/db');
const lifx = require('../api/lifx');
const util = require('../api/util');

const config = require('config');
const appName = config.get('connector.appName');
const lifxOauthEndpoint = config.get('lifx.oauthEndpoint');
const lifxClientId = config.get('lifx.clientId');

/**
 * CONFIGURATION lifecycle event handling
 */
module.exports = {

    /**
     * Return scopes and other data about this app
     */
    initialize: function(configurationData, response)
    {
        let config = {
            initialize: {
                id: appName,
                name: 'LIFX Connector',
                description: 'Creates LIFX devices in SmartThings',
                permissions: ['l:devices', 'i:deviceprofiles', 'w:schedules'],
                firstPage: 'mainPage'
            }
        };
        log.response(response, {statusCode: 200, configurationData: config});
    },

    /**
     * Return the configuration page for the app, either the link to log into LIFX or, if already authenticated,
     * the page to select the LIFX location to import.
     */
    page: function(configurationData, response) {
        db.get(configurationData.installedAppId, function(state) {
            if (lifxClientId) {
                if (state && state.lifxAccessToken) {
                    // Authenticated, display page to select location
                    locationsPage(configurationData, response)
                }
                else {
                    // Not authenticate but with a clientId, display page to connect to LIFX
                    authPage(configurationData, response);
                }
            }
            else {
                if (configurationData.pageId == "locationsPage") {
                    // Display page to select location with test API key
                    locationsPage(configurationData, response)
                }
                else {
                    // No client ID. Prompt for direct entry of access token
                    tokenPage(configurationData, response);
                }
            }
        });
    }
};

/**
 * Page that links to LIFX for login
 */
function authPage(configurationData, response) {
    let connectorAppId = configurationData.installedAppId;
    //let url = `${lifxOauthEndpoint}/authorize?client_id=${lifxClientId}&state=${connectorAppId}&scope=remote_control:all&response_type=code`;
    let url = `${lifxOauthEndpoint}/authorize?client_id=${lifxClientId}&scope=remote_control:all&response_type=code`;
    log.debug("AUTH URL="+ url);
    let config = {
        page: {
            pageId: 'mainPage',
            name: 'Connect to LIFX',
            nextPageId: null,
            previousPageId: null,
            complete: false,
            sections: [
                {
                    name: "Remote service authorization",
                    settings: [
                        {
                            type: "OAUTH",
                            id: "OAuth",
                            name: "Connect to LIFX",
                            required: false,
                            urlTemplate: url
                        }
                    ]
                }
            ]
        }
    };
    log.response(response, {statusCode: 200, configurationData: config});
}

/**
 * Page that allows entry of a personal API token for testing purposes (in cases where OAuth client credentials
 * are not available.
 */
function tokenPage(configurationData, response) {
    let connectorAppId = configurationData.installedAppId;
    let url = `${lifxOauthEndpoint}/authorize?client_id=${lifxClientId}&state=${connectorAppId}&scope=remote_control:all&response_type=code`;
    log.debug("AUTH URL="+ url);
    let config = {
        page: {
            pageId: 'mainPage',
            name: 'Connect to LIFX',
            nextPageId: "locationsPage",
            previousPageId: null,
            complete: false,
            sections: [
                {
                    name: "Remote service authorization",
                    settings: [
                        {
                            type: "PARAGRAPH",
                            id: "text",
                            name: "This app is in test mode. To use it you should enter your test access token from the LIFX developer site. " +
                                    "Test mode provides all features of the app other than OAuth into LIFX. " +
                                    "To test that feature you will need to obtain a client ID and secret from LIFX. You can do that from the " +
                                    "link below.",
                        },
                        {
                            type: "TEXT",
                            id: "lifxAccessToken",
                            name: "Enter your LIFX API token",
                            description: "From https://cloud.lifx.com/",
                            required: true
                        }
                    ]
                },
                {
                    settings: [
                        {
                            type: "LINK",
                            id: "href",
                            name: "Get a LIFX Personal Access Token >>",
                            required: false,
                            url: "https://cloud.lifx.com/settings"
                        }
                    ]
                }
            ]
        }
    };
    log.response(response, {statusCode: 200, configurationData: config});
}

/**
 * Page that allows a location to be chosen
 */
function locationsPage(configurationData, response) {
    db.get(configurationData.installedAppId, function(state) {
        let testToken = configurationData.config.lifxAccessToken;
        let lifxAccessToken = util.lifxAccessToken(state, configurationData.config);
        lifx.getLocations(lifxAccessToken, function(locations) {
            let config = {
                page: {
                    pageId: 'locationsPage',
                    name: 'Select Location',
                    nextPageId: null,
                    previousPageId: null,
                    complete: true,
                    sections: [
                        {
                            settings: [
                                {
                                    type: "ENUM",
                                    id: "lifxLocationId",
                                    name: "Select location",
                                    required: false,
                                    options: locations
                                }
                            ]
                        }
                    ]
                }
            };
            log.response(response, {statusCode: 200, configurationData: config});
        });
    });
}