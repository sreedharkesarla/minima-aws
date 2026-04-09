#!/usr/bin/env python3
"""Test Qdrant deletion functionality"""
import os
import sys
from qdrant_client import QdrantClient

def count_points_for_file(file_id):
    """Count how many Qdrant points exist for a specific file_id"""
    client = QdrantClient(host=os.environ.get('QDRANT_BOOTSTRAP', 'qdrant'))
    
    # Count points using the count API
    result = client.count(
        collection_name='TM',
        count_filter={
            "must": [
                {
                    "key": "metadata.file_id",
                    "match": {"value": file_id}
                }
            ]
        }
    )
    
    return result.count

if __name__ == "__main__":
    if len(sys.argv) > 1:
        file_id = sys.argv[1]
    else:
        # Default test file
        file_id = "1e54da99-5726-4863-aacf-a2d279bb0e29"
    
    count = count_points_for_file(file_id)
    print(f"File {file_id} has {count} points in Qdrant")
