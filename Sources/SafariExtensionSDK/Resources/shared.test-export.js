//
//  shared.test-export.js
//  OneMeterSafariExtension
//
//  Created by Noor, Isha on 9/4/25.
//

require('./shared.js');

module.exports = {
    getOrCreateExtensionId: globalThis.getOrCreateExtensionId,
    generateUUID: globalThis.generateUUID,
    storeExtensionUniqueID: globalThis.storeExtensionUniqueID,
    fetchAuthHash: globalThis.fetchAuthHash,
    storeAuthHashOnStorage: globalThis.storeAuthHashOnStorage,
    getOrCreateEnvironmentURL: globalThis.getOrCreateEnvironmentURL,
    sendVisitedUrls: globalThis.sendVisitedUrls,
    sendWaypoint: globalThis.sendWaypoint,
    getAppVersion: globalThis.getAppVersion,
    getAuthHashFromBE: globalThis.getAuthHashFromBE,
};


