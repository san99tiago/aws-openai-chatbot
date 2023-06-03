#!/bin/bash
set -x

# Prepare Python dependencies for Lambda Function (Layers)
pip install -r ./DEPRECATED-src-lambda/requirements-openai.txt --target=./DEPRECATED-layer-openai/python
pip install -r ./DEPRECATED-src-lambda/requirements-pandas.txt --target=./DEPRECATED-layer-pandas/python
pip install -r ./DEPRECATED-src-lambda/requirements-extras.txt --target=./DEPRECATED-layer-extras/python

# Deploy CDK Stack
cd ./DEPRECATED-cdk-lambda
npm install .
cdk deploy --require-approval never
