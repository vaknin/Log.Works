const url = window.location.href;
const p_result = document.getElementById('p_result');
const btn_download = document.getElementById('btn_download');
const input_keyword = document.getElementById('input_keyword');
const btn_search = document.getElementById('btn_search');
const container = document.getElementById('search_container');
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

//#region Communication with 'content.js'

//Send a message to 'content.js'
function sendMessage(action){

    //Make sure the keyword input isn't empty
    if (input_keyword.value == ""){
        return;
    }

    let msg;

    if (action == 'search'){
        msg = {
            action: 'search',
            keyword: input_keyword.value,
        };
    }

    //Send a message
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        chrome.tabs.sendMessage(tabs[0].id, msg);
    });
}

//Listen for messages from content.js
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {

        //Data is ready, enable button
        if (request == 'ready'){
            p_result.style.display = 'inline';
            input_keyword.style.display = 'inline';
            btn_search.style.display = 'inline';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            loader.remove();
        }

        //Make a search
        else{
            p_result.innerHTML = `Results: ${request}`;
        }
});

//#endregion
