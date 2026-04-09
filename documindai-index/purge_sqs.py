#!/usr/bin/env python3
import boto3
import os

def purge_queue():
    region = os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
    queue_name = os.getenv('AWS_SQS_QUEUE')
    
    sqs = boto3.client(
        'sqs',
        region_name=region,
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
    )
    
    try:
        queue_url = sqs.get_queue_url(QueueName=queue_name)['QueueUrl']
        print(f"Queue URL: {queue_url}")
        
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
        
        print("\n🗑️  Purging queue...")
        sqs.purge_queue(QueueUrl=queue_url)
        print("✓ Queue purged successfully!")
        print("Note: It may take up to 60 seconds for the purge to complete.")
    
    except Exception as e:
        print(f"✗ Error: {str(e)}")

if __name__ == "__main__":
    purge_queue()
