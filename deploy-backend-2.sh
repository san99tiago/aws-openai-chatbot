#!/bin/bash

set -x

# Prepare Python dependencies for Lambda Function (Layers)
pip install -r ./src-lambda/requirements-openai.txt --target=./layer-openai/python
pip install -r ./src-lambda/requirements-pandas.txt --target=./layer-pandas/python
pip install -r ./src-lambda/requirements-extras.txt --target=./layer-extras/python

# Deploy CDK Stack
cd ./cdk-lambda
cdk deploy --require-approval never
