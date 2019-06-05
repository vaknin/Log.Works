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
let caseSensitive = true;

//#endregion

//#region Message Passing

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

        //Popup opened on the wrong page
        else if (request == 404){
            window.open('https://logs.travolutionary.com/Session', '_self');
        }

        //Get information from popup.js regarding case-sensitivity
        else if (request.action == 'caseSensitivity'){

            //Case sensitive
            if (request.sensitive){
                caseSensitive = true;
            }

            //Not case-sensitive
            else{
                caseSensitive = false;
            }
        }
});


//#endregion

//#region Populate Logs

//If we're running the sessions website, gather log data
if (window.location.href.includes('http://logs.travolutionary.com/Session/')){
    window.addEventListener('load', () => {
        populateLogs();
    });
    
    window.addEventListener('beforeunload', () => {
        chrome.runtime.sendMessage('unready');
    });
}

//Gather info from the page, buttons and elements
async function populateLogs(){
    await sleep(1000);
    await fetch(document.getElementsByClassName('action-hover btn btn-info btn-link'));
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
        let msg = {
            action: 'progress',
            progress: {
                current: i + 1,
                outof: buttons.length
            }
        };
        chrome.runtime.sendMessage(msg);
    }

    //Notify popup.js data is ready
    chrome.runtime.sendMessage('ready');
}

//#endregion

//#region Helper functions

//Thread.sleep
async function sleep(ms){
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

//Search for a specific keyword
function search(keyword){

    let count = 0;
    for (let i = 0; i < logs.length; i++){

        let log = logs[i];

        //Check for empty string
        if (keyword != ""){

            //Case-sensitive search
            if (caseSensitive){

                //Look for exact-match
                if (log.data.includes(keyword)){
                    log.element.style.background = 'rgb(147, 123, 206)';
                    log.element.style.border = '1px dashed black';
                    count++;
                    continue;
                }
            }

            //Not case-sensitive
            else{
                //Transform to upper-case in order to compare the two strings
                let upperCaseData = log.data.toUpperCase();
                let upperCaseKeyword = keyword.toUpperCase();

                //If there is a match
                if (upperCaseData.includes(upperCaseKeyword)){
                    log.element.style.background = 'rgb(147, 123, 206)';
                    log.element.style.border = '1px dashed black';
                    count++;
                    continue;
                }
            }
        }

        //Unmark the element
        log.element.style.background = 'none';
        log.element.style.border = 'none';
    };

    return count;
}

//#endregion
