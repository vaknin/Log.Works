//Variables
let tabs = [];

//Communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  //Sender's tab ID
  let tabID;
  if (sender.tab){
    tabID = sender.tab.id;
  }

  //receive 'ready' message from content.js
  if (request.action == 'ready'){
    getTabByID(tabID).ready = true;

    //Message popup.js - if it's open
    chrome.runtime.sendMessage('dataIsReady');
  }

  //When a tab closes, make it 'not' ready
  else if (request.action == 'unready'){
    let tab = getTabByID(tabID);
    let i = tabs.indexOf(tab);
    tabs.splice(i, 1);
  }

  //Click popup
  else if (request.action == 'popup'){

    //Get the active tab
    let tab = getTabByID(request.id);

    //Check if the active tab is ready
    if (tab && tab.ready){
			chrome.runtime.sendMessage('dataIsReady');
    }
  }

  //Get the selected session ID from content.js
  else if (request.action == 'sessionID'){
    getTabByID(tabID).sessionID = request.sessionID;
  }

  //Get the selected session ID from content.js
  else if (request.action == 'segmentID'){

    let segment = request.segmentID.toString();

    //Check if the segment includes a period, if it does, remove the order id, keep only segment
    if (segment.includes('.')){
      let i = segment.indexOf('.');
      segment = segment.substring(i +1);
    }

    //Add the segment's ID as a property to the tab object
    getTabByID(tabID).segmentID = request.segmentID;
  }

  //Clicked on popup from a non-session page - open a new tab of sessions
  else if (request.action == 'openNewTab'){
    let options = {
      url: 'http://logs.travolutionary.com/Session/'
    };
    chrome.tabs.create(options);
  }

  //Logged in to Ekk
  else if (request.action == 'loggedIn'){
    getTabByID(tabID).waiting = true;
    getTabByID(tabID).segmentID = request.segmentID;
  }
});

//#region Helper Functions

//Listen for new tabs creation
chrome.tabs.onCreated.addListener(tab => {
  tabs.push({id: tab.id});
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

function getTabByID(id){
  for (let i = 0; i < tabs.length; i++){
    if (tabs[i].id == id){
      return tabs[i];
    }
  }
}

//Thread.sleep
async function sleep(ms){
  return new Promise(resolve => {
      setTimeout(resolve, ms);
  });
}

//#endregion

//#region Commands

//A tab has been updated
chrome.tabs.onUpdated.addListener((tabID, changeInfo, tab) => {

  //If no such tab exists, push it to the tabs array (i.e. page reload)
  if (!getTabByID(tabID)){
    tabs.push({id: tabID});
  }  

  //A tab that is waiting for action has fully loaded
  if (getTabByID(tabID).waiting && tab.status == 'complete'){

    delete getTabByID(tabID).waiting;
    let msg = {};

    //New tab is a session
    if (getTabByID(tabID).sessionID){
      msg.action = 'findSession';
      msg.sessionID = getTabByID(tabID).sessionID;
    }

    //New tab is a segment
    else{

      //Arrived at login page, attempt to click 'Login'
      if (tab.url.includes("Account/Login?ReturnUrl=%2f")){
        msg.loginNeeded = true;
      }
      
      msg.action = 'findSegment';
      msg.segmentID = getTabByID(tabID).segmentID;
    }

    //Send a message containing the segment ID
    chrome.tabs.sendMessage(tabID, msg);
  }
});

function executeCommand(command){
  chrome.tabs.query({active: true, currentWindow: true}, function(activeTabs) {

    let tab = getTabByID(activeTabs[0].id);
    
    const options = {
      openerTabId: activeTabs[0].id
    };

    if (command == 'session'){
      options.url = 'http://logs.travolutionary.com/Session/';
    }

    else{
      options.url = 'https://ekk.worldtravelink.com/';
    }
    
    //Create the new tab
    chrome.tabs.create(options);

    //Communicate with the new tab
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      
      //Wait for the tab to load, and then send it the session ID
      getTabByID(tabs[0].id).waiting = true;
      if (command == 'session'){
        getTabByID(tabs[0].id).sessionID = tab.sessionID;
      }

      else{
        getTabByID(tabs[0].id).segmentID = tab.segmentID;
      }
    });
 });
}

//Shortcut listener
chrome.commands.onCommand.addListener(command => {
  if (command == 'openSession'){
    executeCommand('session');
  }

  else if (command == 'openSegment'){
    executeCommand('segment');
  }
});

//Context menu
chrome.runtime.onInstalled.addListener(function() {

  // When the app gets installed, set up the context menus
  const sessionProperties = {
    id: 'sessionContext',
    title: 'Open Session',
    contexts: ['selection'],
  };

  const segmentProperties = {
    id: 'segmentContext',
    title: 'Open Segment',
    contexts: ['selection'],
  };

  //Session
  chrome.contextMenus.create(sessionProperties);
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    chrome.tabs.query({active: true, currentWindow: true}, function(activeTabs){
      if (info.menuItemId == 'sessionContext' && tab.id == activeTabs[0].id){
        executeCommand('session');
      }
    });
  });

  //Segment
  chrome.contextMenus.create(segmentProperties);
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    chrome.tabs.query({active: true, currentWindow: true}, function(activeTabs){
      if (info.menuItemId == 'segmentContext' && tab.id == activeTabs[0].id){
        executeCommand('segment');
      }
    });
  });
});

//#endregion
