#!/bin/bash

# Check if virtual environment exists; if not, create it
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate the virtual environment
echo "Activating virtual environment..."
source "$(dirname "$0")/venv/bin/activate"

# Install required packages from updated requirements.txt
echo "Installing required packages..."
pip install -r requirements.txt

# Upgrade pip to the latest version
echo "Upgrading pip..."
pip install --upgrade pip

read -p "Press any key to continue..."