package br.uff.huap.anesthesia;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins locais precisam ser registrados antes do super.onCreate (que cria a bridge).
        registerPlugin(SigaPrintPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
