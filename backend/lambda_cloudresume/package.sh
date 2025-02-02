#!/bin/bash
set -e

# Remove any existing zip file
rm -f lambda.zip

# Package the Lambda function code into lambda.zip
zip -r lambda.zip app.py
