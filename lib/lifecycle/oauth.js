'use strict';

const db = require('../local/db');
const log = require('../local/log');
const lifx = require('../api/lifx');
const config = require('config');

module.exports = {

    /**
     * Handles the OAuth callback from LIFX, calling them with the code and receiving the access and refresh tokens,
     * which are save in the database.
     *
     * @param oauthCallbackData
     */
    handleOauthCallback: function(oauthCallbackData) {
        lifx.handleOauthCallback(oauthCallbackData.installedAppId, oauthCallbackData.urlPath).then(function(data) {
            log.debug("RES BODY=" + JSON.stringify(data));
            db.put(oauthCallbackData.installedAppId, {lifxAccessToken: data.access_token, lifxRefreshToken: data.refresh_token});
        }).catch(function(err) {
            log.error(`RES ERR =${err}`);
        });
    }

};