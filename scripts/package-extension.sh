#!/usr/bin/env sh
# Packages the Chrome extension in extension/ into public/stealz-extension.zip, the download on
# the site's /extension page. Run it after changing anything in extension/.
set -e
cd "$(dirname "$0")/.."
rm -rf .ext-build public/stealz-extension.zip
mkdir -p .ext-build/stealz-extension
cp -R extension/. .ext-build/stealz-extension/
(cd .ext-build && zip -qr -X ../public/stealz-extension.zip stealz-extension)
rm -rf .ext-build
echo "Wrote public/stealz-extension.zip"
