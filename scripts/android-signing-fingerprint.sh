#!/usr/bin/env bash
set -euo pipefail

KEYSTORE="${1:-${ANDROID_KEYSTORE:-$HOME/.android/debug.keystore}}"
ALIAS="${2:-${ANDROID_KEY_ALIAS:-androiddebugkey}}"
STOREPASS="${3:-${ANDROID_KEYSTORE_PASSWORD:-android}}"

if [[ ! -f "$KEYSTORE" ]]; then
  echo "No se encontró el keystore: $KEYSTORE" >&2
  echo "Uso: $0 [ruta-keystore] [alias] [storepass]" >&2
  exit 1
fi

SHA_LINE="$(keytool -list -v -keystore "$KEYSTORE" -alias "$ALIAS" -storepass "$STOREPASS" 2>/dev/null | grep -i 'SHA256:' | head -n1)"
SHA_FINGERPRINT="$(echo "$SHA_LINE" | sed -E 's/.*SHA256:[[:space:]]*//')"
SHA_FINGERPRINT="$(echo "$SHA_FINGERPRINT" | tr -d '[:space:]')

if [[ -z "$SHA_FINGERPRINT" ]]; then
  echo "No fue posible leer SHA-256 del keystore." >&2
  exit 1
fi

APK_KEY_HASH="$(python3 - <<'PY' "$SHA_FINGERPRINT"
import base64, sys
hex_str = sys.argv[1].replace(":", "").lower()
raw = bytes.fromhex(hex_str)
print(base64.urlsafe_b64encode(raw).decode("ascii").rstrip("="))
PY
)"

echo "Keystore: $KEYSTORE"
echo "Alias: $ALIAS"
echo ""
echo "SHA-256 (assetlinks.json):"
echo "$SHA_FINGERPRINT"
echo ""
echo "WEBAUTHN_ANDROID_APK_KEY_HASHES (origen Laragear):"
echo "android:apk-key-hash:$APK_KEY_HASH"
