import yaml
import logging
import asyncio
import uuid
from typing import Optional
from fastapi import FastAPI
from fastapi import WebSocket
from async_queue import AsyncQueue
from fastapi.middleware.cors import CORSMiddleware
from websocket_logger import WebSocketLogger

import async_socket_to_chat
import async_question_to_answer
import async_answer_to_socket

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chat")

# Initialize WebSocket logger
ws_logger = WebSocketLogger()

@app.websocket("/chat/{userid}/{conversation_id}/{files_ids}")
async def chat_client(websocket: WebSocket,  userid: str, conversation_id: str, files_ids: Optional[str]):
    """
    WebSocket endpoint to handle real-time chat communication.

    Args:
        websocket (WebSocket): WebSocket connection object.
        userid (str): Unique identifier for the user.
        conversation_id (str): Unique identifier for the conversation.
        files_ids (str): Comma-separated list of file identifiers.
    """
    # Generate session ID for this WebSocket connection
    session_id = str(uuid.uuid4())
    
    logger.info(f"Chat client connected: {userid}")
    
    # Log connection start
    try:
        await ws_logger.log_connection_start(
            session_id=session_id,
            user_id=userid,
            conversation_id=conversation_id,
            file_ids=files_ids,
            ip_address=websocket.client.host if websocket.client else None
        )
    except Exception as e:
        logger.error(f"Failed to log WebSocket connection start: {e}")
    
    if files_ids:
        if ',' in files_ids:
            files = files_ids.split(",")
        else:
            files = [files_ids]
    else:
        files=[]
    logger.info(f"Files: {files}")

    with open('config.yml', 'r') as file:
        config = yaml.safe_load(file)   
    
    question_queue = AsyncQueue()
    response_queue = AsyncQueue()
    
    data_obj = {
        "conversation_id": conversation_id,
        "user_id": userid,
        "files": files
    }
    logger.info(f"Data object: {data_obj}")

    answer_to_socket_promise = async_answer_to_socket.loop(response_queue, websocket)
    question_to_answer_promise = async_question_to_answer.loop(question_queue, response_queue, config, data_obj)
    socket_to_chat_promise = async_socket_to_chat.loop(websocket, question_queue, response_queue)

    try:
        await asyncio.gather(
            answer_to_socket_promise,
            question_to_answer_promise,
            socket_to_chat_promise,
        )
        # Log normal connection end
        await ws_logger.log_connection_end(session_id=session_id, status="normal")
    except Exception as e:
        # Log error connection end
        logger.error(f"WebSocket error: {e}", exc_info=True)
        await ws_logger.log_connection_end(
            session_id=session_id,
            status="error",
            error_message=str(e)
        )
        await ws_logger.log_error(
            session_id=session_id,
            error_message=str(e),
            exception_type=type(e).__name__,
            stack_trace=str(e)
        )
        raise


@app.websocket("/chat/{userid}/{conversation_id}/")
async def chat_client(websocket: WebSocket,  userid: str, conversation_id: str):
    """
    WebSocket endpoint to handle real-time chat communication.

    Args:
        websocket (WebSocket): WebSocket connection object.
        userid (str): Unique identifier for the user.
        conversation_id (str): Unique identifier for the conversation.
    """
    logger.info(f"Chat client connected: {userid}")
    with open('config.yml', 'r') as file:
        config = yaml.safe_load(file)   
    
    data_obj = {
        "conversation_id": conversation_id,
        "user_id": userid,
        "files": []
    }
    logger.info(f"Data object: {data_obj}")

    question_queue = AsyncQueue()
    response_queue = AsyncQueue()

    answer_to_socket_promise = async_answer_to_socket.loop(response_queue, websocket)
    question_to_answer_promise = async_question_to_answer.loop(question_queue, response_queue, config, data_obj)
    socket_to_chat_promise = async_socket_to_chat.loop(websocket, question_queue, response_queue)

    await asyncio.gather(
        answer_to_socket_promise,
        question_to_answer_promise,
        socket_to_chat_promise,
    )