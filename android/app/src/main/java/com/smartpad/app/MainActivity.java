package com.smartpad.app;

import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Set soft input mode to resize the activity when keyboard appears
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // Manual override: Force padding for system bars
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content),
                (v, insets) -> {
                    androidx.core.graphics.Insets systemBars = insets
                            .getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars());
                    v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
                    return androidx.core.view.WindowInsetsCompat.CONSUMED;
                });
    }
}
