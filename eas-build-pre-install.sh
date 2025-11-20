#!/usr/bin/env bash

# This script runs before EAS Build installs dependencies
# It ensures we use npm install instead of npm ci for better compatibility

set -e

echo "🔧 EAS Build pre-install hook"
echo "Using npm install with legacy-peer-deps for better compatibility"
