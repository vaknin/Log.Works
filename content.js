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

//#region Global variablesq

let buttons = [];
let names = [];
let logs = [];
let caseSensitive = true;

//#endregion

//#region Message Passing

//Listen for messages
chrome.runtime.onMessage.addListener(
    async function(request, sender, sendResponse) {
        
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

        //Enter the session ID
        else if (request.action == 'findSession'){
            let input = document.getElementById('genSearchBox');
            let searchButton = document.getElementsByClassName('glyphicon glyphicon-search')[0];
            let sessionID = request.sessionID;

            //Make sure session ID isn't empty
            if(sessionID != ""){

                //Make sure it starts with a forward slash
                if(sessionID[0] != '/'){
                    sessionID = '/' + sessionID;
                }
                
                input.value = sessionID;
                searchButton.click();
            }
        }

        //Navigate to the orders tab, and search for the given segment
        else if (request.action == 'findSegment'){

            let segment = request.segmentID;

            //Log in to a user
            if (request.loginNeeded){

                //Get the button element
                let button = document.getElementsByClassName('k-button orange')[0];

                //Log in
                button.click();

                //Let bg know you logged in
                chrome.runtime.sendMessage({action: 'loggedIn', segmentID: segment});
            }

            //The user is already logged in
            else{

                //Click a button by class name
                async function clickButton(btnClass, name, computedName){
                    await new Promise(async resolve => {

                        //Loop until elements load
                        while(document.getElementsByClassName(btnClass).length == 0){
                            await sleep(100);
                        }

                        //Do after elements load:

                        //If there are multiple elements in the HTMLcollection
                        if (name){
                            let elements = document.getElementsByClassName(btnClass);
                            let match = [];
                            for(let e of elements){

                                //Search for element by computedName
                                if (computedName){
                                    if (e.computedName == name){
                                        match.push(e);
                                    }
                                }

                                //Search for element by name
                                else{
                                    if (e.innerHTML == name){
                                        match.push(e);
                                    }
                                }
                            }

                            console.log(match[match.length - 1]);
                            match[match.length - 1].click();
                            resolve();
                        }

                        //Only one element in the HTML collection
                        else{
                            let elems = document.getElementsByClassName(btnClass);
                            elems[elems.length - 1].click();
                            resolve();
                        }
                    });              
                }

                //Click on 'New Tab'
                await clickButton('tab-title', '+');

                //Click on 'Manage Orders'
                await clickButton('glyphicons glyphicons-list-alt');

                //Rest
                await sleep(2500);

                //Click on the magnifying glass icon
                await clickButton('toolBarIcon icon-search glyphicon glyphicon-search');

                //Set filter date to none
                await clickButton('k-item', 'Don\'t filter by date');

                //Enter segment ID
                if (segment){
                    await clickButton('k-formatted-value k-input', 'Segment id', true);
                }
            }
        }
});

//#endregion

//#region Event listeners

//If we're running the sessions website, gather log data
if (window.location.href.includes('logs.travolutionary.com/Session/D')){
    window.addEventListener('load', () => {
        populateLogs();
    });

    window.addEventListener('beforeunload', () => {
        let msg = {
            action: 'unready'
        };
        chrome.runtime.sendMessage(msg);
    });
}

//Onload - create a new tab object in background.js
window.addEventListener('load', () => {
    let msg = {
        action: 'newTab'
    };
    chrome.runtime.sendMessage(msg);
});

//#endregion

//#region Text Selection

//Grabs the selected text and sends it to bg.js
function grabSelection(){

    //Get selected text
    let text = window.getSelection().toString();
    if (text == ""){
        return;        
    }

    let msg = {};

    //Text is session ID
    if(text.includes('/D') && text.length > 50){
        msg.action = 'sessionID';
        msg.sessionID = text;
    }

    //Order.Segment
    else{
        msg.action = 'segmentID';
        msg.segmentID = parseFloat(text);
    }

    chrome.runtime.sendMessage(msg);
}

//Mouseup
document.addEventListener('mouseup', () => {
    grabSelection();
});

//Keyup
document.addEventListener('keyup', () => {
    grabSelection();
});

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
    let msg = {
        action: 'ready'
    };
    chrome.runtime.sendMessage(msg);
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
            log.element.style.background = '#d93b34';
            log.element.style.border = '2px solid black';
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
