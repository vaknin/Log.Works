// Saves options to chrome.storage
function save_options() {

    let theme = document.getElementById('theme').value;
    
    // Update status to let user know options were saved.
    chrome.storage.sync.set({logworkstheme: theme}, () => {
      let status = document.getElementById('status');
      status.style.visibility = 'visible';
      setTimeout(() =>  {
        status.style.visibility = 'hidden';
      }, 1000);
    });
  }
  
// Once opening the options page, load saved settings from storage
function restore_options() {
  chrome.storage.sync.get(['logworkstheme'], option => {
    let theme = option.logworkstheme;
    if (theme == undefined){
      theme = 'light';
    }
    document.getElementById('theme').value = theme;
    applyTheme(theme);
  });
}

// Dynamically change the background color on theme change
function change_options(e){
  applyTheme(e.target.value);
}

function applyTheme(theme){
  let title = document.getElementById('title');
  let save = document.getElementById('save');
  let msg = document.getElementById('msg');
  let status = document.getElementById('status');
  let darkBtn = 'btn-light';
  let lightBtn = 'btn-dark';
  let darkBadge = 'badge-light';
  let lightBadge = 'badge-dark';

  // Light theme
  if (theme == 'light'){

    // Background
    document.body.style.backgroundColor = 'white';

    // Message
    msg.style.color = 'black';

    // Status
    status.style.color = 'black';

    //Remove
    title.classList.remove(darkBadge);
    save.classList.remove(darkBtn);

    //Add
    title.classList.add(lightBadge);
    save.classList.add(lightBtn);
  }

  // Dark theme
  else{
    
    // Background

    document.body.style.backgroundColor = '#424242';
    // Message
    msg.style.color = 'white';

    // Status
    status.style.color = 'white';

    //Remove
    title.classList.remove(lightBadge);
    save.classList.remove(lightBtn);
    
    //Add
    title.classList.add(darkBadge);
    save.classList.add(darkBtn);
  }
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('theme').addEventListener('change', change_options);