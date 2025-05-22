// popup.js

// Function to update the popup content based on permissions
async function updatePopupContent() {
    const lang = getUserLanguage();
    const translations = await loadTranslations();
    const content = translations[lang];

    const container = document.querySelector(".container");

    // Check permissions and tab availability
    const isTabAccessible = await canAccessTabUrl();

    if (isTabAccessible) {
        sentExtensionIdToApp();
        
        // User has granted permissions & tab info is available
        container.innerHTML = `
            <h1>${content.enabledTitle}</h1>
            <p>${content.enabledDescription}</p>
        `;
    } else {
        // User has not granted permissions or tab info is unavailable
        container.innerHTML = `
            <h1>${content.title}</h1>
            <p>${content.description}</p>
            <div class="warning-box">
                <svg xmlns="http://www.w3.org/2000/svg" class="warning-icon" viewBox="0 0 24 24" fill="black" width="44px" height="44px">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                <p>${content.warning}</p>
            </div>
            <button id="grantPermissions">${content.button}</button>
        `;

        // Attach event listener for "Grant Permissions" button
        document.querySelector("#grantPermissions").addEventListener("click", async () => {
                 const permissions = {
                     permissions: ["tabs"],
                     origins: ["*://*/*"],
                 };
            
            console.log("click on give permission button");

                 browser.permissions.request(permissions, async (granted) => {
                     if (granted) {
                         // Generate and store the unique extension ID
                         sentExtensionIdToApp();
                         updatePopupContent();
                         getCurrentTabName();
                     } else {
                         console.log("Permissions not granted.");
                     }
                 });

                 window.close();
             });
    }
}

// Check if we can access the current tab's URL
async function canAccessTabUrl() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0].url !== "") {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}


// Request permission to read tab info
async function requestTabPermissions() {
    try {
        const granted = await browser.permissions.request({
            permissions: ["tabs"],
            origins: ["*://*/*"]
        });
        return granted;
    } catch (error) {
        console.error("Error requesting permissions:", error);
        return false;
    }
}


// THIS FUNCTION IS TO ONLY TEST ALL THE ENDPOINT FOR DEBUG MODE
function getCurrentTabName() {
    const date = new Date();

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    // JavaScript only supports milliseconds, so we append extra zeros for microseconds
    const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');
    const microseconds = `${milliseconds}000`; // Append 3 zeros for microseconds
    
    // Get time zone offset in minutes
    const offsetMinutes = date.getTimezoneOffset();
    const sign = offsetMinutes > 0 ? '-' : '+';
    const offsetHours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0');
    const offsetMinutesRemaining = String(Math.abs(offsetMinutes) % 60).padStart(2, '0');
    
    // Format the time zone offset as +hh:mm or -hh:mm
    const timeZoneOffset = `${sign}${offsetHours}:${offsetMinutesRemaining}`;

    const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${microseconds}`;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            const tab = tabs[0];
            
            const urlInfo = {
            url: tab.url,
            title: tab.title || "Untitled",
            timestamp_utc: formattedDate,
            time_zone_offset: timeZoneOffset,
            };
            
            queueUrlUpdate(urlInfo);
            
        } else {
            console.log("No active tab found.");
        }
    });
}

// Initialize the popup
document.addEventListener("DOMContentLoaded", updatePopupContent);

// Detect the user's language
function getUserLanguage() {
    const lang = navigator.language || navigator.userLanguage;
    const supportedLanguages = ["en", "es", "nl", "fr", "de", "it", "pl", "pt", "tr"];
    return supportedLanguages.includes(lang.split("-")[0]) ? lang.split("-")[0] : "en";
}

// Load translations
async function loadTranslations() {
    const response = await fetch("translations.json");
    const translations = await response.json();
    return translations;
}

// Apply translations to the popup
async function applyTranslations() {
    const lang = getUserLanguage();
    const translations = await loadTranslations();
    const content = translations[lang];

    document.querySelector("h1").textContent = content.title;
    document.querySelector(".container > p").textContent = content.description;
    document.querySelector(".warning-box p").innerHTML = content.warning;
    document.querySelector("#grantPermissions").textContent = content.button;
}

module.exports = {
    canAccessTabUrl,
    getUserLanguage,
    loadTranslations,
    applyTranslations,
};
