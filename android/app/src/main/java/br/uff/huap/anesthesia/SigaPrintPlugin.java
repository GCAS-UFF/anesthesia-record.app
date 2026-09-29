package br.uff.huap.anesthesia;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Impressão dos documentos do SIGA no APK. O WebView do Capacitor não implementa window.print(),
 * então o HTML (já baixado pelo visualizador interno) é carregado num WebView fora da tela e
 * entregue ao PrintManager. O diálogo do sistema aparece sobre o app e oferece impressora e
 * "Salvar como PDF" — sem abrir o Chrome.
 */
@CapacitorPlugin(name = "SigaPrint")
public class SigaPrintPlugin extends Plugin {

    /** Mantém o WebView vivo até o fim do trabalho; o PrintManager guarda só o adapter. */
    private WebView printWebView;

    @SuppressLint("SetJavaScriptEnabled")
    @PluginMethod
    public void printHtml(PluginCall call) {
        String html = call.getString("html");
        if (html == null || html.trim().isEmpty()) {
            call.reject("Documento vazio.");
            return;
        }
        String jobName = call.getString("jobName", "SIGA");
        boolean landscape = "landscape".equals(call.getString("orientation"));

        getActivity().runOnUiThread(() -> {
            WebView webView = new WebView(getContext());
            webView.getSettings().setJavaScriptEnabled(true);
            webView.getSettings().setAllowFileAccess(false);
            webView.getSettings().setAllowContentAccess(false);
            webView.setWebViewClient(new WebViewClient() {
                private boolean started = false;

                @Override
                public void onPageFinished(WebView view, String url) {
                    if (started) return;
                    started = true;                    
                    new Handler(Looper.getMainLooper()).postDelayed(() -> startPrint(view, jobName, landscape, call), 300);
                }
            });
            printWebView = webView;
            webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
        });
    }

    private void startPrint(WebView webView, String jobName, boolean landscape, PluginCall call) {
        try {
            PrintManager printManager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
            PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(jobName);
            PrintAttributes attributes = new PrintAttributes.Builder()
                .setMediaSize(landscape ? PrintAttributes.MediaSize.ISO_A4.asLandscape() : PrintAttributes.MediaSize.ISO_A4)
                .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                .build();
            printManager.print(jobName, adapter, attributes);
            call.resolve(new JSObject());
        } catch (Exception e) {
            Log.e("SigaPrint", "Falha ao imprimir", e);
            call.reject("Não foi possível abrir a impressão.", e);
        }
    }
}
