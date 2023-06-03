# OPENAI SIMPLE CHATBOT

TODO: ADD DESCRIPTION

## Architecture

TODO: ADD ARCHITECTURE

## Manual Steps (Only Once)

1. Create Systems Manager Parameter in Parameter Store for the OpenAI Key.

   - Log in to your target AWS account.
   - Go to "Systems Manager", and click on "Parameter Store".
   - Create a parameter called `/openai-bot/dev/openai-key`, add the OpenAI Key inside. (Note: if multi-environment deployment is needed, update as needed).

2. Deploy with the `deploy.sh` command (run locally at root of the repository).

## LICENSE

Copyright 2023 Santiago Garcia Arango
