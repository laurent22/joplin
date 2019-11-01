#!/bin/bash
set -e

#-----------------------------------------------------
# Variables
#-----------------------------------------------------
COLOR_RED=`tput setaf 1`
COLOR_GREEN=`tput setaf 2`
COLOR_RESET=`tput sgr0`
SILENT=false

print() {
    if [[ "$SILENT" == false ]] ; then
        echo $1
    fi
}

#-----------------------------------------------------
# ARGUMENTS
#-----------------------------------------------------

# --allow-root
## Check and warn if running as root.
if [[ $EUID = 0 ]] ; then
  if [[ $* != *--allow-root* ]] ; then
    echo "${COLOR_RED}It is not recommended (nor necessary) to run this script as root. To do so anyway, please use '--allow-root'${COLOR_RESET}"
    exit 1
  fi
fi

# --silent
## Mutes messages by console
if [[ $* == *--silent* ]] ; then
    SILENT=true
fi

#-----------------------------------------------------
# START
#-----------------------------------------------------

# Title
print "     _             _ _       "
print "    | | ___  _ __ | (_)_ __  "
print " _  | |/ _ \| '_ \| | | '_ \ "
print "| |_| | (_) | |_) | | | | | |"
print " \___/ \___/| .__/|_|_|_| |_|"
print "            |_|"
print ""
print "Linux Installer and Updater"

#-----------------------------------------------------
# Download Joplin
#-----------------------------------------------------

# Get the latest version to download
RELEASE_VERSION=$(wget -qO - "https://api.github.com/repos/laurent22/joplin/releases/latest" | grep -Po '"tag_name": "v\K.*?(?=")')

# Check if it's in the latest version
if [[ ! -e ~/.joplin/VERSION ]] || [[ $(< ~/.joplin/VERSION) != "$RELEASE_VERSION" ]]; then

    print 'Downloading Joplin...'
    # Delete previous version (in future versions joplin.desktop shouldn't exist)
    rm -f ~/.joplin/*.AppImage ~/.local/share/applications/joplin.desktop ~/.joplin/VERSION

    # Creates the folder where the binary will be stored
    mkdir -p ~/.joplin/

    # Download the latest version
    wget -nv --show-progress -O ~/.joplin/Joplin.AppImage https://github.com/laurent22/joplin/releases/download/v$RELEASE_VERSION/Joplin-$RELEASE_VERSION-x86_64.AppImage 

    # Gives execution privileges
    chmod +x ~/.joplin/Joplin.AppImage

    print "${COLOR_GREEN}OK${COLOR_RESET}"

    #-----------------------------------------------------
    # Icon
    #-----------------------------------------------------

    # Download icon
    print 'Downloading icon...'
    mkdir -p ~/.local/share/icons/hicolor/512x512/apps
    wget -nv -O ~/.local/share/icons/hicolor/512x512/apps/joplin.png https://joplinapp.org/images/Icon512.png
    print "${COLOR_GREEN}OK${COLOR_RESET}"

    # Detect desktop environment
    if [ "$XDG_CURRENT_DESKTOP" = "" ]
    then
      DESKTOP=$(echo "$XDG_DATA_DIRS" | sed 's/.*\(xfce\|kde\|gnome\).*/\1/')
    else
      DESKTOP=$XDG_CURRENT_DESKTOP
    fi
    DESKTOP=${DESKTOP,,}  # convert to lower case

    # Create icon for Gnome
    echo 'Create Desktop icon.'
    if [[ $DESKTOP =~ .*gnome.*|.*kde.*|.*xfce.*|.*mate.*|.*lxqt.*|.*unity.*|.*x-cinnamon.*|.*deepin.* ]]
    then
       : "${TMPDIR:=/tmp}"
       # This command extracts to squashfs-root by default and can't be changed...
       # So we run it in the tmp directory and clean up after ourselves
       (cd $TMPDIR && ~/.joplin/Joplin.AppImage --appimage-extract joplin.desktop &> /dev/null)
       APPIMAGE_VERSION=$(grep "^X-AppImage-BuildId=" $TMPDIR/squashfs-root/joplin.desktop | head -n 1 | cut -d " " -f 1)
       rm -rf $TMPDIR/squashfs-root
       # Only delete the desktop file if it will be replaced
       rm -f ~/.local/share/applications/appimagekit-joplin.desktop 

       # On some systems this directory doesn't exist by default
       mkdir -p ~/.local/share/applications
       echo -e "[Desktop Entry]\nEncoding=UTF-8\nName=Joplin\nComment=Joplin for Desktop\nExec=/home/$USER/.joplin/Joplin.AppImage\nIcon=joplin\nStartupWMClass=Joplin\nType=Application\nCategories=Office;\n$APPIMAGE_VERSION" >> ~/.local/share/applications/appimagekit-joplin.desktop 
       print "${COLOR_GREEN}OK${COLOR_RESET}"
    else
       print "${COLOR_RED}NOT DONE${COLOR_RESET}"
    fi

    #-----------------------------------------------------
    # Finish
    #-----------------------------------------------------
    # Informs the user that it has been installed and cleans variables
    print "${COLOR_GREEN}Joplin version${COLOR_RESET}" $RELEASE_VERSION "${COLOR_GREEN}installed.${COLOR_RESET}"

    # Add version
    echo $RELEASE_VERSION > ~/.joplin/VERSION
else
    print "${COLOR_GREEN}You already have the latest version${COLOR_RESET}" $version "${COLOR_GREEN}installed.${COLOR_RESET}"
fi

# Goodbye
print 'Bye!'
