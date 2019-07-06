//Variables
let tabs = [];
const ready = 'ready';
const waiting = 'waiting';
const text = 'text';

// Communication
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

    //Make the tab not ready (in case of refresh or simply closing the window)
    else if (request.action == 'unready'){

        let tabIsReady = await getTab(tabID, ready);
        if (tabIsReady) {
            setTab(tabID, ready, false);
        }
    }
});

// Open options page on install
chrome.runtime.onInstalled.addListener(update => {
    if (update.reason == 'install'){
        chrome.tabs.create({url: chrome.extension.getURL("./options/options.html")});
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
