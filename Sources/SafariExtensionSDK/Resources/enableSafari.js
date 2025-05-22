// Function to get the counter value from storage
async function getCounter() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["closeTabCounter"], (result) => {
            resolve(result.closeTabCounter || 0);
        });
    });
}

// Function to set the counter value in storage
function setCounter(value) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ closeTabCounter: value }, () => {
            resolve();
        });
    });
}

async function updatePopupContent() {
    const currentPermissions = await browser.permissions.getAll();
    const lang = getUserLanguage();
    const translations = await loadTranslations();
    const content = translations[lang];

    const container = document.querySelector(".container");
    const counter = await getCounter();
    
    container.innerHTML = `
        <h1>${content.title}</h1>
        <p>${content.description}</p>
        <div class="warning-box">
            <svg xmlns="http://www.w3.org/2000/svg" class="warning-icon" viewBox="0 0 24 24" fill="black" width="44px" height="44px">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            <p>${content.warning}</p>
        </div>
        <button id="closeTab">${content.button}</button>
    `;
            
    if (counter > 1) {
        document.getElementById("closeTab").addEventListener("click", async () => {
                        
            chrome.tabs.getCurrent((tab) => {
                if (tab) chrome.tabs.remove(tab.id);
            });
        });
    } else {
        document.getElementById("closeTab").addEventListener("click", async () => {
            
            const permissions = {
            permissions: ["tabs"],
            origins: ["*://*/*"],
            };
            
            chrome.permissions.request(permissions, async (granted) => {
                if (granted) {
                    // Increment and store the counter
                    await setCounter(counter + 1);
                    console.log("closeTabCounter updated to:", counter + 1);
                    
                    sentExtensionIdToApp();
                    
                    // Close the current tab
                    setTimeout(() => {
                        chrome.tabs.getCurrent((tab) => {
                            if (tab) chrome.tabs.remove(tab.id);
                        });
                    }, 500);
                    
                } else {
                    console.log("Permissions not granted.");
                }
            });
        });
    }
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

