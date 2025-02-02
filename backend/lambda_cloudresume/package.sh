#!/bin/bash
set -e

# Define package name
PACKAGE_NAME="lambda.zip"

# Remove any existing package and previous build
rm -f $PACKAGE_NAME
rm -rf package

# Create a new package directory
mkdir package

# Install dependencies directly into the package directory
echo "Installing dependencies with Poetry..."
poetry self add poetry-plugin-export
poetry export --without-hashes --python-version 3.11 --without dev -f requirements.txt -o requirements.txt
pip install --target package -r requirements.txt

# Move into the package directory and zip dependencies
cd package
zip -r9 ../$PACKAGE_NAME .

# Go back to the root directory
cd ..

# Add Lambda function code to the zip
echo "Adding Lambda function code..."
zip -g $PACKAGE_NAME app.py

echo "Lambda package ($PACKAGE_NAME) created successfully."
