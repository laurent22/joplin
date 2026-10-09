package net.cozic.joplin.ssl;

import android.annotation.SuppressLint;

import java.security.KeyStore;
import java.util.Collections;
import java.util.Enumeration;
import java.util.Set;
import java.util.WeakHashMap;

import javax.net.ssl.KeyManager;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSessionContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509TrustManager;

import okhttp3.OkHttpClient;

public class SslUtils {

    @SuppressLint("TrustAllX509TrustManager")
    static final X509TrustManager TRUST_ALL_CERTS = new X509TrustManager() {

        @Override
        public void checkClientTrusted(java.security.cert.X509Certificate[] chain, String authType) {
        }

        @Override
        public void checkServerTrusted(java.security.cert.X509Certificate[] chain, String authType) {
        }

        @Override
        public java.security.cert.X509Certificate[] getAcceptedIssuers() {
            return new java.security.cert.X509Certificate[]{};
        }
    };

    private static SSLContext defaultContext = null;
    private static SSLContext trustyContext = null;
    private static X509TrustManager defaultTrustManager = null;

    // Clients created by ClientCertificateHttpClientFactory. Clients derived from them
    // with newBuilder() share their connection pool, so evicting these is enough.
    private static final Set<OkHttpClient> clients = Collections.newSetFromMap(new WeakHashMap<>());

    private static KeyManager[] keyManagers() {
        return new KeyManager[]{ ClientCertificateKeyManager.getInstance() };
    }

    // The platform default trust manager, which honours network_security_config.xml
    static synchronized X509TrustManager getDefaultTrustManager() {
        if (defaultTrustManager != null) return defaultTrustManager;
        try {
            TrustManagerFactory factory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            factory.init((KeyStore) null);
            for (TrustManager manager : factory.getTrustManagers()) {
                if (manager instanceof X509TrustManager) {
                    defaultTrustManager = (X509TrustManager) manager;
                    return defaultTrustManager;
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Could not get the default trust manager", e);
        }
        throw new IllegalStateException("No X509TrustManager available");
    }

    // Validates server certificates as usual and presents the selected client certificate, if any
    static synchronized SSLSocketFactory getSocketFactory() {
        try {
            if (defaultContext == null) {
                defaultContext = SSLContext.getInstance("TLS");
                defaultContext.init(keyManagers(), new TrustManager[]{ getDefaultTrustManager() }, null);
            }
            return defaultContext.getSocketFactory();
        } catch (Exception e) {
            throw new RuntimeException("Could not create socket factory", e);
        }
    }

    // Accepts any server certificate ("Ignore TLS certificate errors"), but still
    // presents the selected client certificate, if any
    static synchronized SSLSocketFactory getTrustySocketFactory() {
        try {
            if (trustyContext == null) {
                trustyContext = SSLContext.getInstance("TLS");
                trustyContext.init(keyManagers(), new TrustManager[]{ TRUST_ALL_CERTS }, new java.security.SecureRandom());
            }
            return trustyContext.getSocketFactory();
        } catch (Exception e) {
            throw new RuntimeException("Could not create socket factory", e);
        }
    }

    static void registerClient(OkHttpClient client) {
        synchronized (clients) {
            clients.add(client);
        }
    }

    // After the client certificate has changed, existing connections and cached TLS
    // sessions still carry the previous identity, so they must not be reused.
    static synchronized void onClientCertificateChanged() {
        invalidateSessions(defaultContext);
        invalidateSessions(trustyContext);
        synchronized (clients) {
            for (OkHttpClient client : clients) {
                client.connectionPool().evictAll();
            }
        }
    }

    private static void invalidateSessions(SSLContext context) {
        if (context == null) return;
        SSLSessionContext sessions = context.getClientSessionContext();
        Enumeration<byte[]> ids = sessions.getIds();
        while (ids.hasMoreElements()) {
            javax.net.ssl.SSLSession session = sessions.getSession(ids.nextElement());
            if (session != null) session.invalidate();
        }
    }
}
