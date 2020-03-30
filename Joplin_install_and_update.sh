#!/bin/bash
set -e
trap 'exception $LINENO' err
trap 'cleanup' exit


#-----------------------------------------------------
# Variables
#-----------------------------------------------------
COLOR_RED=`tput setaf 1`
COLOR_GREEN=`tput setaf 2`
COLOR_YELLOW=`tput setaf 3`
COLOR_BLUE=`tput setaf 4`
COLOR_RESET=`tput sgr0`
SILENT=false
ALLOW_ROOT=false
SHOW_CHANGELOG=false
FORCE_VERSION=${INSTALL_VERSION}
TEMP_DIR=

print() {
    if [[ "${SILENT}" == false ]] ; then
        echo -e "$@"
    fi
}

latestVersion() {
  if [[ -z $LATEST_VERSION ]]; then
      LATEST_VERSION=$(wget -qO - "https://api.github.com/repos/laurent22/joplin/releases/latest" | grep -Po '"tag_name": ?"v\K.*?(?=")')
  fi
  echo ${LATEST_VERSION}
}

showLogo() {
    print "${COLOR_BLUE}"
    print "     _             _ _       "
    print "    | | ___  _ __ | (_)_ __  "
    print " _  | |/ _ \| '_ \| | | '_ \ "
    print "| |_| | (_) | |_) | | | | | |"
    print " \___/ \___/| .__/|_|_|_| |_|"
    print "            |_|"
    print ""
    print "Linux Installer and Updater"
    print "${COLOR_RESET}"
}

showHelp() {
    LATEST_VERSION=$(latestVersion)
    print "Available Arguments:"
    print "\t" "--help" "\t\t" "Show this help information" "\n"
    print "\t" "--allow-root" "\t\t" "Allow the install to be run as root"
    print "\t" "--changelog" "\t\t" "Show the changelog after installation"
    print "\t" "--force" "\t\t" "Always download the latest version"
    print "\t" "--version=${LATEST_VERSION}" "\t" "Download a specific version. (Environment variable INSTALL_VERSION can also be specified.)"
}

showError() {
  print "\n" "${COLOR_RED}ERROR: " "$*" "${COLOR_RESET}" "\n"
}

cleanup() {
    print "Cleaning up..."
    if [[ -d $TEMP_DIR ]]; then
        rm -rf $TEMP_DIR
    fi
    print "${COLOR_GREEN}OK${COLOR_RESET}"
}

exception() {
    showError "There was an error on line ${1}!"
    exit 1
}

#-----------------------------------------------------
# START
#-----------------------------------------------------
showLogo

#-----------------------------------------------------
# PARSE ARGUMENTS
#-----------------------------------------------------

optspec=":h-:"
while getopts "${optspec}" OPT; do
  [ "${OPT}" = " " ] && continue
  if [ "${OPT}" = "-" ]; then   # long option: reformulate OPT and OPTARG
    OPT="${OPTARG%%=*}"       # extract long option name
    OPTARG="${OPTARG#$OPT}"   # extract long option argument (may be empty)
    OPTARG="${OPTARG#=}"      # if long option argument, remove assigning `=`
  fi
  case "${OPT}" in
    h | help )     showHelp; exit 0 ;;
    allow-root )   ALLOW_ROOT=true ;;
    silent )       SILENT=true ;;
    force )        FORCE=true ;;
    changelog )    SHOW_CHANGELOG=true ;;
    version )      FORCE_VERSION=${OPTARG} ;;
    [^\?]* )       showHelp; showError "Illegal option --${OPT}"; exit 2 ;;
    \? )           showHelp; showError "Illegal option -${OPTARG}"; exit 2 ;;
  esac
done
shift $((OPTIND-1)) # remove parsed options and args from $@ list

#-----------------------------------------------------

## Check and warn if running as root.
if [[ $EUID = 0 ]] && [[ "${ALLOW_ROOT}" != true ]]; then
    showError "It is not recommended (nor necessary) to run this script as root. To do so anyway, please use '--allow-root'"
    exit 1
fi

print "Checking architecture..."
# Architecture check
if ! [[ -x "$(command -v uname)" ]] ; then
	print "${COLOR_YELLOW}WARNING: Can't get system architecture, skipping check${COLOR_RESET}"
else
  ## this actually gives more information than needed, but it contains all architectures (hardware and software)
	ARCHITECTURE=$(uname -a)

	if [[ $ARCHITECTURE =~ .*aarch.*|.*arm.* ]] ; then
		showError "Arm systems are not officially supported by Joplin, please search the forum (https://discourse.joplinapp.org/) for more information"
		exit 1
	elif [[ $ARCHITECTURE =~ .*i.86.* ]] ; then
		showError "32-bit systems are not supported by Joplin, please search the forum (https://discourse.joplinapp.org/) for more information"
		exit 1
	fi
fi

#-----------------------------------------------------
# Download Joplin
#-----------------------------------------------------

# Get the desired version to download
DESIRED_VERSION=$(latestVersion)

if [[ ! -z $FORCE_VERSION ]]; then
    print "Latest version${COLOR_GREEN} ${DESIRED_VERSION} ${COLOR_RESET}is available, but version${COLOR_YELLOW} ${FORCE_VERSION} ${COLOR_RESET}was requested."
    DESIRED_VERSION=${FORCE_VERSION}
    if ! wget -q "https://api.github.com/repos/laurent22/joplin/releases/tags/v${DESIRED_VERSION}" > /dev/null ; then
        showError "Invalid version requested. Check available releases at https://github.com/laurent22/joplin/releases"
        exit 1;
    fi
