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

//Listen for messages
chrome.runtime.onMessage.addListener(
    async function(request, sender, response) {
        
        //Search for a substring in the session
        if (request.action == "search"){
            let results = {
                action: 'search',
                results: search(request.keyword)
            };

            //Send back to popup.js the number of results
            chrome.runtime.sendMessage(results);
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

//#region Event listeners

//If we're running the sessions website, gather log data
if (window.location.href.includes('travolutionary.com/Session/D')){
    window.addEventListener('load', () => {
        populateLogs();
    });

    window.addEventListener('beforeunload', () => {
        chrome.runtime.sendMessage({action: 'unready'});
    });
}

//#endregion

//#region Populate Logs

//Gather info from the page, buttons and elements
async function populateLogs(){

    //Set up a function to wait until the buttons have loaded
    await new Promise(async resolve => {
        while (document.getElementsByClassName('action-hover btn btn-info btn-link').length == 0) {
            await sleep(100);
        }
        resolve();
    });
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

    let count = 1;

    //Fetch data from a log
    async function fetchData(b){

        //Variables for the button to collect data from
        let btn = b;
        let name = names[buttons.indexOf(b)];

        //Fetch info from xml
        const response = await fetch(btn.href);

        //Handle fetch error
        if (!response){
            return console.log(`failed to fetch btn #${buttons.indexOf(b)}`);
        }

        //Parse info to text
        let log = new Log(btn.href, name, await response.text());

        //Handle fetch error
        if (!log){
            return console.log(`failed to fetch btn #${buttons.indexOf(b)}`);
        }

        //Add the information to the logs array
        logs.push(log);

        //Send a progress message
        let msg = {
            action: 'progress',
            progress: {
                current: count,
                outof: buttons.length,
                name: name.innerText
            }
        };
        chrome.runtime.sendMessage(msg);
        count++;
    }

    //Collect data from all buttons in parallel
    const promises = buttons.map(fetchData);
    await Promise.all(promises);

    //Communicate that the data is ready
    chrome.runtime.sendMessage({action: 'ready'});
    console.log('content.js is ready');
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

    //Mark or unmark an element
    function mark(log, bool){

        //Mark the given element
        if (bool){

            //If the log is already marked, no reason to mark again
            if (log.marked){
                return;
            }
            log.marked = true;
            log.element.style.background = '#4f4f4f';
            log.element.style.border = '1px solid black';
            log.originalColor = log.element.style.color;
            log.element.style.color = 'white';
            log.originalWeight = log.element.style.fontWeight;
            log.element.style.fontWeight = 'bold';
        }

        //Unmark the element
        else{
            log.marked = false;
            log.element.style.background = 'none';
            log.element.style.border = 'none';
            log.element.style.color = log.originalColor;
            log.element.style.fontWeight = log.originalWeight;

        }
    }

    let count = 0;
    for (let i = 0; i < logs.length; i++){

        let log = logs[i];

        //Check for empty string
        if (keyword != ""){

            //Case-sensitive search
            if (caseSensitive){

                //Look for exact-match
                if (log.data.includes(keyword)){
                    mark(log, true);
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
                    mark(log, true);
                    count++;
                    continue;
                }
            }
        }

        //Unmark the element
        mark(log, false);
    };

    return count;
}

//#endregion
