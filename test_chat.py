import asyncio
import websockets
import json

async def test_chat():
    """
    Test the chat service via WebSocket
    """
    # Configuration
    user_id = "test"
    conversation_id = "test-conv-001"
    
    # Get the file_id from your uploaded document
    # You can leave empty to search all docs for this user
    file_ids = ""  # or specific file_id like "abe6ef55-b81c-4beb-b10d-2bfffca5fa1f"
    
    # WebSocket URL
    url = f"ws://localhost:8003/chat/{user_id}/{conversation_id}/{file_ids}"
    
    print(f"Connecting to: {url}")
    
    try:
        async with websockets.connect(url) as websocket:
            print("✅ Connected to chat service!")
            
            # Test questions about your indexed documents
            questions = [
                "What technical support options are available?",
                "What is the warranty period?",
            ]
            
            for question in questions:
                print(f"\n🔹 Question: {question}")
                
                # Send question
                await websocket.send(question)
                print("📤 Question sent, waiting for response...")
                
                # Receive answer
                try:
                    while True:
                        response = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                        
                        try:
                            # Parse JSON response
                            msg = json.loads(response)
                            
                            if msg.get("reporter") == "input_message":
                                # Echo of our question
                                print(f"✓ Question confirmed: {msg.get('message', '')[:50]}...")
                            
                            elif msg.get("reporter") == "output_message":
                                msg_type = msg.get("type")
                                
                                if msg_type == "answer":
                                    # This is the actual answer
                                    answer = msg.get("message", "")
                                    print(f"\n💬 Answer:\n{answer}\n")
                                    print("-" * 80)
                                    break
                                
                                elif msg_type == "start_message":
                                    print("✓ Chat session started")
                                
                                elif msg_type == "stop_message":
                                    print("✓ Chat session stopped")
                                    break
                                
                                elif msg_type == "disconnect_message":
                                    print("✓ Client disconnected")
                                    break
                        
                        except json.JSONDecodeError:
                            # Not JSON, might be raw text
                            print(f"Raw response: {response}")
                
                except asyncio.TimeoutError:
                    print("\n⏱️ Timeout waiting for response")
                    break
                
                # Wait a bit between questions
                await asyncio.sleep(1)
            
            print("\n✅ All questions completed!")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nTroubleshooting:")
        print("1. Ensure chat service is running: docker ps --filter 'name=chat'")
        print("2. Check logs: docker logs minima-aws-mnma-chat-1")
        print("3. Verify you have documents indexed in Qdrant")

if __name__ == "__main__":
    print("🚀 Starting chat service test...\n")
    asyncio.run(test_chat())
