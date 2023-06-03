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

    answer = ask_chatbot()
    logging.info(answer)

    return {"statusCode": 200, "body": answer}  # 'CSV loaded into dataframe'


# TODO: Update code with decent processing (client's processing not optimal yet... in progress)...
def ask_chatbot():
    answer = "Dummy answer"
    return answer
