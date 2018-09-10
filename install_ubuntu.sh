#!/bin/bash
set -e
version=$(curl --silent "https://api.github.com/repos/laurent22/joplin/releases/latest" | grep -Po '"tag_name": "v\K.*?(?=")')
rm ~/.joplin/*.AppImage ~/.local/share/applications/joplin.desktop
mkdir -p ~/.joplin/
wget -O ~/.joplin/Joplin-$version-x86_64.AppImage https://github.com/laurent22/joplin/releases/download/v$version/Joplin-$version-x86_64.AppImage 
chmod +x ~/.joplin/Joplin-$version-x86_64.AppImage
wget -O ~/.joplin/Icon512.png https://joplin.cozic.net/images/Icon512.png
echo -e "[Desktop Entry]\nEncoding=UTF-8\nName=Joplin\nExec=/home/$USER/.joplin/Joplin-$version-x86_64.AppImage\nIcon=/home/$USER/.joplin/Icon512.png\nType=Application\nCategories=Application;" >> ~/.local/share/applications/joplin.desktop
