//Variables
let tabs = [];
const ready = 'ready';
const waiting = 'waiting';
const text = 'text';
const segmentID = 'segmentID';

//Communication
chrome.runtime.onMessage.addListener(async (request, sender) => {

    //Sender's tab ID
    let tabID;

    //If it's from content.js, get the tab's ID
    if (sender.tab) {
        tabID = sender.tab.id;
    }

    //receive 'ready' message from content.js
    if (request.action == ready) {
        await setTab(tabID, ready, true);

        //Message popup.js - if it's open
        chrome.runtime.sendMessage('dataIsReady');
    }

    //Popup was clicked
    else if (request.action == 'popup') {

        let tabIsReady = await getTab(request.id, ready); 

        //Check if the active tab is ready
        if (tabIsReady) {
            chrome.runtime.sendMessage('dataIsReady');
        }
    }

    //The user just logged in (to logs site or to the backoffice)
    else if (request.action == 'loggedIn') {
        setTab(tabID, waiting, true);
    }

    //Make the tab not ready (in case of refresh or simply closing the window)
    else if (request.action == 'unready'){

        let tabIsReady = await getTab(tabID, ready);
        if (tabIsReady) {
            setTab(tabID, ready, false);
        }
    }
});

//#region Helper Functions

//Sleep [ms] seconds
async function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

//Create a new tab in the local storage
function createTab(id) {
    
    //Create the tab object, tabs are named after the tab id
    let tab = {
        id
    };

    //Add the tab to the local storage and return it
    chrome.storage.local.set({
        [id]: tab
    });
    return tab;
}

//Set the given field of a tab to a value
function setTab(id, field, value) {

    return new Promise(async resolve => {

        //Fetch the tab from the local storage
        let tab = await getTab(id, undefined, true);

        //If the tab does not already exist, create it
        if (Object.keys(tab).length == 0){

            //The tab doesn't exist, create it
            tab = createTab(id);
        }

        //The tab exists, access it with its ID 
        else tab = tab[id];

        tab[field] = value;


        //Write to local storage, resolve as a callback
        chrome.storage.local.set({[id]:tab}, resolve);
    });
}

//Gets the tab's field
function getTab(id, field, returnEntireTab) {

    //Storage API cannot work with integers
    id = id.toString();

    return new Promise(resolve => {

        //Fetch from local storage
        chrome.storage.local.get(id, item => {

            //Return the entire tab object
            if (returnEntireTab){
                resolve(item);
            }

            //Return a specific property
            else{
                item = item[id];
                if (item){
                    let value = item[field];
                    resolve(value);
                }
            } 
                
        });
    });
}

//#endregion

//#region Commands

//Check if the newly opened tab is done loading
chrome.tabs.onUpdated.addListener(async (tabID, changeInfo, tab) => {

    //A tab that is waiting for action has fully loaded
    let tabIsWaiting = await getTab(tabID, waiting);
    
    if (tabIsWaiting && tab.status == 'complete'){

        //Remove the 'waiting' property
        await setTab(tabID, waiting, false);

        //Create a message object to send to the new tab
        let msg = {
            text: await getTab(tabID, text),
            loginNeeded: tab.url.includes("Account/Login") ? true : false,
            action: 'findSegment'
        };

        //Send the message
        chrome.tabs.sendMessage(tabID, msg);
    }
});

//Execute one of the three keyboard shortcut commands
function executeCommand(command){
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, async function(activeTabs){

        let tabID = activeTabs[0].id;

        //Send a message to the open tab, ask it for it's current clipboard text
        chrome.tabs.sendMessage(tabID, {
            action: 'getClipboard'
        }, undefined, response => {
            let clipboard = response ? response.clipboard : "";
            const options = {
                openerTabId: tabID
            };

            //Open the session ID
            if (command == 'session') {

                //Fetch date
                let index = clipboard.indexOf('D');
                let date = clipboard.substring(index, index + 9);

                //Dynamically change the log environment for different affiliates, default is 0
                let affiliateID = parseInt(clipboard.substring(1, 4));
                let environment = 0;

                switch (affiliateID){

                    //Snap
                    case 187:
                    environment = 7;
                    break;

                    //Almo
                    case 133:
                    environment = 4;
                    break;

                    //Almataar
                    case 215:
                    environment = 10;
                    break;

                    //GTI
                    case 172:
                    environment = 8;
                    break;

                    //LBF
                    case 124:
                    environment = 6;
                    break;

                    //Nustay
                    case 192:
                    environment = 9;
                    break;

                    //Online express
                    case 195:
                    environment = 13;
                    break;

                    //Ostrovok
                    case 128:
                    environment = 3;
                    break;

                    //Rocketmiles
                    case 161:
                    environment = 5;
                    break;

                    //Utravel
                    case 174:
                    environment = 11;
                    break;
                }

                //Dynamically add slash to end of url
                let slash = clipboard[clipboard.length - 1] == '/' ? "" : '/';
                
                //Build the URL
                options.url = `http://logs.travolutionary.com/Session/${date}/${environment}${clipboard}${slash}`;
            }

            //Open a segment (Go to ekk, log in, and search for the segment)
            else if (command == 'segment') {
                options.url = 'https://ekk.worldtravelink.com/';
            }

            //Open up the TFS
            else if (command == 'tfs') {
                options.url = `https://gimmonix.visualstudio.com/Versions%20list%20-%20Waterfall/_workitems/edit/${clipboard}`;
            }

            //Create the new tab
            chrome.tabs.create(options);

            //Segments are multi staged, so they continue
            if (command != 'segment') {
                return;
            }

            //Communicate with the new tab
            chrome.tabs.query({active: true, currentWindow: true}, async tabs => {

                //Wait for the tab to load, and then send instructions
                tabID = tabs[0].id;
                
                await setTab(tabID, waiting, true);
                await setTab(tabID, segmentID, true);
                await setTab(tabID, text, clipboard);
            });
        });
    });
}

//Command listener
chrome.commands.onCommand.addListener(command => {

    if (command == 'session') {
        executeCommand('session');
    } else if (command == 'segment') {
        executeCommand('segment');
    } else if (command == 'tfs') {
        executeCommand('tfs');
    }
});

//Context menu configuration
chrome.runtime.onInstalled.addListener(function() {

    //Create the context menu button
    function createContextMenuButton(properties, name) {
        chrome.contextMenus.create(properties);
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, function(activeTabs) {
                if (info.menuItemId == name && tab.id == activeTabs[0].id) {
                    executeCommand(name);
                }
            });
        });
    }

    //Properties

    //Session
    const sessionProperties = {
        id: 'session',
        title: 'Open Session',
        contexts: ['selection'],
    };

    //Segment
    const segmentProperties = {
        id: 'segment',
        title: 'Open Segment',
        contexts: ['selection'],
    };

    //TFS
    const tfsProperties = {
        id: 'tfs',
        title: 'Open TFS',
        contexts: ['selection'],
    };

    //Dynamically create the context menu buttons
    createContextMenuButton(sessionProperties, 'session');
    createContextMenuButton(segmentProperties, 'segment');
    createContextMenuButton(tfsProperties, 'tfs');
});

//#endregion