#!/usr/bin/env python3
"""
Script to purge duplicate messages from SQS queue.
Use this to clean up the queue when files have been indexed multiple times.
"""
import boto3
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def purge_queue():
    """Purge all messages from the SQS queue"""
    region = os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
    queue_name = os.getenv('AWS_SQS_QUEUE', 'product-genius-queue')
    
    # Create SQS client
    sqs = boto3.client(
        'sqs',
        region_name=region,
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
    )
    
    try:
        # Get queue URL
        response = sqs.get_queue_url(QueueName=queue_name)
        queue_url = response['QueueUrl']
        
        print(f"Queue URL: {queue_url}")
        
        # Get approximate number of messages
        attrs = sqs.get_queue_attributes(
            QueueUrl=queue_url,
            AttributeNames=['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible']
        )
        
        visible = attrs['Attributes'].get('ApproximateNumberOfMessages', 0)
        not_visible = attrs['Attributes'].get('ApproximateNumberOfMessagesNotVisible', 0)
        
        print(f"\nMessages in queue:")
        print(f"  Visible: {visible}")
        print(f"  In-flight: {not_visible}")
        print(f"  Total: {int(visible) + int(not_visible)}")
        
        # Ask for confirmation
        confirmation = input("\nDo you want to purge ALL messages from this queue? (yes/no): ")
        
        if confirmation.lower() == 'yes':
            # Purge the queue
            sqs.purge_queue(QueueUrl=queue_url)
            print("\n✓ Queue purged successfully!")
            print("Note: It may take up to 60 seconds for the purge to complete.")
        else:
            print("\nPurge cancelled.")
    
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")

if __name__ == "__main__":
    print("=" * 60)
    print("SQS Queue Purge Utility")
    print("=" * 60)
    purge_queue()
