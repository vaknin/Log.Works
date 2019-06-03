let tabs = {};

//Communicate with content.js and popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  //receive 'ready' message from content.js
  if (request == 'ready'){
		tabs[`${sender.tab.id}`] = true;

		//Message popup.js - if it's open
		chrome.runtime.sendMessage('dataIsReady');
  }

  else if (request == 'unready'){
		tabs[`${sender.tab.id}`] = false;
  }

  //Popup is asking if content.js is ready, check and respond
  else if (request.action == 'popup'){
		//Ready, return response to popup
		if (tabs[`${request.id}`] == true){
			chrome.runtime.sendMessage('dataIsReady');
		}
  }
});