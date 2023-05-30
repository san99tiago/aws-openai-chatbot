import os

# External dependencies
from fastapi import FastAPI, Response, status

# Own dependencies
from src.openai_chatbot import chatbot_entrypoint


app = FastAPI(
    description="FastAPI to expose OpenAI Chatbot Solutions",
    version="0.1.0",
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


@app.get("/chatbot")
def get_chatbot(response: Response) -> dict:
    try:
        print("Initializing chatbot processing")
        chatbot_response = chatbot_entrypoint()
    except Exception as e:
        print(f"Error on chatbot processing {e}")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {
            "Error": "There was a handled exception in the processing of the chatbot request",
            "Details": str(e),
        }
    return {"Response": chatbot_response}
