//
//  shared.js
//  OneMeterSafariExtension
//
//  Created by Noor, Isha on 21/1/25.
//

// Constants
const AUTH_HASH_URL = "/v3/safari_extension/auth_hash";
const VISITED_URLS_URL = "/v3/safari_extension/visited_urls";
const DEBOUNCE_TIME = 5000; // 5 seconds

// Queue for URL data
let urlQueue = [];
let debounceTimer = null;

// Queue for waypoints
const waypointQueue = [];
let isProcessingQueue = false;

async function getOrCreateExtensionId() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["extension_unique_id"], (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else if (result.extension_unique_id) {
                resolve(result.extension_unique_id);
            } else {
                // Generate and store a new unique ID
                const uniqueId = generateUUID(); // Replace with your logic to generate a unique ID
                chrome.storage.local.set({ extension_unique_id: uniqueId }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(uniqueId);
                    }
                });
            }
        });
    });
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function storeExtensionUniqueID(uniqueID) {
    browser.runtime.sendNativeMessage('group.com.netquest.onemeter', { extensionId: uniqueID }, (response) => {
        if (browser.runtime.lastError) {
            console.error(`Error sending message to native app: ${browser.runtime.lastError}`);
        } else {
            console.log("Extension ID sent to native app successfully");
        }
    });
}

function sentExtensionIdToApp() {
    getOrCreateExtensionId().then((extensionId) => {
        storeExtensionUniqueID(extensionId);
    });
}

// Function to fetch auth_hash
async function fetchAuthHash(uniqueKey) {
    const baseURL = await getOrCreateEnvironmentURL();
    const url = `${baseURL}${AUTH_HASH_URL}?extension_unique_id=${uniqueKey}`;
        
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const authHash = data.auth_hash;

        if (authHash) {
            storeAuthHashOnStorage(authHash);
            return authHash;
        } else {
            console.error("auth_hash not found in response", data);
            return null;
        }
    } catch (error) {
        console.error("Error fetching auth_hash:", error);
        return null;
    }
}

function storeAuthHashOnStorage(value) {
    chrome.storage.local.set({ "authHash": value }).then(() => {
        console.log("Auth Hash value is set");
    });
}

// Function to get auth_hash from localStorage or fetch if not available
async function getAuthHashFromBE() {
    const authHash = await getAppAuthHash();

    // If auth_hash is not found, fetch a new one
    if (!authHash) {
        console.log("Auth Hash not found, fetching...");
        try {
            const uniqueKey = await getOrCreateExtensionId(); // Fetch or create unique extension ID
            authHash = await fetchAuthHash(uniqueKey);

            // Save the new auth_hash in chrome.storage.local
            if (authHash) {
                chrome.storage.local.set({ authHash: authHash }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("Error saving authHash to chrome.storage.local:", chrome.runtime.lastError);
                    } else {
                        console.log("Auth Hash saved to chrome.storage.local:");
                    }
                });
            }
        } catch (error) {
            console.error("Error getting unique key or fetching authHash:", error);
        }
    }

    return authHash;
}

// Function to queue URL updates and send them in batches
function queueUrlUpdate(urlInfo) {
    urlQueue.push(urlInfo);

    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
        const authHash = await getAuthHashFromBE();

        if (authHash) {
            await sendVisitedUrls(authHash, urlQueue);
            urlQueue = []; // Clear the queue after sending
        }
    }, DEBOUNCE_TIME);
}

// Function to send visited URL data to backend
async function sendVisitedUrls(authHash, urlData) {
    const body = JSON.stringify({ visited_urls: urlData });
    
    const baseURL = await getOrCreateEnvironmentURL();
    const url = `${baseURL}${VISITED_URLS_URL}?auth_hash=${authHash}`;
        
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: body,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        console.log("Visited URLs sent successfully:", urlData);
    } catch (error) {
        console.error("Error sending visited URLs:", error);
    }
}

// Function to Request Environment Data
function requestAndSaveEnvironmentData() {
    // Send NativeMessage to app with "Safari Started"
    browser.runtime.sendNativeMessage('group.com.netquest.onemeter',
    { message: "Safari Started" }, (response) => {
        if (browser.runtime.lastError) {
            console.error(`Error sending message to native app: ${browser.runtime.lastError}`);
        } else {
            if (response.success) {
                console.log("Environment Data received from app:", response);
                
                // Save to local storage for future API calls
                chrome.storage.local.set({
                    urlEndPoint: response.urlEndPoint,
                    appVersion: response.appVersion,
                    authHash: response.authHash
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError);
                    }
                });
            } else {
                console.error("Failed to get environment data:", response.error);
            }
        }
    });
}

async function getOrCreateEnvironmentURL() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["urlEndPoint"], (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else if (result.urlEndPoint) {
                resolve(result.urlEndPoint);
            } else {
                requestAndSaveEnvironmentData();
                reject("No urlEndPoint found, requesting new data.");
            }
        });
    });
}

async function getAppVersion() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["appVersion"], (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else if (result.appVersion) {
                resolve(result.appVersion);
            } else {
                reject("No appVersion found in storage.");
            }
        });
    });
}

async function getAppAuthHash() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["authHash"], (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else if (result.authHash) {
                resolve(result.authHash);
            } else {
                reject("No authHash found in storage.");
            }
        });
    });
}

let sortIndex = 0;
function initSortIndex() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(["sortIndex"], (result) => {
            if (result.sortIndex !== undefined) {
                sortIndex = result.sortIndex;
            }
        });
    }
}

function saveSortIndex() {
    chrome.storage.local.set({ sortIndex }, () => {
        if (chrome.runtime.lastError) {
            console.error("Error saving sortIndex:", chrome.runtime.lastError);
        }
    });
}

function addToQueue(waypoint) {
    initSortIndex();
    waypointQueue.push({ waypoint, sortIndex: sortIndex++ });
    saveSortIndex(); // Save updated sortIndex
    processQueue();
}

async function processQueue() {
    if (isProcessingQueue || waypointQueue.length === 0) {
        return;
    }
    
    isProcessingQueue = true;
    
    while (waypointQueue.length > 0) {
        const { waypoint, sortIndex } = waypointQueue.shift();
        await sendWaypoint(waypoint, sortIndex);
    }
    
    isProcessingQueue = false;
}

async function sendWaypoint(waypoint, sortIndex) {
    try {
        const [baseURL, version, authHash] = await Promise.all([
            getOrCreateEnvironmentURL(),
            getAppVersion(),
            getAuthHashFromBE()
        ]);
        
        const url = `${baseURL}/v3/waypoints?auth_hash=${authHash}&os=ios&version=${version}`;
        
        const body = JSON.stringify({
            auth_hash: authHash,
            waypoint,
            sortIndex
        });
        
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: body,
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        console.log("Waypoint sent successfully:", body);
        
    } catch (error) {
        console.error("Error sending waypoint:", error);

        waypointQueue.push({ waypoint, sortIndex });
    }
}

// Attach them to globalThis
globalThis.getOrCreateExtensionId = getOrCreateExtensionId;
globalThis.generateUUID = generateUUID;
globalThis.storeExtensionUniqueID = storeExtensionUniqueID;
globalThis.fetchAuthHash = fetchAuthHash;
globalThis.storeAuthHashOnStorage = storeAuthHashOnStorage;
globalThis.getOrCreateEnvironmentURL = getOrCreateEnvironmentURL;
globalThis.sendVisitedUrls = sendVisitedUrls;
globalThis.sendWaypoint = sendWaypoint;
globalThis.getAppVersion = getAppVersion;
globalThis.getAuthHashFromBE = getAuthHashFromBE;
