import json
import asyncio
import logging
from indexer import Indexer
from async_queue import AsyncQueue
from concurrent.futures import ThreadPoolExecutor
from sqs import sqs

logger = logging.getLogger(__name__)
executor = ThreadPoolExecutor()

async def loop(async_queue: AsyncQueue, indexer: Indexer):
    """
    Continuously process files from the async_queue, index them, and store vectors into vectors database.
    If the queue is empty, it sleeps for a short period before checking again.

    Args:
        async_queue (AsyncQueue): The queue to dequeue file paths from.
        indexer (Indexer): The indexer to process file and store vectors to database.

    Raises:
        Exception: If an error occurs during the file processing or metadata storage.
    """
    while True:
        if async_queue.size() == 0:
            await asyncio.sleep(0.1)
            continue
        
        message_data = None
        try:
            message_data = await async_queue.dequeue()
            logger.info(f"Processing message: {message_data}")
            
            # Extract message body and SQS metadata
            if isinstance(message_data, dict) and 'body' in message_data:
                message_body = message_data['body']
                receipt_handle = message_data['receipt_handle']
                queue_name = message_data['queue_name']
            else:
                # Fallback for old format (encoded bytes)
                message_body = message_data.decode('utf-8') if isinstance(message_data, bytes) else message_data
                receipt_handle = None
                queue_name = None
            
            parsed = json.loads(message_body)
            loop_obj = asyncio.get_running_loop()
            
            # Run indexing synchronously to ensure completion
            await loop_obj.run_in_executor(executor, indexer.index_file, parsed)
            
            # Only delete from SQS after successful indexing
            if receipt_handle and queue_name:
                sqs.delete_message(queue_name, receipt_handle)
                logger.info(f"Successfully processed and deleted message from SQS")
            
        except Exception as e:
            logger.error(f"Error in loop: {e}")
            if message_data:
                logger.error(f"Failed to process message: {message_data}")
            # Message will remain in SQS and become visible again after visibility timeout