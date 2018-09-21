#!/bin/bash
set -e
# Title
echo "       _             _         _           _        _ _           "
echo "      | |           (_)       (_)         | |      | | |          "
echo "      | | ___  _ __  _ _ __    _ _ __  ___| |_ __ _| | | ___ _ __ "
echo "  _   | |/ _ \\\| '_ \| | '_ \\  | | '_ \\\/ __| __/ _\` | | |/ _ \ '__|"
echo " | |__| | (_) | |_) | | | | | | | | | \__ \ || (_| | | |  __/ |   "
echo "  \____/ \___/| .__/|_|_| |_| |_|_| |_|___/\__\__,_|_|_|\___|_|   "
echo "              | |                                                 "
echo "              |_|                                                 "
# Get the latest version to download
version=$(curl --silent "https://api.github.com/repos/laurent22/joplin/releases/latest" | grep -Po '"tag_name": "v\K.*?(?=")')
# Delete previous version
rm -f ~/.joplin/*.AppImage ~/.local/share/applications/joplin.desktop
# Creates the folder where the binary will be stored
mkdir -p ~/.joplin/
# Download the latest version
wget -O ~/.joplin/Joplin-$version-x86_64.AppImage https://github.com/laurent22/joplin/releases/download/v$version/Joplin-$version-x86_64.AppImage 
# Gives execution privileges
chmod +x ~/.joplin/Joplin-$version-x86_64.AppImage
# Download icon
wget -O ~/.joplin/Icon512.png https://joplin.cozic.net/images/Icon512.png
# Create icon for Gnome
echo -e "[Desktop Entry]\nEncoding=UTF-8\nName=Joplin\nExec=/home/$USER/.joplin/Joplin-$version-x86_64.AppImage\nIcon=/home/$USER/.joplin/Icon512.png\nType=Application\nCategories=Application;" >> ~/.local/share/applications/joplin.desktop
# Informs the user that it has been installed and cleans variables
echo 'Joplin installed in the version' $version
unset version
