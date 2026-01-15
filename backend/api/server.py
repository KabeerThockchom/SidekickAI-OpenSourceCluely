"""
Sales Engineer Copilot - Web Server
FastAPI + WebSocket for real-time updates + React Frontend
Enhanced with discovery questions, objection handling, and meeting summaries
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from typing import List, Dict
import asyncio
import json
from datetime import datetime
import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from services.question_detector import (
    question_detector,
    question_answerer,
    discovery_generator,
    objection_handler,
    meeting_summarizer
)
from config.settings import FRONTEND_BUILD_PATH, WEB_SERVER_HOST, WEB_SERVER_PORT

app = FastAPI(title="Sales Engineer Copilot")

# Question state tracking
question_states: Dict[str, Dict] = {}  # question_id -> {status, question, category, ...}


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
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

        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)


manager = ConnectionManager()

# Check if React build exists
FRONTEND_EXISTS = os.path.exists(FRONTEND_BUILD_PATH)

if FRONTEND_EXISTS:
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_BUILD_PATH, "assets")), name="assets")

    @app.get("/logo.png")
    async def get_logo():
        logo_path = os.path.join(FRONTEND_BUILD_PATH, "logo.png")
        if os.path.exists(logo_path):
            return FileResponse(logo_path)
        return {"error": "Logo not found"}

    @app.get("/favicon.ico")
    async def get_favicon():
        favicon_path = os.path.join(FRONTEND_BUILD_PATH, "favicon.ico")
        if os.path.exists(favicon_path):
            return FileResponse(favicon_path)
        return {"error": "Favicon not found"}

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
            # Keep connection alive and listen for client messages
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                # Handle client messages if needed (e.g., question status updates)
                message = json.loads(data)
                if message.get("type") == "question_status_update":
                    question_id = message.get("question_id")
                    new_status = message.get("status")
                    if question_id and new_status:
                        if question_id in question_states:
                            question_states[question_id]["status"] = new_status
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def detect_question_async(text: str, timestamp: str, source: str = "user", speaker: str = "them"):
    """Run question detection in background without blocking"""
    try:
        question_data = await asyncio.to_thread(
            question_detector.detect_question, text, timestamp, source, speaker
        )

        if question_data:
            question_id = f"q_{timestamp}_{hash(question_data['question']) % 10000}"

            # Store question state
            question_states[question_id] = {
                "id": question_id,
                "status": "pending",
                **question_data
            }

            # Send detected question to frontend with enhanced data
            await manager.broadcast({
                "type": "question",
                "id": question_id,
                "question": question_data["question"],
                "timestamp": question_data["timestamp"],
                "context": question_data["context"],
                "category": question_data.get("category", "clarification"),
                "confidence": question_data.get("confidence", 0.8),
                "contextSummary": question_data.get("context_summary", ""),
                "status": "pending"
            })

        # Check for objections
        objection_pattern = objection_handler.detect_objection(text)
        if objection_pattern and speaker == "them":
            objection_response = await asyncio.to_thread(
                objection_handler.handle_objection, text,
                "\n".join([f"[{t['timestamp']}] {t['text']}" for t in question_detector.transcript_history[-5:]])
            )
            await manager.broadcast({
                "type": "objection",
                "objection": {
                    "id": f"obj_{timestamp}",
                    "text": text,
                    "category": objection_response.get("objection_category", "unknown"),
                    "suggestedResponse": objection_response.get("recommended_response", "")
                },
                "response": objection_response
            })

    except Exception as e:
        print(f"Error in background question detection: {e}")


@app.post("/transcript")
async def receive_transcript(data: dict):
    """
    Receive transcript from the transcription service
    Format: {"text": str, "timestamp": str, "confidence": float, "source": str, "speaker": str}
    """
    text = data.get("text", "")
    timestamp = data.get("timestamp", datetime.now().strftime("%H:%M:%S"))
    confidence = data.get("confidence")
    source = data.get("source", "user")
    speaker = data.get("speaker", "them")  # Default to customer

    # Send transcript to frontend IMMEDIATELY
    await manager.broadcast({
        "type": "transcript",
        "text": text,
        "timestamp": timestamp,
        "confidence": confidence,
        "source": source,
        "speaker": speaker
    })

    # Run question detection in background
    asyncio.create_task(detect_question_async(text, timestamp, source, speaker))

    return {"status": "ok"}


@app.post("/answer")
async def answer_question(data: dict):
    """
    Generate a structured answer for a question
    Format: {"question": str, "context": str, "category": str, "question_id": str}
    """
    question = data.get("question", "")
    context = data.get("context", "")
    category = data.get("category", "technical")
    question_id = data.get("question_id")

    # Generate structured answer
    answer_data = await asyncio.to_thread(
        question_answerer.answer_question, question, context, category
    )

    # Update question state
    if question_id and question_id in question_states:
        question_states[question_id]["status"] = "answered"

    # Broadcast answer to all clients
    await manager.broadcast({
        "type": "answer",
        "question": question,
        "questionId": question_id,
        "answer": answer_data.get("speakable_answer", ""),
        "responseType": "answer",
        "structured": {
            "speakableAnswer": answer_data.get("speakable_answer", ""),
            "keyPoints": answer_data.get("key_points", []),
            "technicalDetails": answer_data.get("technical_details", ""),
            "anticipatedFollowups": answer_data.get("anticipated_followups", [])
        },
        "timestamp": datetime.now().strftime("%H:%M:%S")
    })

    return {"answer": answer_data}


@app.post("/discovery")
async def get_discovery_questions(data: dict):
    """
    Generate discovery questions based on a trigger question/statement
    Format: {"question": str, "context": str, "known_info": str}
    """
    question = data.get("question", "")
    context = data.get("context", "")
    known_info = data.get("known_info", "")

    # Generate discovery questions
    discovery_data = await asyncio.to_thread(
        discovery_generator.generate_discovery_questions, question, context, known_info
    )

    # Broadcast to all clients
    await manager.broadcast({
        "type": "answer",
        "question": question,
        "answer": "",  # No direct answer for discovery
        "responseType": "discovery",
        "structured": {
            "questions": discovery_data.get("questions", []),
            "avoidAsking": discovery_data.get("avoid_asking", [])
        },
        "timestamp": datetime.now().strftime("%H:%M:%S")
    })

    return {"discovery": discovery_data}


@app.post("/objection")
async def handle_objection_endpoint(data: dict):
    """
    Handle an objection
    Format: {"objection": str, "context": str}
    """
    objection_text = data.get("objection", "")
    context = data.get("context", "")

    # Generate objection handling response
    response_data = await asyncio.to_thread(
        objection_handler.handle_objection, objection_text, context
    )

    # Broadcast to all clients
    await manager.broadcast({
        "type": "answer",
        "question": objection_text,
        "answer": response_data.get("recommended_response", ""),
        "responseType": "objection",
        "structured": {
            "objectionCategory": response_data.get("objection_category", ""),
            "customerStatement": response_data.get("customer_statement", objection_text),
            "recommendedResponse": response_data.get("recommended_response", ""),
            "strategy": response_data.get("strategy", ""),
            "alternativeApproaches": response_data.get("alternative_approaches", []),
            "avoidDoing": response_data.get("avoid_doing", [])
        },
        "timestamp": datetime.now().strftime("%H:%M:%S")
    })

    return {"response": response_data}


@app.post("/question/{question_id}/status")
async def update_question_status(question_id: str, data: dict):
    """
    Update the status of a question
    Format: {"status": "pending|answered|deferred|dismissed"}
    """
    new_status = data.get("status", "pending")

    if question_id in question_states:
        question_states[question_id]["status"] = new_status

        # Broadcast status update
        await manager.broadcast({
            "type": "question_status",
            "questionId": question_id,
            "status": new_status
        })

        return {"status": "updated", "question_id": question_id, "new_status": new_status}

    return {"status": "not_found", "question_id": question_id}


@app.post("/summary")
async def generate_meeting_summary(data: dict = None):
    """
    Generate a meeting summary
    """
    # Get transcript history from question detector
    transcript_history = question_detector.transcript_history

    # Separate answered and pending questions
    questions_answered = [q for q in question_states.values() if q.get("status") == "answered"]
    questions_pending = [q for q in question_states.values() if q.get("status") in ["pending", "deferred"]]

    # Generate summary
    summary_data = await asyncio.to_thread(
        meeting_summarizer.generate_summary,
        transcript_history,
        questions_answered,
        questions_pending
    )

    # Broadcast to all clients
    await manager.broadcast({
        "type": "summary",
        "summary": summary_data,
        "timestamp": datetime.now().strftime("%H:%M:%S")
    })

    return {"summary": summary_data}


@app.get("/questions")
async def get_all_questions():
    """Get all detected questions with their states"""
    return {"questions": list(question_states.values())}


@app.post("/clear")
async def clear_session():
    """Clear all session data"""
    global question_states
    question_states = {}
    question_detector.transcript_history = []
    question_detector.detected_questions = set()

    await manager.broadcast({
        "type": "session_cleared",
        "timestamp": datetime.now().strftime("%H:%M:%S")
    })

    return {"status": "cleared"}


if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*70)
    print("Sales Engineer Copilot - Web Server")
    print("="*70)
    print(f"\nFrontend: {'✓ React build found' if FRONTEND_EXISTS else '✗ React build not found'}")
    print(f"Server: http://localhost:{WEB_SERVER_PORT}")
    print("\nEndpoints:")
    print("  POST /transcript - Receive transcripts")
    print("  POST /answer     - Generate answers")
    print("  POST /discovery  - Generate discovery questions")
    print("  POST /objection  - Handle objections")
    print("  POST /summary    - Generate meeting summary")
    print("  WS   /ws         - WebSocket for real-time updates")
    print("\nPress Ctrl+C to stop\n")
    uvicorn.run(app, host=WEB_SERVER_HOST, port=WEB_SERVER_PORT)
