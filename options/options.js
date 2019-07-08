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
function applyTheme(theme){
  let title = document.getElementById('title');
  let save = document.getElementById('save');
  let msg = document.getElementById('msg');
  let status = document.getElementById('status');

  // Light theme
  let lightBtn = 'btn-dark';
  let lightBadge = 'badge-dark';
  
  // Dark theme
  let darkBtn = 'btn-light';
  let darkBadge = 'badge-light';

  // Travo theme
  let redBtn = 'btn-danger';
  let redBadge = 'badge-danger';

  function apply(bg, font, badge, btn){
    // Background
    document.body.style.backgroundColor = bg;

    // Font colors
    msg.style.color = font;
    status.style.color = font;

    //Remove
    title.classList.remove(darkBadge);
    title.classList.remove(lightBadge);
    title.classList.remove(redBadge);
    save.classList.remove(darkBtn);
    save.classList.remove(lightBtn);
    save.classList.remove(redBtn);

    //Add
    title.classList.add(badge);
    save.classList.add(btn);
  }

  console.log(theme);
  
  // Light theme
  if (theme == 'light') apply('white', 'black', lightBadge, lightBtn);

  // Dark theme
  else if (theme == 'dark') apply('#424242', 'white', darkBadge, darkBtn);

  // Red theme
  else apply('#d93b34', 'white', darkBadge, darkBtn);
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('theme').addEventListener('change', e => applyTheme(e.target.value));