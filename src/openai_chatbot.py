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

    # answer = "Dummy answer"
    answer = askChatbot()
    logging.info(answer)

    return {"statusCode": 200, "body": answer}  # 'CSV loaded into dataframe'


# TODO: REFACTOR SOURCE CODE FOR CHATBOT (THIS IS A TEMPLATE)
def getUserInfo():
    userDetails = ["Belgium", 2022]
    userQuestion = "What forms to submit?"

    return userDetails, userQuestion


def readS3Csv(bucketName, datasetFile):
    s3 = boto3.client("s3")
    csv_obj = s3.get_object(Bucket=bucketName, Key=datasetFile)
    body = csv_obj["Body"].read().decode("utf-8")
    dataframe = pandas.read_csv(io.StringIO(body))

    return dataframe


def prepareDataset(userDetails):
    desiredCountry = userDetails[0]
    desiredYear = userDetails[1]

    # extract .csv file
    bucketName = os.environ.get("BUCKET_NAME", "")
    datasetFile = "datasets/belgium_2022_raw_dataset.csv"
    dataframe = readS3Csv(bucketName, datasetFile)

    # select all rows (:), and the first 4 columns (0:4)
    filteredDataframe = dataframe.iloc[:, 0:4]

    # filter the data based on the year and country
    filteredDataframe = filteredDataframe[filteredDataframe["Year"] == desiredYear]
    filteredDataframe = filteredDataframe[
        filteredDataframe["Country"] == desiredCountry
    ]

    # removes any row in which at least one null value is present
    filteredDataframe = filteredDataframe.dropna()

    # save dataframe to CSV, excluding index (index = False)
    # filteredDataframe.to_csv('belgium_2022_data_set.csv', index = False)

    return filteredDataframe


def getQuestionAnswerPair(dataframe, index):
    question = dataframe["Question"].iloc[index]
    answer = dataframe["Answer"].iloc[index]
    questionAnswerPair = [question, answer]

    return questionAnswerPair


def createContextWithInstructions(context):
    contextVisibilityInstruction = "Keep in mind, the context provided in the pre-prompt isn't visible to the user. Therefore, when answering the question, ensure your response is comprehensive and stands on its own, without requiring reference to the unseen context."
    instruction = (
        "Answer the question based on the context below, and if the question can't be answered based on the context, say \"I don't know.\" \n"
        + contextVisibilityInstruction
        + "\n\n\n"
    )
    contextWithInstructions = instruction + "Context:\n\n"

    for i in range(len(context)):
        questionFromDataset = context[i][0]
        answerFromDataset = context[i][1]
        contextWithInstructions = (
            contextWithInstructions
            + "Q"
            + str(i + 1)
            + ": "
            + questionFromDataset
            + "\n"
        )
        contextWithInstructions = (
            contextWithInstructions
            + "A"
            + str(i + 1)
            + ": "
            + answerFromDataset
            + "\n\n"
        )
    contextWithInstructions = contextWithInstructions + "\n\n"

    return contextWithInstructions


def createContextFromDataframe(question, dataframe, numberOfContextQuestions):
    # 1. create the embeddings for the question and dataframe questions
    questionEmbeddings = openai.Embedding.create(
        input=question, engine="text-embedding-ada-002"
    )["data"][0]["embedding"]
    dataframe["embeddings"] = dataframe.Question.apply(
        lambda x: openai.Embedding.create(input=x, engine="text-embedding-ada-002")[
            "data"
        ][0]["embedding"]
    )

    # 2. compute the distance between the questionEmbeddings and every answer in the dataframe
    dataframeEmbeddings = dataframe["embeddings"].values
    dataframe["distances"] = distances_from_embeddings(
        questionEmbeddings, dataframeEmbeddings, distance_metric="cosine"
    )

    # 3. get the closest question-answer pairs which will constitute the context
    sortedDataframe = dataframe.sort_values("distances", ascending=True)
    context = []
    for i in range(numberOfContextQuestions):
        questionAnswerPair = getQuestionAnswerPair(sortedDataframe, i)
        context.append(questionAnswerPair)

    contextWithInstructions = createContextWithInstructions(context)

    return contextWithInstructions


def sendQuery(context, question):
    # 1. your query
    query = context + question

    # 2. send a request to ChatGPT
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo", messages=[{"role": "user", "content": query}]
    )

    # 3. extract and print the response
    answer = response["choices"][0]["message"]["content"]

    return answer


def askChatbot():
    # 1. get the info from the user interface
    logging.info("Getting user Info")
    userDetails, userQuestion = getUserInfo()

    # 2. prepare the dataset based on the user's details
    logging.info("Preparing dataset")
    dataframe = prepareDataset(userDetails)

    # 3. create the context from the prepared dataframe and the user's question
    logging.info("Create the context")
    numberOfContextQuestions = 5
    context = createContextFromDataframe(
        userQuestion, dataframe, numberOfContextQuestions
    )
    logging.info(f"Context: {context}")

    # 4. send a query to the chatbot with the given context and user's question
    logging.info("Sending query")
    answer = sendQuery(context, userQuestion)

    return answer
