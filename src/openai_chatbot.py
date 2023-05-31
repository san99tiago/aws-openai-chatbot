# Built in dependencies
import os
import io
import logging

# External dependencies
import boto3
import pandas
import openai
from openai.embeddings_utils import distances_from_embeddings


def chatbot_entrypoint():
    openai.api_key = os.environ.get("OPENAI_KEY", "")

    answer = "Dummy answer"
    # answer = askChatbot()
    logging.info(answer)

    return {"statusCode": 200, "body": answer}  # 'CSV loaded into dataframe'
