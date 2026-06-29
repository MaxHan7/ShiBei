#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT="$ROOT_DIR/拾贝/拾贝.xcodeproj"
SCHEME="拾贝"
BUNDLE_ID="com.maxhan.shibei"
DEVICE_ID="${1:-26BD96F1-4C9A-5123-92A7-6733CAE2BE21}"
DESTINATION="${SHIBEI_IOS_DESTINATION:-id=00008130-000465522213803A}"
DERIVED_DATA="${SHIBEI_IOS_DERIVED_DATA:-/tmp/shibei-official-device-build}"
APP_PATH="$DERIVED_DATA/Build/Products/Debug-iphoneos/拾贝.app"

echo "Building official ShiBei app"
echo "  project: $PROJECT"
echo "  bundle:  $BUNDLE_ID"
echo "  device:  $DEVICE_ID"

rm -rf "$DERIVED_DATA"
xcodebuild \
  -allowProvisioningUpdates \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Debug \
  -destination "$DESTINATION" \
  -derivedDataPath "$DERIVED_DATA" \
  build

ACTUAL_BUNDLE_ID="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP_PATH/Info.plist")"
DISPLAY_NAME="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleDisplayName' "$APP_PATH/Info.plist")"

if [[ "$ACTUAL_BUNDLE_ID" != "$BUNDLE_ID" ]]; then
  echo "Refusing to install wrong bundle id: $ACTUAL_BUNDLE_ID" >&2
  exit 1
fi

if [[ "$DISPLAY_NAME" != "拾贝" ]]; then
  echo "Refusing to install wrong display name: $DISPLAY_NAME" >&2
  exit 1
fi

xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"
xcrun devicectl device process launch --device "$DEVICE_ID" "$BUNDLE_ID"

echo "Installed and launched official ShiBei app: $BUNDLE_ID"
