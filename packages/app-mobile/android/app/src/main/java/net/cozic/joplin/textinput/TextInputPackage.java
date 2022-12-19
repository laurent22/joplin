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

/**
 * This class provides a workaround for <a href="https://github.com/facebook/react-native/issues/29911">
 *     https://github.com/facebook/react-native/issues/29911</a>
 *
 * The reason the editor is scrolled seems to be due to this block in
 * <pre>android.widget.Editor#onFocusChanged:</pre>
 *
 * <pre>
 *                 // The DecorView does not have focus when the 'Done' ExtractEditText button is
 *                 // pressed. Since it is the ViewAncestor's mView, it requests focus before
 *                 // ExtractEditText clears focus, which gives focus to the ExtractEditText.
 *                 // This special case ensure that we keep current selection in that case.
 *                 // It would be better to know why the DecorView does not have focus at that time.
 *                 if (((mTextView.isInExtractedMode()) || mSelectionMoved)
 *                         && selStart >= 0 && selEnd >= 0) {
 *                      Selection.setSelection((Spannable)mTextView.getText(),selStart,selEnd);
 *                 }
 * </pre>
 * When using native Android TextView mSelectionMoved is false so this block is skipped,
 * with RN however it's true and this is where the scrolling comes from.
 *
 * The below workaround resets the selection before a focus event is passed on to the native component.
 * This way when the above condition is reached <pre>selStart == selEnd == -1</pre> and no scrolling
 * happens.
 */
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
