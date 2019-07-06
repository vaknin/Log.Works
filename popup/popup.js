// Elements
const loadingDiv = document.getElementById('loading');
const searchingDiv = document.getElementById('searching');
const p_result = document.getElementById('p_result');
const input_keyword = document.getElementById('input_keyword');
const btn_search = document.getElementById('btn_search');
const p_progress = document.getElementById('p_progress');
const p_progressNames = document.getElementById('p_progressNames');

// Variables
let dataIsready = false;
let activeTab;

// Set theme
chrome.storage.sync.get(['logworkstheme'], option => {

    let file;

    // Light theme
    if(Object.entries(option).length == 0 || option.logworkstheme == 'light'){
        file = 'style_white';
    }

    // Dark theme
    else{
        file = 'style_dark';
    }

    // Get HTML head element 
    let head = document.getElementsByTagName('HEAD')[0];  
  
    // Create new link Element 
    let link = document.createElement('link'); 

    // set the attributes for link element  
    link.rel = 'stylesheet'; 
    link.type = 'text/css';
    link.href = `../stylesheets/${file}.css`;  

    // Append link element to HTML head 
    head.appendChild(link);
});

//#region Event Listeners

//Press 'Enter' to search
document.addEventListener('keypress', e => {
    if (e.which == 13){
        //If data isn't ready, return
        if (!dataIsready){
            return;
        }
        msg = {
            action: 'search',
            keyword: input_keyword.value,
        };
        sendMessage(msg);
    }
});

//Click the Search Button
btn_search.addEventListener('click', () => {
    msg = {
        action: 'search',
        keyword: input_keyword.value,
    };
    sendMessage(msg);
});

//Toggle search case-sensitivity
cbox_cs.addEventListener('change', () => {
    let msg = {
        action: 'caseSensitivity',
        sensitive: cbox_cs.checked
    };
    sendMessage(msg);
});

//#endregion

//#region Communication

//Send a message to 'content.js'
function sendMessage(msg){

    //Send the message
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        chrome.tabs.sendMessage(tabs[0].id, msg);
    });
}

//Popup onClick
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {

    activeTab = tabs[0];

    if (!activeTab.url.includes('travolutionary.com/Session')){
        window.open('http://logs.travolutionary.com/Session/', '_blank');
        window.close();
    }

    //Send popup info to bg.js
    let msg = {
        action: 'popup',
        id: activeTab.id
    };
    chrome.runtime.sendMessage(msg);
 });

//Listen for messages
chrome.runtime.onMessage.addListener(
    function(request, sender) {

        //Data is ready, enable button
        if (request == 'dataIsReady'){

            dataIsready = true;
            loadingDiv.hidden = true;
            searchingDiv.hidden = false;
            document.getElementById('root_container').style = "width: 300px; height: 208px";
        }

        //Make a search
        else if (request.action == 'search'){
            p_result.style.visibility = 'visible';
            p_result.innerHTML = `${request.results} results`;
        }

        //Display loading progress in percentage
        else if (request.action == 'progress' && sender.tab.id == activeTab.id){
            document.getElementById('root_container').style = "width: 300px; height: 140px";
            let current = parseInt(request.progress.current);
            let of = parseInt(request.progress.outof);
            p_progressNames.innerText = request.progress.name;
            p_progress.innerText = `${Math.round((current/of)*100)}%`;
        }

        //Close the popup
        else if (request.action == 'unready'){
            window.close();
        }
});

//#endregion
