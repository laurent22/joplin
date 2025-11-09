#!/bin/bash

# Lumina Notes Launcher Script
# This script helps you quickly start Lumina Notes

set -e

echo "🌟 Lumina Notes Launcher"
echo "========================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "lumina.config.js" ]; then
    echo -e "${RED}Error: lumina.config.js not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Function to check if dependencies are installed
check_dependencies() {
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Dependencies not found. Installing...${NC}"
        npm install
    else
        echo -e "${GREEN}✓ Dependencies installed${NC}"
    fi
}

# Function to check if project is built
check_build() {
    if [ ! -d "packages/app-desktop/dist" ]; then
        echo -e "${YELLOW}Project not built. Building...${NC}"
        npm run buildParallel
    else
        echo -e "${GREEN}✓ Project built${NC}"
    fi
}

# Parse command line arguments
MODE="normal"
SKIP_CHECKS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            MODE="dev"
            shift
            ;;
        --debug)
            MODE="debug"
            shift
            ;;
        --build)
            MODE="build"
            shift
            ;;
        --skip-checks)
            SKIP_CHECKS=true
            shift
            ;;
        --help)
            echo "Usage: ./lumina-start.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dev           Run in development mode with auto-reload"
            echo "  --debug         Run with debug logging and dev tools"
            echo "  --build         Force rebuild before starting"
            echo "  --skip-checks   Skip dependency and build checks"
            echo "  --help          Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./lumina-start.sh                 # Normal start"
            echo "  ./lumina-start.sh --dev           # Development mode"
            echo "  ./lumina-start.sh --debug         # Debug mode"
            echo "  ./lumina-start.sh --build         # Rebuild and start"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Run with --help for usage information"
            exit 1
            ;;
    esac
done

# Run checks unless skipped
if [ "$SKIP_CHECKS" = false ]; then
    echo -e "${BLUE}Checking dependencies...${NC}"
    check_dependencies
    echo ""

    echo -e "${BLUE}Checking build...${NC}"
    check_build
    echo ""
fi

# Handle different modes
case $MODE in
    "build")
        echo -e "${BLUE}Building Lumina Notes...${NC}"
        npm run buildParallel
        echo -e "${GREEN}✓ Build complete${NC}"
        echo ""
        echo -e "${BLUE}Starting Lumina Notes...${NC}"
        cd packages/app-desktop
        npm start
        ;;
    "dev")
        echo -e "${BLUE}Starting Lumina Notes in development mode...${NC}"
        echo -e "${YELLOW}Tip: Run 'npm run watch' in another terminal for auto-reload${NC}"
        echo ""
        cd packages/app-desktop
        npm start -- --env dev --log-level debug
        ;;
    "debug")
        echo -e "${BLUE}Starting Lumina Notes in debug mode...${NC}"
        echo ""
        cd packages/app-desktop
        npm start -- --env dev --log-level debug --open-dev-tools
        ;;
    "normal")
        echo -e "${BLUE}Starting Lumina Notes...${NC}"
        echo ""
        cd packages/app-desktop
        npm start
        ;;
esac