fi

# Check if it's in the latest version
if [[ -e ~/.joplin/VERSION ]] && [[ $(< ~/.joplin/VERSION) == "${DESIRED_VERSION}" ]]; then
    print "${COLOR_GREEN}You already have version${COLOR_RESET} ${DESIRED_VERSION} ${COLOR_GREEN}installed.${COLOR_RESET}"
    ([[ "$FORCE" == true ]] && print "Forcing installation...") || exit 0
else
    [[ -e ~/.joplin/VERSION ]] && CURRENT_VERSION=$(< ~/.joplin/VERSION)
    print "${COLOR_GREEN}Installing version${COLOR_RESET} ${DESIRED_VERSION} ${COLOR_GREEN}since you have${COLOR_RESET} ${CURRENT_VERSION:-no version} ${COLOR_GREEN}installed.${COLOR_RESET}"
fi

#-----------------------------------------------------
print 'Downloading Joplin...'
TEMP_DIR=$(mktemp -d)
wget -qnv --show-progress -O ${TEMP_DIR}/Joplin.AppImage https://github.com/laurent22/joplin/releases/download/v${DESIRED_VERSION}/Joplin-${DESIRED_VERSION}.AppImage
wget -qnv --show-progress -O ${TEMP_DIR}/joplin.png https://joplinapp.org/images/Icon512.png

#-----------------------------------------------------
print 'Installing Joplin...'
# Delete previous version (in future versions joplin.desktop shouldn't exist)
rm -f ~/.joplin/*.AppImage ~/.local/share/applications/joplin.desktop ~/.joplin/VERSION

# Creates the folder where the binary will be stored
mkdir -p ~/.joplin/

# Download the latest version
mv ${TEMP_DIR}/Joplin.AppImage ~/.joplin/Joplin.AppImage

# Gives execution privileges
chmod +x ~/.joplin/Joplin.AppImage

print "${COLOR_GREEN}OK${COLOR_RESET}"

#-----------------------------------------------------
print 'Installing icon...'
mkdir -p ~/.local/share/icons/hicolor/512x512/apps
mv ${TEMP_DIR}/joplin.png ~/.local/share/icons/hicolor/512x512/apps/joplin.png
print "${COLOR_GREEN}OK${COLOR_RESET}"

# Detect desktop environment
if [ "$XDG_CURRENT_DESKTOP" = "" ]
then
  DESKTOP=$(echo "${XDG_DATA_DIRS}" | sed 's/.*\(xfce\|kde\|gnome\).*/\1/')
else
  DESKTOP=$XDG_CURRENT_DESKTOP
fi
DESKTOP=${DESKTOP,,}  # convert to lower case

#-----------------------------------------------------
echo 'Create Desktop icon...'
if [[ $DESKTOP =~ .*gnome.*|.*kde.*|.*xfce.*|.*mate.*|.*lxqt.*|.*unity.*|.*x-cinnamon.*|.*deepin.* ]]
then
    : "${TMPDIR:=$TEMP_DIR}"
    # This command extracts to squashfs-root by default and can't be changed...
    # So we run it in the tmp directory and clean up after ourselves
    (cd $TMPDIR && ~/.joplin/Joplin.AppImage --appimage-extract joplin.desktop &> /dev/null)
    APPIMAGE_VERSION=$(grep "^X-AppImage-Version=" $TMPDIR/squashfs-root/joplin.desktop | head -n 1 | cut -d "=" -f 2)
    rm -rf $TMPDIR/squashfs-root
    # Only delete the desktop file if it will be replaced
    rm -f ~/.local/share/applications/appimagekit-joplin.desktop

    # On some systems this directory doesn't exist by default
    mkdir -p ~/.local/share/applications
    echo -e "[Desktop Entry]\nEncoding=UTF-8\nName=Joplin\nComment=Joplin for Desktop\nExec=/home/${USER}/.joplin/Joplin.AppImage\nIcon=joplin\nStartupWMClass=Joplin\nType=Application\nCategories=Office;\n#${APPIMAGE_VERSION}" >> ~/.local/share/applications/appimagekit-joplin.desktop
    # Update application icons
    [[ `command -v update-desktop-database` ]] && update-desktop-database ~/.local/share/applications
    print "${COLOR_GREEN}OK${COLOR_RESET}"
else
    print "${COLOR_RED}NOT DONE, unknown desktop '${DESKTOP}'${COLOR_RESET}"
fi

#-----------------------------------------------------
# FINISH INSTALLATION
#-----------------------------------------------------

# Informs the user that it has been installed
print "${COLOR_GREEN}Joplin version${COLOR_RESET} ${DESIRED_VERSION} ${COLOR_GREEN}installed.${COLOR_RESET}"

# Record version
echo $DESIRED_VERSION > ~/.joplin/VERSION

#-----------------------------------------------------
if [[ "$SHOW_CHANGELOG" == true ]]; then
    NOTES=$(wget -qO - https://api.github.com/repos/laurent22/joplin/releases/latest | grep -Po '"body": ?"\K.*(?=")')
    print "${COLOR_BLUE}Changelog:${COLOR_RESET}\n${NOTES}"
fi

#-----------------------------------------------------
# cleanup called by trap
exit 0