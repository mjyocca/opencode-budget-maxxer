#!/usr/bin/env bash

# OpenCode Budget Maxxer - Uninstallation Script
# Removes the plugin from the global plugins directory and tui.json

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Detect platform and config directory
get_config_dir() {
    # Check for OPENCODE_CONFIG_DIR override
    if [ -n "$OPENCODE_CONFIG_DIR" ]; then
        echo "$OPENCODE_CONFIG_DIR"
        return
    fi
    
    # Check for XDG_CONFIG_HOME (works on all platforms)
    if [ -n "$XDG_CONFIG_HOME" ]; then
        echo "$XDG_CONFIG_HOME/opencode"
        return
    fi
    
    # Platform-specific defaults
    case "$(uname -s)" in
        Darwin)
            # macOS
            echo "$HOME/Library/Application Support/opencode"
            ;;
        Linux)
            # Linux
            echo "$HOME/.config/opencode"
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
            # Fallback
            echo "$HOME/.config/opencode"
            ;;
    esac
}

# Main uninstallation logic
main() {
    echo ""
    echo "OpenCode Budget Maxxer - Uninstallation"
    echo "========================================"
    echo ""
    
    # Get config directory
    CONFIG_DIR=$(get_config_dir)
    PLUGIN_DIR="$CONFIG_DIR/plugins/$PLUGIN_NAME"
    
    info "Config directory: $CONFIG_DIR"
    info "Plugin directory: $PLUGIN_DIR"
    echo ""
    
    # Check if plugin directory exists
    if [ ! -d "$PLUGIN_DIR" ]; then
        warn "Plugin directory not found: $PLUGIN_DIR"
        info "Server plugin may not be installed"
    else
        # Remove server plugin registration first (while scripts still exist)
        if [ -f "$PLUGIN_DIR/scripts/uninstall-server.mjs" ]; then
            info "Removing server plugin registration..."
            node "$PLUGIN_DIR/scripts/uninstall-server.mjs"
        fi
        
        # Remove TUI plugin registration (while scripts still exist)
        if [ -f "$PLUGIN_DIR/scripts/uninstall-tui.mjs" ]; then
            info "Removing TUI plugin registration..."
            node "$PLUGIN_DIR/scripts/uninstall-tui.mjs"
        fi
        
        # Remove plugin directory
        info "Removing plugin directory..."
        rm -rf "$PLUGIN_DIR"
        success "Plugin directory removed"
    fi
    
    echo ""
    echo "========================================"
    success "Uninstallation complete!"
    echo ""
    info "Restart OpenCode to complete the removal"
    echo ""
}

main "$@"
