"""
Web Server for Real-time Transcription with Question Detection
FastAPI + WebSocket for live updates + React Frontend
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from typing import List
import asyncio
import json
from datetime import datetime
import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from services.question_detector import question_detector, question_answerer
from config.settings import FRONTEND_BUILD_PATH, WEB_SERVER_HOST, WEB_SERVER_PORT

app = FastAPI()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error sending to client: {e}")
                disconnected.append(connection)

        # Remove disconnected clients
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)


manager = ConnectionManager()

# Check if React build exists
FRONTEND_EXISTS = os.path.exists(FRONTEND_BUILD_PATH)

if FRONTEND_EXISTS:
    # Serve static files from React build
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_BUILD_PATH, "assets")), name="assets")
    print(f"✓ Serving React frontend from {FRONTEND_BUILD_PATH}")
else:
    print(f"⚠️  React build not found at {FRONTEND_BUILD_PATH}")
    print("   Run 'cd frontend && npm run build' to build the React app")


@app.get("/")
async def get_home():
    """Serve the React frontend or fallback HTML"""
    if FRONTEND_EXISTS:
        return FileResponse(os.path.join(FRONTEND_BUILD_PATH, "index.html"))
    else:
        # Fallback to simple HTML if React build doesn't exist
        return {
            "message": "React frontend not built yet",
            "instructions": "Run 'cd frontend && npm install && npm run build' to build the frontend"
        }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def detect_question_async(text: str, timestamp: str, source: str = "user"):
    """Run question detection in background without blocking"""
    try:
        # Run question detection (synchronous function) with source label
        question_data = await asyncio.to_thread(question_detector.detect_question, text, timestamp, source)

        if question_data:
            # Send detected question to frontend
            await manager.broadcast({
                "type": "question",
                "question": question_data["question"],
                "timestamp": question_data["timestamp"],
                "context": question_data["context"]
            })
    except Exception as e:
        print(f"Error in background question detection: {e}")


@app.post("/transcript")
async def receive_transcript(data: dict):
    """
    Receive transcript from the transcription service
    Format: {"text": str, "timestamp": str, "confidence": float, "source": str}
    """
    text = data.get("text", "")
    timestamp = data.get("timestamp", datetime.now().strftime("%H:%M:%S"))
    confidence = data.get("confidence")
    source = data.get("source", "user")  # "user" or "system"

    # Send transcript to frontend IMMEDIATELY (non-blocking)
    await manager.broadcast({
        "type": "transcript",
        "text": text,
        "timestamp": timestamp,
        "confidence": confidence,
        "source": source
    })

    # Run question detection in background without blocking the response
    asyncio.create_task(detect_question_async(text, timestamp, source))

    # Return immediately without waiting for question detection
    return {"status": "ok"}


@app.post("/answer")
async def answer_question(data: dict):
    """
    Answer a question
    Format: {"question": str, "context": str}
    """
    question = data.get("question", "")
    context = data.get("context", "")

    # Generate answer
    answer = question_answerer.answer_question(question, context)

    # Broadcast answer to all clients
    await manager.broadcast({
        "type": "answer",
        "question": question,
        "answer": answer,
        "timestamp": datetime.now().strftime("%H:%M:%S")
    })

    return {"answer": answer}


if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*70)
    print("Real-time Speech-to-Text Web Server with React Frontend")
    print("="*70)
    print(f"\nFrontend: {'✓ React build found' if FRONTEND_EXISTS else '✗ React build not found'}")
    print(f"Server: http://localhost:{WEB_SERVER_PORT}")
    print("\nPress Ctrl+C to stop\n")
    uvicorn.run(app, host=WEB_SERVER_HOST, port=WEB_SERVER_PORT)
