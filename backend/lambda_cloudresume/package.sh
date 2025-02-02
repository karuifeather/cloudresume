#!/bin/bash
set -e 

# Define package name
PACKAGE_NAME="lambda.zip"

# Remove any existing package
rm -f $PACKAGE_NAME
rm -rf package  # Clean previous build

# Create a new package directory
mkdir package

# Install dependencies directly from Poetry into package/
echo "Installing dependencies with Poetry..."
poetry run pip install --no-deps --target package $(poetry export -f requirements.txt --without-hashes | grep -v "^-e")

# Move into the package directory and zip dependencies
cd package
zip -r9 ../$PACKAGE_NAME . 

# Go back to the root directory
cd ..

# Add Lambda function code to the zip
echo "Adding Lambda function code..."
zip -g $PACKAGE_NAME app.py

echo "Lambda package ($PACKAGE_NAME) created successfully."
