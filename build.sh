#!/bin/bash

# Simple build script - replaces webpack
# Copies source files to public/ directory

set -e

PUBLIC_DIR="public"
SRC_DIR="src"

echo "Building wda-ring plugin..."

# Clean public directory
rm -rf "$PUBLIC_DIR"
mkdir -p "$PUBLIC_DIR/assets/js"
mkdir -p "$PUBLIC_DIR/assets/i18n"
mkdir -p "$PUBLIC_DIR/assets/img"
mkdir -p "$PUBLIC_DIR/sounds"

# Copy JavaScript files
cp "$SRC_DIR/assets/js/"*.js "$PUBLIC_DIR/assets/js/"

# Copy HTML
cp "$SRC_DIR/index.html" "$PUBLIC_DIR/"

# Copy manifest
cp "$SRC_DIR/manifest.json" "$PUBLIC_DIR/"

# Copy i18n (if exists and has files)
if [ -d "$SRC_DIR/assets/i18n" ] && [ "$(ls -A $SRC_DIR/assets/i18n 2>/dev/null)" ]; then
    cp -r "$SRC_DIR/assets/i18n/"* "$PUBLIC_DIR/assets/i18n/" 2>/dev/null || true
fi

# Copy images (if exists and has files)
if [ -d "$SRC_DIR/assets/img" ] && [ "$(ls -A $SRC_DIR/assets/img 2>/dev/null)" ]; then
    cp -r "$SRC_DIR/assets/img/"* "$PUBLIC_DIR/assets/img/" 2>/dev/null || true
fi

# Copy sounds (if exists and has files)
if [ -d "$SRC_DIR/assets/sounds" ] && [ "$(ls -A $SRC_DIR/assets/sounds 2>/dev/null)" ]; then
    cp -r "$SRC_DIR/assets/sounds/"* "$PUBLIC_DIR/sounds/" 2>/dev/null || true
fi

echo "Build complete! Output in $PUBLIC_DIR/"
