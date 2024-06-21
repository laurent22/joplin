#!/usr/bin/env bash

set -e

trap 'handleError' ERR

handleError() {
  echo ""
  echo "If you encountered an error, please consider fixing"
  echo "the script for your environment and creating a pull"
  echo "request instead of asking for support on GitHub or"
  echo "the forum. The error message above should tell you"
  echo "where and why the error happened."
}

#-----------------------------------------------------
# Variables
#-----------------------------------------------------
# Only set colors, if tput available and TERM is recognized
if [[ `command -v tput` && `tput setaf 1 2>/dev/null` ]]; then
  COLOR_RED=`tput setaf 1`
  COLOR_GREEN=`tput setaf 2`
  COLOR_YELLOW=`tput setaf 3`
  COLOR_BLUE=`tput setaf 4`
  COLOR_RESET=`tput sgr0`
fi
SILENT=false
ALLOW_ROOT=false
SHOW_CHANGELOG=false
INCLUDE_PRE_RELEASE=false

print() {
  if [[ "${SILENT}" == false ]]; then
    echo -e "$@"
  fi
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
  showLogo
  print "Available Arguments:"
  print "\t" "--help" "\t" "Show this help information" "\n"
  print "\t" "--allow-root" "\t" "Allow the install to be run as root"
  print "\t" "--changelog" "\t" "Show the changelog after installation"
  print "\t" "--force" "\t" "Always download the latest version"
  print "\t" "--silent" "\t" "Don't print any output"
  print "\t" "--prerelease" "\t" "Check for new Versions including Pre-Releases"

  if [[ ! -z $1 ]]; then
    print "\n" "${COLOR_RED}ERROR: " "$*" "${COLOR_RESET}" "\n"
  else
    exit 0
  fi
}

#-----------------------------------------------------
# PARSE ARGUMENTS
#-----------------------------------------------------

optspec=":h-:"
while getopts "${optspec}" OPT; do
  [ "${OPT}" = " " ] && continue
  if [ "${OPT}" = "-" ]; then   # long option: reformulate OPT and OPTARG
    OPT="${OPTARG%%=*}"         # extract long option name
    OPTARG="${OPTARG#$OPT}"     # extract long option argument (may be empty)
    OPTARG="${OPTARG#=}"        # if long option argument, remove assigning `=`
  fi
  case "${OPT}" in
    h | help )     showHelp ;;
    allow-root )   ALLOW_ROOT=true ;;
    silent )       SILENT=true ;;
    force )        FORCE=true ;;
    changelog )    SHOW_CHANGELOG=true ;;
    prerelease )   INCLUDE_PRE_RELEASE=true ;;
    [^\?]* )       showHelp "Illegal option --${OPT}"; exit 2 ;;
    \? )           showHelp "Illegal option -${OPTARG}"; exit 2 ;;
  esac
done
shift $((OPTIND-1)) # remove parsed options and args from $@ list

## Check and warn if running as root.
if [[ $EUID = 0 ]] && [[ "${ALLOW_ROOT}" != true ]]; then
  showHelp "It is not recommended (nor necessary) to run this script as root. To do so anyway, please use '--allow-root'"
  exit 1
fi

#-----------------------------------------------------
# START
#-----------------------------------------------------
showLogo

#-----------------------------------------------------
print "Checking architecture..."
## uname actually gives more information than needed, but it contains all architectures (hardware and software)
ARCHITECTURE=$(uname -m -p -i || echo "NO CHECK")

if [[ $ARCHITECTURE = "NO CHECK" ]]; then
  print "${COLOR_YELLOW}WARNING: Can't get system architecture, skipping check${COLOR_RESET}"
elif [[ $ARCHITECTURE =~ .*aarch.*|.*arm.* ]]; then
  showHelp "Arm systems are not officially supported by Joplin, please search the forum (https://discourse.joplinapp.org/) for more information"
  exit 1
elif [[ $ARCHITECTURE =~ .*i386.*|.*i686.* ]]; then
  showHelp "32-bit systems are not supported by Joplin, please search the forum (https://discourse.joplinapp.org/) for more information"
  exit 1
fi

#-----------------------------------------------------
print "Checking dependencies..."
## Check if libfuse2 is present.
if [[ $(command -v ldconfig) ]]; then
	LIBFUSE=$(ldconfig -p | grep "libfuse.so.2" || echo '')
else
	LIBFUSE=$(find /lib /usr/lib /lib64 /usr/lib64 /usr/local/lib -name "libfuse.so.2" 2>/dev/null | grep "libfuse.so.2" || echo '')
