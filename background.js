let tabs = {};

//Communicate with content.js and popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  //receive 'ready' message from content.js
  if (request == 'ready'){
		tabs[`${sender.tab.id}`] = true;

    //Message popup.js - if it's open
    chrome.runtime.sendMessage('dataIsReady');
  }

  //When a tab closes, make it 'not' ready
  else if (request == 'unready'){
    delete tabs[`${sender.tab.id}`];
  }

  //Popup is asking if content.js is ready, check and respond
  else if (request.action == 'popup'){

    check(request.id);
    
		//Ready, return response to popup
		if (tabs[`${request.id}`] == true){
			chrome.runtime.sendMessage('dataIsReady');
		}
  }
});

//Check if popup.js is running on the right website
function check(tabID){
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0].id == tabID){
        //If the tab popup was initiated on isn't the sessions page, message popup and notify
        if (!tabs[0].url.includes('logs.travolutionary.com/Session/')){
          chrome.runtime.sendMessage(404); //Message popup.js
          chrome.tabs.sendMessage(tabs[0].id, 404); //Message content.js
        }
        return;
      }
 });
}

//Keyboard Shortcut - Ctrl+Shift+1
chrome.commands.onCommand.addListener(command => {
  if (command == 'openSessions'){
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {

      //Check if the current tab is already open on the sessions page
      if(tabs[0].url.includes('logs.travolutionary.com/Session')){
        return;
      }
      
      const options = {
        url: 'http://logs.travolutionary.com/Session/'
      };
      //Move the currently selected tab to the sessions page
      chrome.tabs.create(options);
   });
  }
});