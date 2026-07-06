#!/usr/bin/env bash

# OpenCode Budget Maxxer - Installation Script
# Clones the plugin into the global plugins directory and builds it

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Repository URL
REPO_URL="https://github.com/mjyocca/opencode-budget-maxxer.git"
PLUGIN_NAME="opencode-budget-maxxer"

# Helper functions
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    if ! command -v git &> /dev/null; then
        error "git is not installed. Please install git first."
    fi
    
    if ! command -v pnpm &> /dev/null; then
        error "pnpm is not installed. Please install pnpm first: https://pnpm.io/installation"
    fi
    
    success "All prerequisites met"
}

# Detect platform and config directory
get_config_dir() {
    # Check for OPENCODE_CONFIG_DIR override
    if [ -n "$OPENCODE_CONFIG_DIR" ]; then
        echo "$OPENCODE_CONFIG_DIR"
        return
    fi
    
    case "$(uname -s)" in
        Darwin)
            # macOS
            echo "$HOME/Library/Application Support/opencode"
            ;;
        Linux)
            # Linux - check XDG_CONFIG_HOME first
            if [ -n "$XDG_CONFIG_HOME" ]; then
                echo "$XDG_CONFIG_HOME/opencode"
            else
                echo "$HOME/.config/opencode"
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*)
            # Windows (Git Bash, MSYS2, Cygwin)
            if [ -n "$APPDATA" ]; then
                echo "$APPDATA/opencode"
            else
                echo "$HOME/.config/opencode"
            fi
            ;;
        *)
            # Fallback to XDG
            if [ -n "$XDG_CONFIG_HOME" ]; then
                echo "$XDG_CONFIG_HOME/opencode"
            else
                echo "$HOME/.config/opencode"
            fi
            ;;
    esac
}

# Main installation logic
main() {
    echo ""
    echo "OpenCode Budget Maxxer - Installation"
    echo "======================================"
    echo ""
    
    check_prerequisites
    
    # Get config directory
    CONFIG_DIR=$(get_config_dir)
    PLUGINS_DIR="$CONFIG_DIR/plugins"
    PLUGIN_DIR="$PLUGINS_DIR/$PLUGIN_NAME"
    
    info "Config directory: $CONFIG_DIR"
    info "Plugin directory: $PLUGIN_DIR"
    echo ""
    
    # Create plugins directory if it doesn't exist
    if [ ! -d "$PLUGINS_DIR" ]; then
        info "Creating plugins directory..."
        mkdir -p "$PLUGINS_DIR"
    fi
    
    # Check if plugin already exists
    if [ -d "$PLUGIN_DIR" ]; then
        warn "Plugin directory already exists: $PLUGIN_DIR"
        echo ""
        read -p "Do you want to update it? (y/n) " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            info "Updating existing installation..."
            cd "$PLUGIN_DIR"
            git pull
            pnpm install
            pnpm build
            success "Plugin updated successfully"
        else
            info "Skipping installation"
            exit 0
        fi
    else
        # Clone repository
        info "Cloning repository..."
        git clone "$REPO_URL" "$PLUGIN_DIR"
        
        # Install dependencies and build
        info "Installing dependencies..."
        cd "$PLUGIN_DIR"
        pnpm install
        
        info "Building plugin..."
        pnpm build
        
        success "Plugin installed successfully"
    fi
    
    echo ""
    info "Installing TUI plugin..."
    node "$PLUGIN_DIR/scripts/install-tui.mjs"
    
    echo ""
    echo "======================================"
    success "Installation complete!"
    echo ""
    info "Restart OpenCode to activate the plugin"
    info "The budget meter will appear in the sidebar"
    echo ""
}

main "$@"
