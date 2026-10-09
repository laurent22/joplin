package net.cozic.joplin.ssl;

import android.app.Activity;
import android.security.KeyChain;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.network.NetworkingModule;

import java.util.concurrent.atomic.AtomicBoolean;

import static net.cozic.joplin.ssl.SslUtils.TRUST_ALL_CERTS;
import static net.cozic.joplin.ssl.SslUtils.getTrustySocketFactory;

public class SslModule extends ReactContextBaseJavaModule {

    private final AtomicBoolean current = new AtomicBoolean(false);

    public SslModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return "SslModule";
    }

    @ReactMethod
    public void setIgnoreTlsErrors(boolean isIgnoreTlsErrors, Promise promise) {
        Log.d("JOPLIN", "Set ignore TLS errors: " + isIgnoreTlsErrors);
        try {
            boolean prev = current.getAndSet(isIgnoreTlsErrors);
            if (isIgnoreTlsErrors) {
                NetworkingModule.setCustomClientBuilder(
                        builder -> {
                            builder.sslSocketFactory(getTrustySocketFactory(), TRUST_ALL_CERTS);
                            builder.hostnameVerifier((hostname, session) -> true);
                        });
            } else {
                NetworkingModule.setCustomClientBuilder(null);
            }
            promise.resolve(prev);
        } catch (Exception e) {
            Log.e("JOPLIN", "Error disabling TLS validation", e);
            promise.reject(e);
        }
    }

    // Shows the system dialog to pick a client certificate (mutual TLS) from the
    // Android KeyChain. Resolves with the selected alias, or null if cancelled, in
    // which case the current selection is kept.
    @ReactMethod
    public void selectClientCertificate(@Nullable String host, double port, Promise promise) {
        Activity activity = getReactApplicationContext().getCurrentActivity();
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Cannot show the certificate picker without an activity");
            return;
        }

        ClientCertificateKeyManager keyManager = ClientCertificateKeyManager.getInstance();
        try {
            KeyChain.choosePrivateKeyAlias(activity, alias -> {
                if (alias != null) {
                    Log.d("JOPLIN", "Client certificate selected: " + alias);
                    keyManager.setAlias(alias);
                    SslUtils.onClientCertificateChanged();
                }
                promise.resolve(alias);
            }, null, null, host, (int) port, keyManager.getAlias());
        } catch (Exception e) {
            Log.e("JOPLIN", "Error selecting client certificate", e);
            promise.reject(e);
        }
    }

    @ReactMethod
    public void getClientCertificateAlias(Promise promise) {
        promise.resolve(ClientCertificateKeyManager.getInstance().getAlias());
    }

    @ReactMethod
    public void clearClientCertificate(Promise promise) {
        Log.d("JOPLIN", "Client certificate cleared");
        ClientCertificateKeyManager.getInstance().setAlias(null);
        SslUtils.onClientCertificateChanged();
        promise.resolve(null);
    }
}
