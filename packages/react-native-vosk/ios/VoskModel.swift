//
//  Vosk.swift
//  VoskApiTest
//
//  Created by Niсkolay Shmyrev on 01.03.20.
//  Copyright © 2020-2021 Alpha Cephei. All rights reserved.
//

import Foundation

public final class VoskModel {
    
    var model : OpaquePointer!
    var spkModel : OpaquePointer!
    
    init(name: String) {
        
        // Set to -1 to disable logs
        vosk_set_log_level(0);
        
        let appBundle = Bundle(for: Self.self)
        
        // Load model from main app bundle
        if let resourcePath = Bundle.main.resourcePath {
            let modelPath = resourcePath + "/" + name
            model = vosk_model_new(modelPath)
        }

        // Get the URL to the resource bundle within the bundle
        // of the current class.
        guard let resourceBundleURL = appBundle.url(
            forResource: "Vosk", withExtension: "bundle")
            else { fatalError("Vosk.bundle not found!") }
        
        // Create a bundle object for the bundle found at that URL.
        guard let resourceBundle = Bundle(url: resourceBundleURL)
            else { fatalError("Cannot access Vosk.bundle!") }
        
        if let resourcePath = resourceBundle.resourcePath {
            let spkModelPath = resourcePath + "/vosk-model-spk-0.4"
            spkModel = vosk_spk_model_new(spkModelPath)
        }
    }
    
    deinit {
        vosk_model_free(model)
        vosk_spk_model_free(spkModel)
    }
    
}

