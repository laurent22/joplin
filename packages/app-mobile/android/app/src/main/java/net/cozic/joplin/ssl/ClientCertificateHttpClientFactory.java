package net.cozic.joplin.ssl;

import android.content.Context;

import androidx.annotation.NonNull;

import com.facebook.react.modules.network.OkHttpClientFactory;
import com.facebook.react.modules.network.OkHttpClientProvider;

import okhttp3.OkHttpClient;

/**
 * Creates the OkHttp clients used by React Native's networking module (fetch) and by
 * rn-fetch-blob (attachments), so that both present the selected client certificate.
 * Apart from the socket factory, the clients are configured like React Native's defaults.
 */
public class ClientCertificateHttpClientFactory implements OkHttpClientFactory {

    private final Context context;

    public ClientCertificateHttpClientFactory(Context context) {
        this.context = context.getApplicationContext();
    }

    @NonNull
    @Override
    public OkHttpClient createNewNetworkModuleClient() {
        OkHttpClient client = OkHttpClientProvider.createClientBuilder(context)
                .sslSocketFactory(SslUtils.getSocketFactory(), SslUtils.getDefaultTrustManager())
                .build();
        SslUtils.registerClient(client);
        return client;
    }
}
