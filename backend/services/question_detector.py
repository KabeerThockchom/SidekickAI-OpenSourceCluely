"""
Question Detection Service
Uses OpenAI with minimal reasoning for fast question detection
"""

from openai import OpenAI
import os
from typing import Dict, Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class QuestionDetector:
    """Detects questions from transcript using OpenAI GPT-5 Nano with minimal reasoning"""

    def __init__(self, model="gpt-5-nano"):
        self.model = model
        self.transcript_history = []
        self.detected_questions = set()  # Track detected questions to avoid duplicates

    def add_transcript(self, text: str, timestamp: str):
        """Add new transcript line to history"""
        self.transcript_history.append({
            "text": text,
            "timestamp": timestamp
        })
        # Keep last 20 lines for context
        if len(self.transcript_history) > 20:
            self.transcript_history = self.transcript_history[-20:]

    def _normalize_question(self, question: str) -> str:
        """Normalize question for duplicate detection"""
        # Remove extra whitespace, lowercase, remove punctuation for comparison
        # Also normalize common variations (OTLP vs OLTP)
        normalized = question.lower().strip()
        normalized = normalized.replace("?", "").replace(".", "").replace(",", "")
        normalized = normalized.replace("otlp", "oltp")  # Common typo
        normalized = " ".join(normalized.split())  # Normalize whitespace
        return normalized.strip()

    def detect_question(self, new_text: str, timestamp: str) -> Optional[Dict]:
        """
        Detect if the NEW transcript line contains a question using GPT-5 Nano with minimal reasoning
        Only detects from the CURRENT line, uses history as context only
        Returns: {"question": str, "timestamp": str} or None
        """
        # Add to history
        self.add_transcript(new_text, timestamp)

        # Build context from recent history (including more lines for better context)
        # Use last 10 lines (excluding the latest) to help form complete questions
        context_lines = self.transcript_history[-11:-1] if len(self.transcript_history) > 1 else []
        context = "\n".join([
            f"[{item['timestamp']}] {item['text']}"
            for item in context_lines
        ]) if context_lines else "No previous context"

        # Build list of recently detected questions for deduplication context
        recent_detected = list(self.detected_questions)[-5:] if self.detected_questions else []
        detected_context = "\n".join([f"- {q}" for q in recent_detected]) if recent_detected else "None yet"

        prompt = f"""Analyze this conversation transcript and detect if a COMPLETE question exists.

PREVIOUSLY DETECTED (don't repeat these):
{detected_context}

CONVERSATION HISTORY:
{context}

LATEST LINE:
{new_text}

INSTRUCTIONS:
1. Look at the ENTIRE conversation (all lines above) to find complete questions
2. Questions can span multiple transcript lines - combine them
3. Fix transcription errors:
   - "OTP"/"OTLP" → "OLTP"
   - "Delta Life" → "Delta Live"
   - "sequel" → "SQL"
4. Detect implicit questions:
   - "Tell me about X" → "What is X?"
   - "Explain Y" → "What is Y?"
5. Combine multi-part questions:
   - "What was it? How did you solve it?" → "What was it and how did you solve it?"
6. Only return if you're HIGHLY CONFIDENT it's complete
7. Don't repeat previously detected questions

EXAMPLES:
✓ "What is the difference between OLTP and OLAP systems?"
✓ "Tell me about yourself, Kabir" → "Who are you, Kabir?"
✓ "What is the full form of OTP?" → "What is the full form of OLTP?"
✗ "What is" (incomplete fragment)
✗ "How hard" (incomplete, unclear)

Return ONLY the complete question text, or "NONE" if no complete question exists.

Question:"""

        try:
            # Use Responses API with GPT-5 Nano and MEDIUM reasoning for better accuracy
            response = client.responses.create(
                model=self.model,
                input=[
                    {"role": "developer", "content": "You are a question detector. Return only the question text or NONE."},
                    {"role": "user", "content": prompt}
                ],
                text={"verbosity": "low"},  # Low verbosity for terse output
                reasoning={"effort": "medium"}  # Medium reasoning for better accuracy
            )

            # Extract text from response
            result = ""
            for item in response.output:
                if hasattr(item, "content") and item.content is not None:
                    for content in item.content:
                        if hasattr(content, "text"):
                            result += content.text

            result = result.strip()

            # Check if it's a valid question and not a duplicate
            if result and result.upper() != "NONE":
                # Normalize for duplicate checking
                normalized = self._normalize_question(result)

                # Check if we've already detected this question
                if normalized not in self.detected_questions:
                    self.detected_questions.add(normalized)

                    # Build full context for answering
                    full_context = "\n".join([
                        f"[{item['timestamp']}] {item['text']}"
                        for item in self.transcript_history[-5:]
                    ])

                    return {
                        "question": result,
                        "timestamp": timestamp,
                        "context": full_context
                    }

            return None

        except Exception as e:
            print(f"Question detection error: {e}")
            return None


class QuestionAnswerer:
    """Answers questions using OpenAI GPT-5 Nano with minimal reasoning for ultra-fast responses"""

    def __init__(self):
        self.model = "gpt-5-nano"

    def answer_question(self, question: str, context: str = "") -> str:
        """
        Answer a question with context using GPT-5 Nano with minimal reasoning for speed
        Context should include full conversation history for comprehensive answers
        """

        prompt = f"""You are answering questions based on a conversation transcript.

CONVERSATION HISTORY:
{context}

QUESTION TO ANSWER:
{question}

INSTRUCTIONS:
- Use the full conversation history above to provide context-aware answers
- If the question has multiple parts (e.g., "What was it? How hard was it?"), answer ALL parts
- Be concise but thorough
- If information is missing from the transcript, acknowledge it

Provide a comprehensive answer:"""

        try:
            # Use Responses API with GPT-5 Nano and minimal reasoning for ultra-fast answers
            response = client.responses.create(
                model=self.model,
                input=[
                    {"role": "developer", "content": "You provide concise, accurate answers."},
                    {"role": "user", "content": prompt}
                ],
                text={"verbosity": "low"},  # Low verbosity for concise answers
                reasoning={"effort": "minimal"}  # Minimal reasoning for fastest response
            )

            # Extract text from response
            answer = ""
            for item in response.output:
                if hasattr(item, "content") and item.content is not None:
                    for content in item.content:
                        if hasattr(content, "text"):
                            answer += content.text

            return answer.strip()

        except Exception as e:
            print(f"Answer generation error: {e}")
            return f"Error generating answer: {e}"


# Singleton instances
question_detector = QuestionDetector()
question_answerer = QuestionAnswerer()
