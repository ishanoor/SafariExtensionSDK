// swift-tools-version: 6.1
// The swift-tools-version declares the minimum version of Swift required to build this package.

// Package.swift

// swift-tools-version:5.6
import PackageDescription

let package = Package(
    name: "SafariExtensionSDK",
    platforms: [
        .iOS(.v15), .macOS(.v12)
    ],
    products: [
        .library(name: "SafariExtensionSDK", targets: ["SafariExtensionSDK"]),
    ],
    targets: [
        .target(
            name: "SafariExtensionSDK",
            resources: [
                .copy("Resources") // this can include manifest.json, js, html etc.
            ]
        ),
    ]
)
