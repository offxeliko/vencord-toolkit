#!/bin/bash
# Vencord Toolkit installer
# Run from your Vencord root directory: bash src/userplugins/toolkit/install.sh
# Or: curl -sL https://raw.githubusercontent.com/offxeliko/vencord-toolkit/main/install.sh | bash

set -e

REPO="https://github.com/offxeliko/vencord-toolkit.git"
TARGET="src/userplugins/toolkit"

# Find Vencord root
if [ -f "package.json" ] && grep -q "vencord" package.json 2>/dev/null; then
    ROOT="."
elif [ -f "../../package.json" ] && grep -q "vencord" ../../package.json 2>/dev/null; then
    ROOT="../.."
else
    echo "Error: Run this from your Vencord root directory"
    exit 1
fi

cd "$ROOT"

if [ -d "$TARGET" ]; then
    echo "Updating Toolkit..."
    cd "$TARGET" && git pull
    cd "$ROOT"
else
    echo "Installing Toolkit..."
    git clone "$REPO" "$TARGET"
fi

echo "Building Vencord..."
pnpm build

echo "Done! Restart Discord and enable Toolkit in Vencord settings."