fi
if [[ $LIBFUSE == "" ]]; then
  print "${COLOR_RED}Error: Can't get libfuse2 on system, please install libfuse2${COLOR_RESET}"
  print "See https://joplinapp.org/help/faq/#desktop-application-will-not-launch-on-linux and https://github.com/AppImage/AppImageKit/wiki/FUSE for more information"
  exit 1
fi

#-----------------------------------------------------
# Download Joplin
#-----------------------------------------------------

# Get the latest version to download
if [[ "$INCLUDE_PRE_RELEASE" == true ]]; then
  RELEASE_VERSION=$(wget -qO - "https://api.github.com/repos/laurent22/joplin/releases" | grep -Po '"tag_name": ?"v\K.*?(?=")' | sort -rV | head -1)
else
  RELEASE_VERSION=$(wget -qO - "https://api.github.com/repos/laurent22/joplin/releases/latest" | grep -Po '"tag_name": ?"v\K.*?(?=")')
fi

# Check if it's in the latest version
if [[ -e ~/.joplin/VERSION ]] && [[ $(< ~/.joplin/VERSION) == "${RELEASE_VERSION}" ]]; then
  print "${COLOR_GREEN}You already have the latest version${COLOR_RESET} ${RELEASE_VERSION} ${COLOR_GREEN}installed.${COLOR_RESET}"
  ([[ "$FORCE" == true ]] && print "Forcing installation...") || exit 0
else
  [[ -e ~/.joplin/VERSION ]] && CURRENT_VERSION=$(< ~/.joplin/VERSION)
  print "The latest version is ${RELEASE_VERSION}, but you have ${CURRENT_VERSION:-no version} installed."
fi

# Check if it's an update or a new install
DOWNLOAD_TYPE="New"
if [[ -f ~/.joplin/Joplin.AppImage ]]; then
  DOWNLOAD_TYPE="Update"
fi

#-----------------------------------------------------
print 'Downloading Joplin...'
TEMP_DIR=$(mktemp -d)
wget -O "${TEMP_DIR}/Joplin.AppImage" "https://objects.joplinusercontent.com/v${RELEASE_VERSION}/Joplin-${RELEASE_VERSION}.AppImage?source=LinuxInstallScript&type=$DOWNLOAD_TYPE"
wget -O "${TEMP_DIR}/joplin.png" https://joplinapp.org/images/Icon512.png

#-----------------------------------------------------
print 'Installing Joplin...'
# Delete previous version (in future versions joplin.desktop shouldn't exist)
rm -f ~/.joplin/*.AppImage ~/.local/share/applications/joplin.desktop ~/.joplin/VERSION

# Creates the folder where the binary will be stored
mkdir -p ~/.joplin/

# Download the latest version
mv "${TEMP_DIR}/Joplin.AppImage" ~/.joplin/Joplin.AppImage

# Gives execution privileges
chmod +x ~/.joplin/Joplin.AppImage

print "${COLOR_GREEN}OK${COLOR_RESET}"

#-----------------------------------------------------
print 'Installing icon...'
mkdir -p ~/.local/share/icons/hicolor/512x512/apps
mv "${TEMP_DIR}/joplin.png" ~/.local/share/icons/hicolor/512x512/apps/joplin.png
print "${COLOR_GREEN}OK${COLOR_RESET}"

# Detect desktop environment
if [ "$XDG_CURRENT_DESKTOP" = "" ]; then
  DESKTOP=$(echo "${XDG_DATA_DIRS}" | sed 's/.*\(xfce\|kde\|gnome\).*/\1/')
else
  DESKTOP=$XDG_CURRENT_DESKTOP
fi
DESKTOP=${DESKTOP,,}  # convert to lower case

echo 'Create Desktop icon...'

