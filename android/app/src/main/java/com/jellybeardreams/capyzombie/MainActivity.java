package com.jellybeardreams.capyzombie;

import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 게임 중에는 화면이 꺼지지 않게 한다
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();
    }

    // 다른 앱에 다녀오면 시스템 바가 다시 보일 수 있어서 돌아올 때도 숨긴다
    @Override
    public void onResume() {
        super.onResume();
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    // 상태 표시줄과 내비게이션 바를 숨기는 전체 화면. 화면 가장자리를 쓸어 넘기면 잠깐 보인다.
    // Capacitor의 SystemBars도 capacitor.config.json의 plugins.SystemBars.hidden=true로 숨기게 해 두었다(기본값은 다시 보이게 함).
    private void hideSystemBars() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
