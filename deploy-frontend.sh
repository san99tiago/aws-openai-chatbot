#!/bin/bash
set -x

# Deploy CDK Stack
cd ./cdk-frontend
npm install .
cdk deploy --require-approval never

echo "REMEMBER TO UPDATE THE BACKEND API VARIABLE THAT THE FRONTEND CONSUMES, IF IT CHANGES"
