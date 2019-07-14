#!/bin/bash
set -e
# Title
echo "     _             _ _       "
echo "    | | ___  _ __ | (_)_ __  "
echo " _  | |/ _ \| '_ \| | | '_ \ "
echo "| |_| | (_) | |_) | | | | | |"
echo " \___/ \___/| .__/|_|_|_| |_|"
echo "            |_|"
echo ""
echo "Linux Installer and Updater"

#-----------------------------------------------------
# Variables
#-----------------------------------------------------
COLOR_RED=`tput setaf 1`
COLOR_GREEN=`tput setaf 2`
COLOR_RESET=`tput sgr0`

# Check and warn if running as root.
if [[ $EUID = 0 ]] ; then
  if [[ $* != *--allow-root* ]] ; then
    echo "${COLOR_RED}It is not recommended (nor necessary) to run this script as root. To do so anyway, please use '--allow-root'${COLOR_RESET}"
    exit 1
  fi
fi

Kill(){
	echo "Closing Joplin If It's Currently Running."
	hash grep 2>/dev/null || { echo >&2 "grep is not installed.  Aborting."; exit 1; }
	command -v grep >/dev/null || { echo >&2 "grep is not installed.  Aborting."; exit 1; }
	hash awk 2>/dev/null || { echo >&2 "awk is not installed.  Aborting."; exit 1; }
	command -v awk >/dev/null || { echo >&2 "awk is not installed.  Aborting."; exit 1; }
	hash ps 2>/dev/null || { echo >&2 "ps is not installed.  Aborting."; exit 1; }
	command -v ps >/dev/null || { echo >&2 "ps is not installed.  Aborting."; exit 1; }
	
	for PID in `ps -ef |grep -e "Joplin" |grep -v "Helper" |grep -v grep |awk '{print $2}'`
	do
  		kill $PID
	done
	Launch
}

Launch(){
	echo "Starting Joplin"
	echo "This still needs to be added, for now please start Joplin manually, Pull requests are welcome"
	#~/.joplin/Joplin.AppImage &
}

Help(){
	echo "Use --help or -h for help"
	echo "Use --update to kill Joplin then update and then automatically start Joplin after the update"
}

for arg in "$@"; do
  shift
  case "$arg" in
    "--help") set -- "$@" "-h" ;;
    "--update") set -- "$@" "-u" ;;
	*)        set -- "$@" "$arg"
  esac
done

rest=false; ws=false

OPTIND=1

while getopts ':uhe' name;
do
        case $name in
          u)one=1;;
          h)two=1;;
		  e)two=1;;
          *)echo "Invalid argument";;
        esac
done

if [[ ! -z $one ]]
then
    Kill
fi

if [[ ! -z $two ]]
then
    Help
fi

shift $(($OPTIND -1))

#-----------------------------------------------------
# Download Joplin
#-----------------------------------------------------

# Get the latest version to download
version=$(wget -qO - "https://api.github.com/repos/laurent22/joplin/releases/latest" | grep -Po '"tag_name": "v\K.*?(?=")')

# Check if it's in the latest version
if [[ ! -e ~/.joplin/VERSION ]] || [[ $(< ~/.joplin/VERSION) != "$version" ]]; then

    echo 'Downloading Joplin...'
    # Delete previous version (in future versions joplin.desktop shouldn't exist)
    rm -f ~/.joplin/*.AppImage ~/.local/share/applications/joplin.desktop ~/.local/share/applications/appimagekit-joplin.desktop ~/.joplin/VERSION
    
    # Creates the folder where the binary will be stored
    mkdir -p ~/.joplin/
    
    # Download the latest version
    wget -nv --show-progress -O ~/.joplin/Joplin.AppImage https://github.com/laurent22/joplin/releases/download/v$version/Joplin-$version-x86_64.AppImage 
    
    # Gives execution privileges
    chmod +x ~/.joplin/Joplin.AppImage
    
    echo "${COLOR_GREEN}OK${COLOR_RESET}"
    
    #-----------------------------------------------------
    # Icon
    #-----------------------------------------------------
    
    # Download icon
    echo 'Downloading icon...'
    wget -nv -O ~/.joplin/Icon512.png https://joplin.cozic.net/images/Icon512.png
    echo "${COLOR_GREEN}OK${COLOR_RESET}"
    
    # Detect desktop environment  
    if [ "$XDG_CURRENT_DESKTOP" = "" ]
    then
      desktop=$(echo "$XDG_DATA_DIRS" | sed 's/.*\(xfce\|kde\|gnome\).*/\1/')
    else
      desktop=$XDG_CURRENT_DESKTOP
    fi
    desktop=${desktop,,}  # convert to lower case

    # Create icon for Gnome
    echo 'Create Desktop icon.'
    if [[ $desktop =~ .*gnome.*|.*kde.*|.*xfce.*|.*mate.* ]]
    then
       : "${TMPDIR:=/tmp}"
       # This command extracts to squashfs-root by default and can't be changed...
       # So we run in in the tmp directory and clean up after ourselves
       (cd $TMPDIR && ~/.joplin/Joplin.AppImage --appimage-extract joplin.desktop &> /dev/null)
       APPIMAGE_VERSION=$(grep "^X-AppImage-BuildId=" $TMPDIR/squashfs-root/joplin.desktop | head -n 1 | cut -d " " -f 1)
       rm -rf $TMPDIR/squashfs-root

       echo -e "[Desktop Entry]\nEncoding=UTF-8\nName=Joplin\nComment=Joplin for Desktop\nExec=/home/$USER/.joplin/Joplin.AppImage\nIcon=/home/$USER/.joplin/Icon512.png\nStartupWMClass=Joplin\nType=Application\nCategories=Application;\n$APPIMAGE_VERSION" >> ~/.local/share/applications/appimagekit-joplin.desktop
       echo "${COLOR_GREEN}OK${COLOR_RESET}"
    else
       echo "${COLOR_RED}NOT DONE${COLOR_RESET}"
    fi
    
    #-----------------------------------------------------
    # Finish
    #-----------------------------------------------------
    
    # Informs the user that it has been installed and cleans variables
    echo "${COLOR_GREEN}Joplin version${COLOR_RESET}" $version "${COLOR_GREEN}installed.${COLOR_RESET}"
    # Add version
    echo $version > ~/.joplin/VERSION
else
    echo "${COLOR_GREEN}You already have the latest version${COLOR_RESET}" $version "${COLOR_GREEN}installed.${COLOR_RESET}"
fi
echo 'Bye!'
unset version
