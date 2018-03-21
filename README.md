# SmartThings LIFX Connector C2C Endpoint App

This project is an example webhook C2C device connector app that uses the SmartThings API to import LIFX bulbs
into your SmartThings account. It's written in NodeJS and can either be deployed to an internet accessible server 
or run locally with tunneling to the internet provided by a tool such as [ngrok](https://ngrok.com/). 
It uses [Redis](https://redis.io/) for storing LIFX API credentials.


## Folder structure

- config
  - default.json -- Keys, IDs, and other instance specific configuration values
  - smartthings_rsa.pub -- Public key for validating callback from SmartThings
- lib
    - api
        - lifx.js -- Methods for communicating to LIFX required by this app
        - st.js -- Prototype framework to abstract away some endpoint app implementation details, not specific to this app
    - lifecycle
        - configuration.js -- CONFIGURATION lifecycle event handling
        - crud.js -- INSTALL, UPDATE, and UNINSTALL lifecycle event handling
        - event.js -- EVENT lifecycle handling
        - oauth.js -- OAUTH lifecycle handling
    - local
        - db.js -- Simple Redis-based store of state data for this application
        - log.js -- Simple wrapper around console.log, not specific to this app
- docker-compose.yml -- Docker file for bringing up Redis data store
- package.json -- Node package file
- server.js -- This application

## Prerequisites

- [Node.js](https://nodejs.org/en/) and [npm](https://www.npmjs.com/) installed.
- [ngrok](https://ngrok.com/) installed to create a secure tunnel to create a globally available URL for fast testing.
- [Docker](https://www.docker.com/) for running Redis. Alternative you can install and run [Redis](https://redis.io/) manually
- A [Samsung ID and SmartThings](https://account.smartthings.com/login) account
- A [SmartThings Developer Workspace](https://devworkspace.developer.samsung.com/smartthingsconsole/iotweb/site/index.html#/home) account
- At least one [LIFX light bulb](https://www.lifx.com/products/lifx) and the LIFX Mobile app (to install the light)
- Either a LIFX _clientId_ and _clientSecret_ (from LIFX) or a [LIFX personal API Token](https://cloud.lifx.com/) (You can generate the personal
API token during the connector installation process)

## Setup instructions

1. Clone this repository, and open a command prompt or terminal to the `lifx-demo` directory.

2. If you have a LIFX clientId and clientSecret copy them into the appropriate fields in `config/default.json`. If 
you don't then skip to the next step (Note that LIFX does not allow the general public to register apps and get 
client IDs and secrets. You need to contact them for that)

3. If you don't have a LIFX client ID and secret then go to the [LIFX Cloud site](https://cloud.lifx.com/) and generate a personal access token
from the Settings menu accessed from the upper right of the page. Save this token for later use (you may want to do
that on your mobile device so that you can copy and paste it)

4. Install the dependencies: `npm install`.

5. Bring up Redis with `docker-compose up -d`

6. Start the server: `npm start`.

7. Start ngrok: `ngrok http 3000`. Copy the `https:` URL to your clipboard.

8. Log into the SmartThings [Developer Workspace](https://devworkspace.developer.samsung.com/) and go to the 
[Cloud-To-Cloud](https://devworkspace.developer.samsung.com/smartthingsconsole/iotweb/site/index.html#/development/smartThingsDevice/cloudToCloud)
devices page. Click _Create_ to start the process of creating a device profile and connector app.

    01. 01 **Device info.** Enter and save a Service name such as "My LIFX Connector"
    02. 01 **Device info.** Click _Add a device profile_ to create a device profile for your light. Give the device a name 
    such as "LIFX Color Bulb" a VID such as "lifx-color-bulb" and an optional description. Set the _Device type_ to _Light_.
    Click the plus (+) sign to add capabilities and select the _Color Control_, _Color Temperature_, _Switch_ and _Switch Level_
    capabilities and click _ADD_. Finally scroll down and select _Switch: main_ for _main state_ and _Main action_ and click _Save_
    to create the device profile. Then click _Next_.
    03. **02 Connector info** Enter a connector name and description. You can leave _Multi instance_ set to _Single and should leave the
    _Connector type_ set to _Webhook endpoint_. 
    04. **02 Connector info** Click _Settings_ to define API scopes. Select the _r:devices:*_, _w:devices:*_, _i:deviceprofiles_, _r:schedules_ and _w:schedules_ scopes and click _Set_.
    05. **02 Connector info** Paste the ngrok URL you coppied in step 7 into the _Target URL_ page and click _SAVE AND NEXT_. You should notice 
    messages in your server log indicating that it received the PING lifecycle event.
    06. **03 Self-publish** Copy the _Public key_ text into the `config/smartthings_rsa.pub` file in your server directory. Also copy
    the _Client ID_ and _Client Secret_ values into the `config/default.json` into the corresponding entries under _"connector"_.
    06. **03 Self-publish** Enter a name you will recognize under _Model code_ and click _NEXT_ and then _CLOSE_.
    07. Click on your entry in the list and select the _Device info._ tab and paste the _Device profile ID_ field into
    the `config/default.json` file in the `"deviceProfiles": {"color": ""}` entry.
    
9. Stop and restart the server: `CTRL-C`, `npm start`.
10. On the _Devices_ page of the SmartThings mobile app tap _ADD DEVICES_, tap _ADD DEVICE MANUALLY_ and then select your device from 
_My Testing Devices_ at the bottom of the page (you can also install the devices in the ST Classic app from Marketplace -> SmartApps -> My Apps). 
11. If you have configured your server for OAuth with _clientId_ and _clientSecret_ from LIFX, you will be prompted to connect to the LIFX
site to import your devices into SmartThings. In this case the LIFX access token is stored for use by your app without you seeing
it via the standard OAuth process. If your server isn't configured for OAuth (i.e. no _clientId_ and _clientSecret_) then you will be
prompted to manually enter a personal access token. You can get such a token by tapping the _Get a LIFX Personal Access Token >>_ link 
at the bottom of the page, logging into LIFX, tapping the _Generate New Token_ button, and copying the token to the clipboard (LIFX won't show
it to you again). Then tap _Done_ and paste the token into the _Enter your LIFX API token_ field. 
12. Whichever method you use to get a token, tap _NEXT_ to go to the next configuration page and tap _Select location_ to select which 
LIFX location you want to import into this SmartThings location. Tap _DONE_ to install the connector app and create the devices.
