const url = window.location.href;
const p_result = document.getElementById('p_result');
const btn_download = document.getElementById('btn_download');
const input_keyword = document.getElementById('input_keyword');
const btn_search = document.getElementById('btn_search');
const container = document.getElementById('search_container');
const p_progress = document.getElementById('p_progress');
const loader = document.getElementById('loader');

//Animate 'loading' text

//#region Event Listeners

//Press 'Enter'
document.addEventListener('keypress', e => {
    if (e.which == 13){
        sendMessage('search');
    }
});

//Click Search Button
btn_search.addEventListener('click', () => {
    sendMessage('search');
});

//#endregion

//#region Communication

//Send a message to 'content.js'
function sendMessage(action){

    let msg;

    if (action == 'search'){
        msg = {
            action: 'search',
            keyword: input_keyword.value,
        };
    }

    //Send the message
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        chrome.tabs.sendMessage(tabs[0].id, msg);
    });
}

//Upon opening the popup, check if ready
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {

    let activeTab = tabs[0].id;
    let msg = {
        action: 'popup',
        id: activeTab
    };
    chrome.runtime.sendMessage(msg);
 });

//Listen for messages
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {

        //Data is ready, enable button
        if (request == 'dataIsReady'){
            ready();
        }

        //Make a search
        else if (request.action == 'search'){
            p_result.style.visibility = 'visible';
            p_result.innerHTML = `Results: ${request.results}`;
        }

        //Content.js is notifying about it's logs loading progress
        else if (request.action == 'progress'){
            p_progress.innerHTML = `${request.progress.current}/${request.progress.outof}`;
        }

        //Close the popup
        else if (request == 'unready'){
            window.close();
        }
});

//#endregion

//#region Helper functions

//Get ready
function ready(){
    input_keyword.style.display = 'inline';
    btn_search.style.display = 'inline';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    loader.remove();
    p_progress.remove();
}

//#endregion