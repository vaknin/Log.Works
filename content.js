//#region Classes

//The Log class
class Log{
    constructor(href, element, data){
        this.href = href;
        this.element = element;
        this.data = data;
    }
}

//#endregion

//#region Global variables

let buttons = [];
let names = [];
let logs = [];

//#endregion

//#region Communication with popup.js

//Listen for messages from popup.js
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action == "search"){
            let results = {
                action: 'search',
                results: search(request.keyword)
            };

            //Send back to popup.js the number of results
            chrome.runtime.sendMessage(results);
        }
});


//#endregion

//#region Populate Logs

window.addEventListener('load', () => {
    populateLogs();
});

window.addEventListener('beforeunload', () => {
    chrome.runtime.sendMessage('unready');
});

async function populateLogs(){
    await sleep(3000);
    generateNames();
    generateButtons();
}

//Fetch the log's name and name's element
async function generateNames(){
    names = document.getElementsByTagName('tr');
    names = Array.prototype.map.call(names, name => name.lastElementChild);
}

//Fetch the 'View Log' button element
async function generateButtons(){
    buttons = document.getElementsByClassName('action-hover btn btn-info btn-link');
    buttons = Array.prototype.filter.call(buttons, btn => btn.innerText.includes('View Entire File') == true);
    populateXML();
}

//Fetch data from the 'View Log' button and create the logs array
async function populateXML(){
    for (let i = 0; i < buttons.length; i++){
        let btn = buttons[i];
        let name = names[i];
        const response = await fetch(btn.href);
        let log = new Log(btn.href, name, await response.text());
        logs.push(log);
    }

    //Notify popup.js data is ready
    chrome.runtime.sendMessage('ready');
}

//#endregion

//#region Actions

//Search for a specific keyword
function search(keyword){

    let count = 0;
    logs.forEach(log => {

        //Mark text
        if (keyword != "" && log.data.includes(keyword)){
            log.element.style.background = 'rgb(147, 123, 206)';
            log.element.style.border = '1px dashed black';
            count++;
        }

        //Unmark text
        else{
            log.element.style.background = 'none';
            log.element.style.border = 'none';
        }
    });


    return count;
}

//#endregion

//#region Helper functions

//Thread.sleep
async function sleep(ms){
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

//#endregion