# Detect distribution environment, and apply --no-sandbox fix
SANDBOXPARAM=""
# lsb_release isn't available on some platforms (e.g. opensuse)
# The equivalent of lsb_release in OpenSuse is the file /usr/lib/os-release
if command -v lsb_release &> /dev/null; then
  DISTVER=$(lsb_release -is) && DISTVER=$DISTVER$(lsb_release -rs)
  DISTCODENAME=$(lsb_release -cs)
  DISTMAJOR=$(lsb_release -rs|cut -d. -f1)

  #-----------------------------------------------------
  # Check for "The SUID sandbox helper binary was found, but is not configured correctly" problem.
  # It is present in Debian 1X. A (temporary) patch will be applied at .desktop file
  # Linux Mint 4 Debbie is based on Debian 10 and requires the same param handling.
  #
  # TODO: Remove: This is likely no longer an issue. See https://issues.chromium.org/issues/40462640.
  BAD_HELPER_BINARY=false
  if [[ $DISTVER =~ Debian1. || ( "$DISTVER" = "Linuxmint4" && "$DISTCODENAME" = "debbie" ) || ( "$DISTVER" = "CentOS" && "$DISTMAJOR" =~ 6|7 ) ]]; then
    BAD_HELPER_BINARY=true
  fi

  # Work around Ubuntu 23.10+'s restrictions on unprivileged user namespaces. Electron
  # uses these to sandbox processes. Unfortunately, it doesn't look like we can get around this
  # without writing the AppImage to a non-user-writable location (without invalidating other security
  # controls). See https://discourse.joplinapp.org/t/possible-future-requirement-for-no-sandbox-flag-for-ubuntu-23-10/.
  HAS_USERNS_RESTRICTIONS=false
  if [[ "$DISTVER" =~ ^Ubuntu && $DISTMAJOR -ge 23 ]]; then
    HAS_USERNS_RESTRICTIONS=true
  fi

  if [[ $HAS_USERNS_RESTRICTIONS = true || $BAD_HELPER_BINARY = true ]]; then
    SANDBOXPARAM="--no-sandbox"
    print "${COLOR_YELLOW}WARNING${COLOR_RESET} Electron sandboxing disabled."
    print "    See https://discourse.joplinapp.org/t/32160/5 for details."
  fi
fi

# Initially only desktop environments that were confirmed to use desktop files stored in
# `.local/share/desktop` had a desktop file created.
# However some environments don't return a desktop BUT still support these desktop files
# the command check was added to support all Desktops that have support for the
# freedesktop standard
# The old checks are left in place for historical reasons, but
# NO MORE DESKTOP ENVIRONMENTS SHOULD BE ADDED
# If a new environment needs to be supported, then the command check section should be re-thought
if [[ $DESKTOP =~ .*gnome.*|.*kde.*|.*xfce.*|.*mate.*|.*lxqt.*|.*unity.*|.*x-cinnamon.*|.*deepin.*|.*pantheon.*|.*lxde.*|.*i3.*|.*sway.* ]] || [[ `command -v update-desktop-database` ]]; then
  DATA_HOME=${XDG_DATA_HOME:-~/.local/share}
  DESKTOP_FILE_LOCATION="$DATA_HOME/applications"
  # Only delete the desktop file if it will be replaced
  rm -f "$DESKTOP_FILE_LOCATION/appimagekit-joplin.desktop"

  # On some systems this directory doesn't exist by default
  mkdir -p "$DESKTOP_FILE_LOCATION"

  # No spaces or tabs should be used for indentation with Bash heredocs
  cat >> "$DESKTOP_FILE_LOCATION/appimagekit-joplin.desktop" <<-EOF
[Desktop Entry]
Encoding=UTF-8
Name=Joplin
Comment=Joplin for Desktop
Exec=env APPIMAGELAUNCHER_DISABLE=TRUE ${HOME}/.joplin/Joplin.AppImage ${SANDBOXPARAM} %u
Icon=joplin
StartupWMClass=Joplin
Type=Application
Categories=Office;
MimeType=x-scheme-handler/joplin;
X-GNOME-SingleWindow=true // should be removed eventually as it was upstream to be an XDG specification
SingleMainWindow=true
EOF

  # Update application icons
  [[ `command -v update-desktop-database` ]] && update-desktop-database "$DESKTOP_FILE_LOCATION" && update-desktop-database "$DATA_HOME/icons"
  print "${COLOR_GREEN}OK${COLOR_RESET}"
else
  print "${COLOR_RED}NOT DONE, unknown desktop '${DESKTOP}'${COLOR_RESET}"
fi

#-----------------------------------------------------
# FINISH INSTALLATION
#-----------------------------------------------------

# Informs the user that it has been installed
print "${COLOR_GREEN}Joplin version${COLOR_RESET} ${RELEASE_VERSION} ${COLOR_GREEN}installed.${COLOR_RESET}"

# Record version
echo "$RELEASE_VERSION" > ~/.joplin/VERSION

#-----------------------------------------------------
if [[ "$SHOW_CHANGELOG" == true ]]; then
  NOTES=$(wget -qO - https://api.github.com/repos/laurent22/joplin/releases/latest | grep -Po '"body": "\K.*(?=")')
  print "${COLOR_BLUE}Changelog:${COLOR_RESET}\n${NOTES}"
fi

#-----------------------------------------------------
print "Cleaning up..."
rm -rf "$TEMP_DIR"
print "${COLOR_GREEN}OK${COLOR_RESET}"
