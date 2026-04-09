from qdrant_client import QdrantClient
import os

host = os.environ.get('QDRANT_BOOTSTRAP', 'qdrant')
print(f"Connecting to Qdrant at: {host}")

try:
    client = QdrantClient(host=host)
    collections = client.get_collections()
    print(f"✓ Successfully connected to Qdrant!")
    print(f"Collections: {[c.name for c in collections.collections]}")
except Exception as e:
    print(f"✗ Connection failed: {e}")
