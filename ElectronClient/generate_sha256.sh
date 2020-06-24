# This script generates the SHA-256 sum of the AppImage in the
# dist directory
# Run this only after running `npm run dist`

OK=0 # Exit code for all ok
NO_APP_IMAGE=126 # If the AppImage has not been built

DIST_DIR=dist # Directory to look for AppImage

if [[ -d $DIST_DIR ]]; then
    cd $DIST_DIR
    APPIMAGE=$(find . -name '*.AppImage' | sort | tail -n 1) # Latest AppImage
    if [[ $APPIMAGE == "" ]]; then
        echo 'Please run `npm run dist` in the ElectronClient directory first'
        exit $NO_APP_IMAGE
    fi
    VERSION="${APPIMAGE%.*}"
    sha256sum $APPIMAGE | awk '{ print $1 }' > $VERSION.sha256
else
    echo 'Please run `npm run dist` in the ElectronClient directory first'
    exit $NO_APP_IMAGE
fi

exit $OK