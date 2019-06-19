//Variables
let tabs = [];

//Communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  //Sender's tab ID
  let tabID;

  //If it's from content.js, get the tab's ID
  if (sender.tab){
    tabID = sender.tab.id;
  }

  //receive 'ready' message from content.js
  if (request.action == 'ready'){
    getTabByID(tabID).ready = true;

    //Message popup.js - if it's open
    chrome.runtime.sendMessage('dataIsReady');

    //Debug
    debug(`tab ${tabID} is ready`);
  }

  //Popup was clicked
  else if (request.action == 'popup'){

    //Check if the active tab is ready
    if (getTabByID(request.id).ready){
			chrome.runtime.sendMessage('dataIsReady');
    }
  }

  //The user just logged in (to logs site or to the backoffice)
  else if (request.action == 'loggedIn'){
    getTabByID(tabID).waiting = true;
  }

  //Debug
  else if (request.action == 'debug'){
    sendResponse(tabs);
  }
});

//#region Helper Functions

//Listen for a new tab
chrome.tabs.onCreated.addListener(tab => {
  tabs.push({id: tab.id});
});

//Listen for tab closed
chrome.tabs.onRemoved.addListener(tabID => {
  let i = tabs.indexOf(getTabByID(tabID));
  tabs.splice(i, 1);
  debug(`tab ${tabID} has been spliced`);
});

//Add all open tabs to the tabs array
chrome.tabs.query({}, openTabs => {
  
  for(t of openTabs){
    let tab = {
      id: t.id
    };
    tabs.push(tab);
  };
});

//Fetches a tab object from the tabs array by providing the tab's ID
function getTabByID(id){
  for (let i = 0; i < tabs.length; i++){
    if (tabs[i].id == id){
      return tabs[i];
    }
  }
}

//Sleep [ms] seconds
async function sleep(ms){
  return new Promise(resolve => {
      setTimeout(resolve, ms);
  });
}

//Send debug messages to content.js
function debug(text){
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    for (let t of tabs){
      chrome.tabs.sendMessage(t.id, {action: 'debug', text})
    }
  });
}

//#endregion

//#region Commands

//Check if the newly opened tab is done loading
chrome.tabs.onUpdated.addListener((tabID, changeInfo, tab) => {

  debug(`${tabID} has been updated.`);
  
  let tabObject = getTabByID(tabID);

  //A tab that is waiting for action has fully loaded
  if (tabObject.waiting && tab.status == 'complete'){

    //Remove the 'waiting' property
    delete tabObject.waiting;

    //Create a message object to send to the new tab
    let msg = {
      text: tabObject.text,
      loginNeeded: tab.url.includes("Account/Login") ? true : false,
      action: tabObject.sessionID ? 'findSession' : 'findSegment'
    };

    //Send the message
    chrome.tabs.sendMessage(tabID, msg);
  }
});

function executeCommand(command){
  chrome.tabs.query({active: true, currentWindow: true}, async function(activeTabs) {

    let tab = getTabByID(activeTabs[0].id);
    
    //Send a message to the open tab, ask it for it's current clipboard text
    chrome.tabs.sendMessage(tab.id, {action: 'getClipboard'}, undefined, response => {
      let clipboard = response ? response.clipboard : "";
      const options = {
        openerTabId: tab.id
      };
  
      if (command == 'session'){
        options.url = 'http://logs.travolutionary.com/Session/';
      }
  
      else if (command == 'segment'){
        options.url = 'https://ekk.worldtravelink.com/';
      }

      else if (command == 'tfs'){
        options.url = `https://gimmonix.visualstudio.com/Versions%20list%20-%20Waterfall/_workitems/edit/${clipboard}`;
      }
      
      //Create the new tab
      chrome.tabs.create(options);

      //If it's a TFS, return here
      if (command == 'tfs'){
        return;
      }
  
      //Communicate with the new tab
      chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        
        //Wait for the tab to load, and then send instructions
        let newTab = getTabByID(tabs[0].id);
        newTab.waiting = true;
        newTab.text = clipboard;
  
        if (command == 'session'){
          newTab.sessionID = true;
        }
  
        else if (command == 'segment'){
          newTab.segmentID = true;
        }
      });
    });
 });
}

//Command listener
chrome.commands.onCommand.addListener(command => {
  console.log(command);
  
  if (command == 'session'){
    executeCommand('session');
  }

  else if (command == 'segment'){
    executeCommand('segment');
  }

  else if (command == 'tfs'){
    executeCommand('tfs');
  }
});

//Context menu configuration
chrome.runtime.onInstalled.addListener(function() {

  //Create the context menu button
  function createContextMenuButton(properties, name){
    chrome.contextMenus.create(properties);
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      chrome.tabs.query({active: true, currentWindow: true}, function(activeTabs){
        if (info.menuItemId == name && tab.id == activeTabs[0].id){
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
