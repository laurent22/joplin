package net.cozic.joplin.textinput;

import android.text.Selection;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.react.views.textinput.ReactEditText;
import com.facebook.react.views.textinput.ReactTextInputManager;

import java.util.Collections;
import java.util.List;

public class TextInputPackage implements com.facebook.react.ReactPackage {
    @NonNull
    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
        return Collections.singletonList(new ReactTextInputManager() {
            @Override
            public void receiveCommand(ReactEditText reactEditText, String commandId, @Nullable ReadableArray args) {
                if ("focus".equals(commandId) || "focusTextInput".equals(commandId)) {
                    Selection.removeSelection(reactEditText.getText());
                }
                super.receiveCommand(reactEditText, commandId, args);
            }
        });
    }
}
