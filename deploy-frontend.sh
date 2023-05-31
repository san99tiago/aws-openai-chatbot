#!/bin/bash

set -x

# Deploy CDK Stack
cd ./cdk-frontend
cdk deploy --require-approval never

