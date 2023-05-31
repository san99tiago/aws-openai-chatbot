#!/bin/bash

# Enable extra logging
set -x

# Refresh environment variables
source /etc/profile

# Install and Initialize SSM Agent
echo "----- Initializing SSM Agent -----"
sudo yum install -y https://s3.region.amazonaws.com/amazon-ssm-region/latest/linux_amd64/amazon-ssm-agent.rpm
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent

# Install Instance Connect
sudo yum install ec2-instance-connect

# Create the necessary folders and permissions
mkdir /home/api
sudo chmod 775 /home/api

# Copy the necessary S3 files for OpenAI Chatbot execution
echo "----- Downloading source code from S3 bucket -----"
aws s3 cp "s3://${BUCKET_NAME}/src/" /home/api/src/ --recursive

# Show the downloaded files
echo "----- Source code files are -----"
ls -lrt /home/api/src/

# Install dependencies
echo "----- Installing Python dependencies -----"
cd /home/api/
pip3 install -r src/requirements.txt

# Run the FastAPI Server (automatically becomes background process)
uvicorn src.main:app --host 0.0.0.0 --port 8080 --reload