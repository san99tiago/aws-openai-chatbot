#!/bin/bash
set -x

# Deploy CDK Stack
cd ./cdk-ec2
npm install .
cdk deploy --require-approval never

echo "REMEMBER TO RUN AGAIN USER-DATA (OR DESTROY EC2 INSTANCE TO RECREATE IT)"
