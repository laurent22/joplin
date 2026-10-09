package net.cozic.joplin.ssl;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.KeyChain;
import android.security.KeyChainException;
import android.util.Log;

import androidx.annotation.Nullable;

import java.net.Socket;
import java.security.Principal;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;

import javax.net.ssl.SSLEngine;
import javax.net.ssl.X509ExtendedKeyManager;

/**
 * Presents a client certificate (mutual TLS) that the user has selected from the
 * Android KeyChain. The private key never leaves the KeyChain; this class only
 * keeps a reference to it once access has been granted by the system dialog.
 *
 * When no certificate is selected, every method returns null, which is exactly
 * what happens without a key manager, so connections are unaffected.
 */
public class ClientCertificateKeyManager extends X509ExtendedKeyManager {

    private static final String TAG = "JOPLIN";
    private static final String PREFERENCES_NAME = "net.cozic.joplin.ssl";
    private static final String ALIAS_KEY = "clientCertificateAlias";

    private static ClientCertificateKeyManager instance = null;

    private final Context context;
    private String alias;
    private PrivateKey privateKey = null;
    private X509Certificate[] certificateChain = null;

    private ClientCertificateKeyManager(Context context) {
        this.context = context.getApplicationContext();
        this.alias = preferences().getString(ALIAS_KEY, null);
    }

    // Must be called once, before any network client is created (see MainApplication)
    public static synchronized void initialize(Context context) {
        if (instance == null) instance = new ClientCertificateKeyManager(context);
    }

    public static synchronized ClientCertificateKeyManager getInstance() {
        if (instance == null) throw new IllegalStateException("ClientCertificateKeyManager has not been initialized");
        return instance;
    }

    private SharedPreferences preferences() {
        return context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
    }

    @Nullable
    public synchronized String getAlias() {
        return alias;
    }

    public synchronized void setAlias(@Nullable String newAlias) {
        alias = newAlias;
        privateKey = null;
        certificateChain = null;

        SharedPreferences.Editor editor = preferences().edit();
        if (newAlias == null) {
            editor.remove(ALIAS_KEY);
        } else {
            editor.putString(ALIAS_KEY, newAlias);
        }
        editor.apply();
    }

    // KeyChain calls may block, which is fine here: they are only made during
    // the TLS handshake, which runs on the network threads.
    private synchronized boolean loadCertificate() {
        if (alias == null) return false;
        if (privateKey != null && certificateChain != null) return true;

        try {
            privateKey = KeyChain.getPrivateKey(context, alias);
            certificateChain = KeyChain.getCertificateChain(context, alias);
        } catch (KeyChainException e) {
            Log.w(TAG, "Could not load client certificate \"" + alias + "\"", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        if (privateKey == null || certificateChain == null) {
            // For example, the certificate has been removed from the system or access has been revoked
            privateKey = null;
            certificateChain = null;
            return false;
        }
        return true;
    }

    @Nullable
    private synchronized String selectedAlias() {
        return loadCertificate() ? alias : null;
    }

    @Override
    public String chooseClientAlias(String[] keyTypes, Principal[] issuers, Socket socket) {
        return selectedAlias();
    }

    @Override
    public String chooseEngineClientAlias(String[] keyTypes, Principal[] issuers, SSLEngine engine) {
        return selectedAlias();
    }

    @Override
    public synchronized X509Certificate[] getCertificateChain(String requestedAlias) {
        if (requestedAlias == null || !requestedAlias.equals(alias) || !loadCertificate()) return null;
        return certificateChain;
    }

    @Override
    public synchronized PrivateKey getPrivateKey(String requestedAlias) {
        if (requestedAlias == null || !requestedAlias.equals(alias) || !loadCertificate()) return null;
        return privateKey;
    }

    @Override
    public String[] getClientAliases(String keyType, Principal[] issuers) {
        String selected = selectedAlias();
        return selected == null ? null : new String[]{ selected };
    }

    @Override
    public String[] getServerAliases(String keyType, Principal[] issuers) {
        return null;
    }

    @Override
    public String chooseServerAlias(String keyType, Principal[] issuers, Socket socket) {
        return null;
    }
}
