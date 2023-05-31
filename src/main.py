import os
import logging

# External dependencies
from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware

# Own dependencies
from src.openai_chatbot import chatbot_entrypoint


app = FastAPI(
    description="FastAPI to expose OpenAI Chatbot Solutions",
    version="0.1.0",
)

# Enable wide allowed CORS (for external API consumers)
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/")
def get_root() -> dict:
    return {
        "Message": "Simple OpenAI API wrapper for Chatbot integration",
        "BUCKET_NAME": os.environ.get("BUCKET_NAME", "not-found"),
    }


@app.get("/status")
def get_status() -> dict:
    return {"Status": "Healthy"}


@app.post("/chatbot")
def post_chatbot(body: dict, response: Response) -> dict:
    logging.info(f"Body of the request is {body}")
    try:
        logging.info("Initializing chatbot processing")
        chatbot_response = chatbot_entrypoint()
    except Exception as e:
        logging.info(f"Error on chatbot processing {e}")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {
            "Error": "There was a handled exception in the processing of the chatbot request",
            "Details": str(e),
        }
    return {"Response": chatbot_response}
