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

  //Clicked on popup from a non-session page - open a new tab of sessions
  else if (request.action == 'openNewTab'){
    let options = {
      url: 'http://logs.travolutionary.com/Session/'
    };
    chrome.tabs.create(options);
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

  //If the session tab is ready
  if (getTabByID(tabID).waiting && tab.status == 'complete'){

    //Send a message containing the session's ID
    delete getTabByID(tabID).waiting;
    let msg = {
      action: 'findSession',
      sessionID: getTabByID(tabID).sessionID
    };
    chrome.tabs.sendMessage(tabID, msg);
  }
});


function openSessionsPage(){
  chrome.tabs.query({active: true, currentWindow: true}, function(activeTabs) {

    let tabID = activeTabs[0].id;
    let tab = getTabByID(tabID);
    
    const options = {
      url: 'http://logs.travolutionary.com/Session/',
      openerTabId: tabID
    };

    //Create a new tab
    chrome.tabs.create(options);

    //Communicate with the new tab
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      
      //Wait for the tab to load, and then send it the session ID
      getTabByID(tabs[0].id).waiting = true;
      getTabByID(tabs[0].id).sessionID = tab.sessionID;
    });
 });
}

//Shortcut listener
chrome.commands.onCommand.addListener(command => {
  if (command == 'openSessions'){
    openSessionsPage();
  }
});

//Context menu
chrome.runtime.onInstalled.addListener(function() {
  // When the app gets installed, set up the context menus
  const createProperties = {
    id: 'selectionContext',
    title: 'Open Session',
    contexts: ['selection'],
  };
  chrome.contextMenus.create(createProperties);
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    chrome.tabs.query({active: true, currentWindow: true}, function(activeTabs){
      if (info.menuItemId == 'selectionContext' && tab.id == activeTabs[0].id){
        openSessionsPage();
      }
    });
  });
});


//#endregion
