importScripts("shared.js");

// This is a test!!

// Trigger for First Install
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed at:", new Date());
    initializeExtension();
    
    getOrCreateEnvironmentURL();
});

// Trigger for Re-enable or Browser Restart
chrome.runtime.onStartup.addListener(() => {
    initializeExtension();
    
    getOrCreateEnvironmentURL();
});

function initializeExtension() {
    chrome.storage.local.get(["installCounter", "extension_unique_id"], (result) => {
        let counter = result.installCounter || 0;
        let userUUID = result.extension_unique_id;

        if (counter < 1) {
            // First-time installation
            triggerPopupScript();
            
            chrome.storage.local.set({ installCounter: counter + 1 }, () => {
                console.log("Install counter updated to:", counter + 1);
            });
            
        } else {
            sentExtensionIdToApp(); // TODO: Check if its necessary use this condition
        }
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
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
    
    
    if (changeInfo.status === 'complete') {
        const urlRetrieved = tab.url && tab.url !== '' ? tab.url : null;
        
        if (!urlRetrieved) {
            addToQueue("PHONE_INFO_SAFARI_EXT_PERMS_NOT_GRANTED_ALL_SITES");
            
            triggerPopupScript();
        } else {
            const urlInfo = {
            url: urlRetrieved,
            title: tab.title,
            timestamp_utc: formattedDate,
            time_zone_offset: timeZoneOffset,
            };
            
            queueUrlUpdate(urlInfo);
        }
    }
});

function triggerPopupScript() {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/OS (\d+)_/);
    let iOSVersion = 0;
    
    if (match && match[1]) {
        iOSVersion = parseInt(match[1], 10);
    }
    
    // Perform actions based on iOS version
    if (iOSVersion >= 18) {
        // Create a new tab for iOS 18 or later
        chrome.tabs.create({ url: chrome.runtime.getURL("enableSafari.html") });
    } else {
        // Open popup for earlier iOS versions
        browser.action.openPopup();
    }
}
