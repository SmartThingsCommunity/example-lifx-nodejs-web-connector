'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const config = require('config');
const fs = require('fs');

const db = require('./lib/local/db');
const log = require('./lib/local/log');
const publicKey = fs.readFileSync('./config/smartthings_rsa.pub', 'utf8');
const httpSignature = require('http-signature');

const configurationLifecycle = require('./lib/lifecycle/configuration');
const oauthLifecycle = require('./lib/lifecycle/oauth');
const crudLifecycle = require('./lib/lifecycle/crud');
const eventLifecycle = require('./lib/lifecycle/event');


const app = module.exports = express();
app.use(bodyParser.json());
app.post('/', function(req, response) {
    callbackHandler(req, response)
});

function callbackHandler(req, response) {
    if (req.body && req.body.lifecycle === "PING" || signatureIsVerified(req)) {
        handleCallback(req, response);
    } else {
        log.error("Unauthorized");
        response.status(401).send("Forbidden");
    }
}

function signatureIsVerified(req) {
    try {
        let parsed = httpSignature.parseRequest(req);
        if (!httpSignature.verifySignature(parsed, publicKey)) {
            log.error('forbidden - failed verifySignature');
            return false;
        }
    } catch (err) {
        log.error(err);
        return false;
    }
    return true;
}

function handleCallback(req, response) {
    let evt = req.body;
    switch (evt.lifecycle) {

        // PING happens during app creation. Respond with challenge to verify app
        case 'PING': {
            log.trace(`${evt.lifecycle}\nREQUEST: ${JSON.stringify(evt, null, 2)}`);
            log.response(response, {statusCode: 200, pingData: {challenge: evt.pingData.challenge}});
            break;
        }

        // CONFIGURATION is once with INITIALIZE and then for each PAGE
        case 'CONFIGURATION': {
            let configurationData = evt.configurationData;
            switch (configurationData.phase) {
                case 'INITIALIZE':
                    log.trace(`${evt.lifecycle}/${configurationData.phase}\nREQUEST: ${JSON.stringify(evt, null, 2)}`);
                    configurationLifecycle.initialize(configurationData, response);
                    break;
                case 'PAGE':
                    log.trace(`${evt.lifecycle}/${configurationData.phase}/${configurationData.pageId}\nREQUEST: ${JSON.stringify(evt, null, 2)}`);
                    configurationLifecycle.page(configurationData, response);
                    break;
                default:
                    throw new Error(`Unsupported config phase: ${configurationData.phase}`);
            }
            break;
        }

        case 'OAUTH_CALLBACK': {
            log.trace(`${evt.lifecycle}\nREQUEST: ${JSON.stringify(evt, null, 2)}`);
            log.debug(JSON.stringify(evt));
            oauthLifecycle.handleOauthCallback(evt.oauthCallbackData);
            log.trace(`RESPONSE: ${JSON.stringify(evt, null, 2)}`);
            log.response(response, {statusCode: 200, oAuthCallbackData: {}});
            break;
        }

        case 'INSTALL': {
            log.trace(`${evt.lifecycle}\nREQUEST: ${JSON.stringify(evt, null, 2)}`);
            crudLifecycle.install(evt.installData);
            log.trace(`RESPONSE: ${JSON.stringify(evt, null, 2)}`);
            log.response(response, {statusCode: 200, installData: {}});
            break;
        }

        case 'UPDATE': {
            log.trace(`${evt.lifecycle}\nREQUEST: ${JSON.stringify(evt, null, 2)}`);
            crudLifecycle.update(evt.updateData);
            log.trace(`RESPONSE: ${JSON.stringify(evt, null, 2)}`);
            log.response(response, {statusCode: 200, updateData: {}});
            break;
        }

        case 'UNINSTALL': {
            log.trace(`${evt.lifecycle}\nREQUEST: ${JSON.stringify(evt, null, 2)}`);
            crudLifecycle.uninstall(evt.uninstallData);
            log.trace(`RESPONSE: ${JSON.stringify(evt, null, 2)}`);
            log.response(response, {statusCode: 200, uninstallData: {}});
            break;
        }

        case 'EVENT': {
            log.trace(`${evt.lifecycle}\nREQUEST: ${JSON.stringify(evt, null, 2)}`);
            evt.eventData.events.forEach(function(event) {
                switch (event.eventType) {
                    case "DEVICE_EVENT": {
                        break;
                    }
                    case "TIMER_EVENT": {
                        eventLifecycle.handleScheduledEvent(evt.eventData, event);
                        break;
                    }
                    case "DEVICE_COMMANDS_EVENT": {
                        eventLifecycle.handleDeviceCommand(evt.eventData, event);
                        break;
                    }
                    default: {
                        console.warn(`Unhandled event of type ${event.eventType}`)
                    }
                }
            });
            log.response(response, {statusCode: 200, eventData: {}});
            break;
        }

        case 'EXECUTE': {
            log.trace(`${evt.lifecycle}\nREQUEST: ${JSON.stringify(evt, null, 2)}`);
            break;
        }


        default: {
            console.log(`Lifecycle ${evt.lifecycle} not supported`);
        }
    }
}

app.listen(3003);
log.info('Open: http://127.0.0.1:3003');
