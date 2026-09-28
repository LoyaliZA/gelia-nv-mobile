package mx.neobash.gelianv;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SecureToken")
public class SecureTokenPlugin extends Plugin {
    static final String PREFS_NAME = "gelia_secure_session";
    private static final String TOKEN_KEY = "bearer";

    @PluginMethod
    public void set(PluginCall call) {
        String value = call.getString("value");
        if (value == null || value.isEmpty()) {
            call.reject("El token está vacío.");
            return;
        }
        try {
            SharedPreferences prefs = openPrefs();
            if (!prefs.edit().putString(TOKEN_KEY, value).commit()) {
                wipe();
                call.reject("No se pudo guardar el token.");
                return;
            }
            call.resolve();
        } catch (Exception error) {
            wipe();
            call.reject("No se pudo abrir el almacén seguro.", error);
        }
    }

    @PluginMethod
    public void get(PluginCall call) {
        try {
            String value = openPrefs().getString(TOKEN_KEY, null);
            JSObject result = new JSObject();
            result.put("value", value);
            call.resolve(result);
        } catch (Exception error) {
            wipe();
            call.reject("No se pudo leer el almacén seguro.", error);
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        wipe();
        call.resolve();
    }

    private SharedPreferences openPrefs() throws Exception {
        Context context = getContext();
        MasterKey masterKey = new MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build();
        return EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        );
    }

    private void wipe() {
        try {
            Context context = getContext();
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().commit();
            context.deleteSharedPreferences(PREFS_NAME);
        } catch (RuntimeException ignored) {
            // El siguiente inicio de sesión pide credenciales de nuevo.
        }
    }
}
