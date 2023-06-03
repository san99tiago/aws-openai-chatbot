# Built in dependencies
import os
import io

# External dependencies
import boto3
import pandas
import openai
from openai.embeddings_utils import distances_from_embeddings


def chatbot_entrypoint(event, context):
    print(event)
    print(context)

    openai.api_key = os.environ.get("OPENAI_KEY", "")

    # answer = askChatbot()
    answer = "Dummy answer"
    print(answer)

    return {"statusCode": 200, "body": answer}  # 'CSV loaded into dataframe'

# TODO: Update code with decent processing (client's processing not optimal yet).
