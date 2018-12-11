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
echo ""

# Check and warn if running as root.
if [[ $EUID = 0 ]] ; then
  if [[ $* != *--allow-root* ]] ; then
    echo "It is not recommended (nor necessary) to run this script as root. To do so anyway, please use '--allow-root'"
    exit 1
  fi
fi

#-----------------------------------------------------
# Download Joplin
#-----------------------------------------------------

# Get the latest version to download
version=$(curl --silent "https://api.github.com/repos/laurent22/joplin/releases/latest" | grep -Po '"tag_name": "v\K.*?(?=")')

# Check if it's in the latest version
if [[ $(< ~/.joplin/VERSION) != "$version" ]]; then

    # Delete previous version
    rm -f ~/.joplin/*.AppImage ~/.local/share/applications/joplin.desktop ~/.joplin/VERSION
    
    # Creates the folder where the binary will be stored
    mkdir -p ~/.joplin/
    
    # Download the latest version
    wget -O ~/.joplin/Joplin.AppImage https://github.com/laurent22/joplin/releases/download/v$version/Joplin-$version-x86_64.AppImage 
    
    # Gives execution privileges
    chmod +x ~/.joplin/Joplin.AppImage
    
    #-----------------------------------------------------
    # Icon
    #-----------------------------------------------------
    
    # Download icon
    wget -O ~/.joplin/Icon512.png https://joplin.cozic.net/images/Icon512.png
    
    # Detect desktop environment  
    if [ "$XDG_CURRENT_DESKTOP" = "" ]
    then
      desktop=$(echo "$XDG_DATA_DIRS" | sed 's/.*\(xfce\|kde\|gnome\).*/\1/')
    else
      desktop=$XDG_CURRENT_DESKTOP
    fi
    desktop=${desktop,,}  # convert to lower case

    # Create icon for Gnome
    if [[ $desktop =~ .*gnome.* ]] 
    then
       echo -e "[Desktop Entry]\nEncoding=UTF-8\nName=Joplin\nExec=/home/$USER/.joplin/Joplin.AppImage\nIcon=/home/$USER/.joplin/Icon512.png\nType=Application\nCategories=Application;" >> ~/.local/share/applications/joplin.desktop
    fi
    
    #-----------------------------------------------------
    # Finish
    #-----------------------------------------------------
    
    # Informs the user that it has been installed and cleans variables
    echo 'Joplin installed in the version' $version
    # Add version
    echo $version > ~/.joplin/VERSION
else
    echo 'You are now in the latest version.'
fi
unset version
