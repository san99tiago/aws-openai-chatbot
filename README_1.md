# OPENAI SIMPLE CHATBOT

TODO: ADD DESCRIPTION

## Architecture

TODO: ADD ARCHITECTURE

## Manual Steps (Only Once)

1. Create Systems Manager Parameter in Parameter Store for the OpenAI Key.

   - Log in to your target AWS account.
   - Go to "Systems Manager", and click on "Parameter Store".
   - Create a parameter called `/openai-chatbot/dev/openai-key`, add the OpenAI Key inside. (Note: if multi-environment deployment is needed, update as needed).

2. Deploy CDK Stacks
   - Deploy Backend with: `bash deploy-backend-1.sh`
   - Deploy Frontend with: `bash deploy-frontend.sh`

## LICENSE

Copyright 2023 Santiago Garcia Arango
