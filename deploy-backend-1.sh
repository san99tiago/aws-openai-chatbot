#!/bin/bash

set -x

# Deploy CDK Stack
cd ./cdk-ec2
cdk deploy --require-approval never
