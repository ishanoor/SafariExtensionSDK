// The Swift Programming Language
// https://docs.swift.org/swift-book


import SafariServices
import os.log

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    
    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem
        
        let message: Any?
        if #available(iOS 17.0, macOS 14.0, *) {
            message = request?.userInfo?[SFExtensionMessageKey]
            
        } else {
            message = request?.userInfo?["message"]
        }
        
        // Save the extensionUniqueKey to the shared UserDefaults
        let sharedDefaults = UserDefaults(suiteName: "group.com.netquest.onemeter")
        sharedDefaults?.set(message, forKey: "extensionUniqueKey")
        let savedUrlBasePanel = sharedDefaults?.string(forKey: "kUrlBasePanelKey") ?? "No URL Found"
        let userAuthHash = sharedDefaults?.string(forKey: "kAuthHash") ?? "No URL Found"
        
        // Get target name
        let targetName = Bundle.main.bundleIdentifier ?? "Unknown Target"
        let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "Unknown App version"
        
        let response = NSExtensionItem()
        var responseDict: [String: Any] = [:]
        
        responseDict = [
            "success": true,
            "resp": "Token stored successfully",
            "target": targetName,
            "appVersion": appVersion,
            "urlEndPoint": savedUrlBasePanel,
            "authHash": userAuthHash
        ]
        
        response.userInfo = [SFExtensionMessageKey: responseDict]
        context.completeRequest(returningItems: [ response ], completionHandler: nil)
    }
}
