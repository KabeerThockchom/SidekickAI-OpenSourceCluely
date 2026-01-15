"""
Sales Engineer Copilot - Question Detection and Response Services
Enhanced with categories, structured responses, discovery questions, and objection handling
"""

from openai import OpenAI
import os
import json
from typing import Dict, Optional, List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Question categories
QUESTION_CATEGORIES = [
    "technical",     # Product functionality, architecture, performance
    "pricing",       # Cost, licensing, payment terms
    "timeline",      # Implementation, onboarding duration
    "integration",   # Connectivity with other systems
    "comparison",    # Versus competitors or alternatives
    "process",       # How things work operationally
    "security",      # Data protection, compliance, privacy
    "support",       # SLAs, help resources, maintenance
    "use_case",      # Applicability to their situation
    "clarification"  # Understanding something said
]

# Objection triggers for auto-detection
OBJECTION_TRIGGERS = [
    "too expensive", "over budget", "competitor is cheaper",
    "not the right time", "too busy", "maybe next quarter",
    "need to check with", "not my decision",
    "happy with current solution", "don't see the value",
    "never heard of you", "how do I know this works",
    "does the same thing", "seems complicated", "won't adopt"
]


class QuestionDetector:
    """Detects and categorizes questions from transcript for Sales Engineers"""

    def __init__(self, model="gpt-5-nano"):
        self.model = model
        self.transcript_history = []
        self.detected_questions = set()

    def add_transcript(self, text: str, timestamp: str, source: str = "user", speaker: str = "them"):
        """Add new transcript line to history with source and speaker labels"""
        self.transcript_history.append({
            "text": text,
            "timestamp": timestamp,
            "source": source,
            "speaker": speaker  # "me" (SE) or "them" (customer)
        })
        # Keep last 20 lines for context
        if len(self.transcript_history) > 20:
            self.transcript_history = self.transcript_history[-20:]

    def _normalize_question(self, question: str) -> str:
        """Normalize question for duplicate detection"""
        normalized = question.lower().strip()
        normalized = normalized.replace("?", "").replace(".", "").replace(",", "")
        normalized = normalized.replace("otlp", "oltp")
        normalized = " ".join(normalized.split())
        return normalized.strip()

    def detect_question(self, new_text: str, timestamp: str, source: str = "user", speaker: str = "them") -> Optional[Dict]:
        """
        Detect if transcript contains a question with category classification
        Returns: {"question": str, "timestamp": str, "category": str, "confidence": float, "context_summary": str} or None
        """
        self.add_transcript(new_text, timestamp, source, speaker)

        # Build context from recent history
        context_lines = self.transcript_history[-11:-1] if len(self.transcript_history) > 1 else []
        context = "\n".join([
            f"[{item['timestamp']}] {item['speaker'].upper()}: {item['text']}"
            for item in context_lines
        ]) if context_lines else "No previous context"

        # Recent detected questions for deduplication
        recent_detected = list(self.detected_questions)[-5:] if self.detected_questions else []
        detected_context = "\n".join([f"- {q}" for q in recent_detected]) if recent_detected else "None yet"

        prompt = f"""You are a question detection system for a Sales Engineer meeting copilot.
Analyze this conversation and detect if the customer (labeled "THEM") asks a question.

PREVIOUSLY DETECTED (don't repeat):
{detected_context}

CONVERSATION HISTORY:
{context}

LATEST LINE:
{speaker.upper()}: {new_text}

DETECTION RULES:
- Only detect questions from "THEM" (the customer), not from "ME" (the sales engineer)
- Detect explicit questions (what, why, how, when, where, who, which)
- Detect auxiliary inversions ("Can you...", "Does it...", "Will this...")
- Detect implicit questions ("I'm curious about...", "Tell me more about...")
- DO NOT detect rhetorical questions or acknowledgments ("okay?", "right?")
- Fix transcription errors (OTP→OLTP, sequel→SQL)

CATEGORIES (choose one):
- technical: Product functionality, architecture, performance
- pricing: Cost, licensing, payment terms
- timeline: Implementation, onboarding duration
- integration: Connectivity with other systems
- comparison: Versus competitors or alternatives
- process: How things work operationally
- security: Data protection, compliance, privacy
- support: SLAs, help resources, maintenance
- use_case: Applicability to their situation
- clarification: Understanding something said

Return JSON (or {{"is_question": false}} if no question):
{{
  "is_question": true/false,
  "question_text": "the complete question",
  "category": "category_name",
  "confidence": 0.0-1.0,
  "context_summary": "brief context about why this question matters"
}}"""

        try:
            response = client.responses.create(
                model=self.model,
                input=[
                    {"role": "developer", "content": "You are a question detector for sales calls. Return valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                text={"verbosity": "low"},
                reasoning={"effort": "medium"}
            )

            result = ""
            for item in response.output:
                if hasattr(item, "content") and item.content is not None:
                    for content in item.content:
                        if hasattr(content, "text"):
                            result += content.text

            result = result.strip()

            # Parse JSON response
            try:
                # Handle markdown code blocks
                if result.startswith("```"):
                    result = result.split("```")[1]
                    if result.startswith("json"):
                        result = result[4:]

                data = json.loads(result)

                if data.get("is_question") and data.get("question_text"):
                    question_text = data["question_text"]
                    normalized = self._normalize_question(question_text)

                    if normalized not in self.detected_questions:
                        self.detected_questions.add(normalized)

                        full_context = "\n".join([
                            f"[{item['timestamp']}] {item['speaker'].upper()}: {item['text']}"
                            for item in self.transcript_history[-5:]
                        ])

                        return {
                            "question": question_text,
                            "timestamp": timestamp,
                            "category": data.get("category", "clarification"),
                            "confidence": data.get("confidence", 0.8),
                            "context_summary": data.get("context_summary", ""),
                            "context": full_context
                        }
            except json.JSONDecodeError:
                # Fallback to simple text detection
                if result and result.upper() != "NONE" and "is_question" not in result.lower():
                    normalized = self._normalize_question(result)
                    if normalized not in self.detected_questions:
                        self.detected_questions.add(normalized)
                        full_context = "\n".join([
                            f"[{item['timestamp']}] {item['text']}"
                            for item in self.transcript_history[-5:]
                        ])
                        return {
                            "question": result,
                            "timestamp": timestamp,
                            "category": "clarification",
                            "confidence": 0.7,
                            "context_summary": "",
                            "context": full_context
                        }

            return None

        except Exception as e:
            print(f"Question detection error: {e}")
            return None


class QuestionAnswerer:
    """Generates structured answers for Sales Engineers"""

    def __init__(self):
        self.model = "gpt-5-nano"

    def answer_question(self, question: str, context: str = "", category: str = "technical") -> Dict:
        """
        Generate a structured answer for Sales Engineer to use
        Returns structured response with speakable answer, key points, and technical details
        """
        prompt = f"""You are an AI assistant helping a Sales Engineer answer customer questions during a live call.

CONVERSATION CONTEXT:
{context}

CUSTOMER QUESTION:
{question}

QUESTION CATEGORY: {category}

Generate a response that the Sales Engineer can use immediately. Structure your response as JSON:

{{
  "speakable_answer": "2-3 sentences the SE can say verbatim (under 50 words)",
  "key_points": ["point 1 (under 15 words)", "point 2", "point 3"],
  "technical_details": "deeper info if customer asks follow-up",
  "anticipated_followups": ["question they might ask next"]
}}

Be confident, technically accurate, and consultative. Never say "I don't know"."""

        try:
            response = client.responses.create(
                model=self.model,
                input=[
                    {"role": "developer", "content": "You are a Sales Engineer assistant. Return valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                text={"verbosity": "low"},
                reasoning={"effort": "minimal"}
            )

            result = ""
            for item in response.output:
                if hasattr(item, "content") and item.content is not None:
                    for content in item.content:
                        if hasattr(content, "text"):
                            result += content.text

            result = result.strip()

            try:
                if result.startswith("```"):
                    result = result.split("```")[1]
                    if result.startswith("json"):
                        result = result[4:]

                data = json.loads(result)
                return {
                    "speakable_answer": data.get("speakable_answer", result),
                    "key_points": data.get("key_points", []),
                    "technical_details": data.get("technical_details", ""),
                    "anticipated_followups": data.get("anticipated_followups", [])
                }
            except json.JSONDecodeError:
                return {
                    "speakable_answer": result,
                    "key_points": [],
                    "technical_details": "",
                    "anticipated_followups": []
                }

        except Exception as e:
            print(f"Answer generation error: {e}")
            return {
                "speakable_answer": f"Error generating answer: {e}",
                "key_points": [],
                "technical_details": "",
                "anticipated_followups": []
            }


class DiscoveryQuestionGenerator:
    """Generates strategic discovery questions for Sales Engineers"""

    def __init__(self):
        self.model = "gpt-5-nano"

    def generate_discovery_questions(self, trigger_question: str, context: str = "", known_info: str = "") -> Dict:
        """
        Generate strategic follow-up discovery questions based on customer's question
        """
        prompt = f"""You are an AI assistant helping a Sales Engineer conduct effective discovery during a customer call.

CONVERSATION CONTEXT:
{context}

CUSTOMER'S QUESTION/STATEMENT:
{trigger_question}

WHAT WE ALREADY KNOW:
{known_info if known_info else "Nothing specific yet"}

Generate 3 strategic discovery questions that will:
- Deepen understanding of customer needs
- Uncover pain points and urgency
- Qualify the opportunity
- Build rapport

Return JSON:
{{
  "questions": [
    {{
      "rank": 1,
      "text": "The question to ask",
      "type": "pain_amplification|requirements_gathering|decision_criteria|timeline_discovery|stakeholder_mapping|budget_qualification|competition_intel",
      "why": "Brief explanation of strategic value",
      "recommended": true
    }},
    {{
      "rank": 2,
      "text": "Alternative question",
      "type": "type",
      "why": "explanation",
      "recommended": false
    }},
    {{
      "rank": 3,
      "text": "Another option",
      "type": "type",
      "why": "explanation",
      "recommended": false
    }}
  ],
  "avoid_asking": ["Questions that would be premature or inappropriate"]
}}"""

        try:
            response = client.responses.create(
                model=self.model,
                input=[
                    {"role": "developer", "content": "You are a sales discovery expert. Return valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                text={"verbosity": "low"},
                reasoning={"effort": "low"}
            )

            result = ""
            for item in response.output:
                if hasattr(item, "content") and item.content is not None:
                    for content in item.content:
                        if hasattr(content, "text"):
                            result += content.text

            result = result.strip()

            try:
                if result.startswith("```"):
                    result = result.split("```")[1]
                    if result.startswith("json"):
                        result = result[4:]

                return json.loads(result)
            except json.JSONDecodeError:
                return {
                    "questions": [{
                        "rank": 1,
                        "text": "Can you tell me more about that?",
                        "type": "requirements_gathering",
                        "why": "Opens up the conversation",
                        "recommended": True
                    }],
                    "avoid_asking": []
                }

        except Exception as e:
            print(f"Discovery question generation error: {e}")
            return {
                "questions": [],
                "avoid_asking": [],
                "error": str(e)
            }


class ObjectionHandler:
    """Detects and handles objections during sales calls"""

    def __init__(self):
        self.model = "gpt-5-nano"
        self.objection_patterns = OBJECTION_TRIGGERS

    def detect_objection(self, text: str) -> Optional[str]:
        """Check if text contains an objection pattern"""
        text_lower = text.lower()
        for pattern in self.objection_patterns:
            if pattern in text_lower:
                return pattern
        return None

    def handle_objection(self, objection_text: str, context: str = "") -> Dict:
        """
        Generate objection handling response
        """
        prompt = f"""You are an AI assistant helping a Sales Engineer handle objections during a customer call.

CONVERSATION CONTEXT:
{context}

CUSTOMER'S OBJECTION:
"{objection_text}"

Analyze the objection and provide handling strategies. Return JSON:

{{
  "objection_category": "price|timing|authority|need|trust|competition|complexity",
  "customer_statement": "{objection_text}",
  "recommended_response": "Speakable response that acknowledges, reframes, and provides value (2-3 sentences)",
  "strategy": "Why this approach works for this situation",
  "alternative_approaches": [
    {{
      "name": "ROI ANGLE",
      "response": "Alternative response focusing on ROI"
    }},
    {{
      "name": "PHASED APPROACH",
      "response": "Alternative response offering phased implementation"
    }}
  ],
  "avoid_doing": ["What not to say or do"]
}}

Use the ACKNOWLEDGE → CLARIFY → RESPOND → CONFIRM → ADVANCE framework."""

        try:
            response = client.responses.create(
                model=self.model,
                input=[
                    {"role": "developer", "content": "You are a sales objection handling expert. Return valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                text={"verbosity": "low"},
                reasoning={"effort": "low"}
            )

            result = ""
            for item in response.output:
                if hasattr(item, "content") and item.content is not None:
                    for content in item.content:
                        if hasattr(content, "text"):
                            result += content.text

            result = result.strip()

            try:
                if result.startswith("```"):
                    result = result.split("```")[1]
                    if result.startswith("json"):
                        result = result[4:]

                return json.loads(result)
            except json.JSONDecodeError:
                return {
                    "objection_category": "unknown",
                    "customer_statement": objection_text,
                    "recommended_response": result,
                    "strategy": "",
                    "alternative_approaches": [],
                    "avoid_doing": []
                }

        except Exception as e:
            print(f"Objection handling error: {e}")
            return {
                "objection_category": "unknown",
                "customer_statement": objection_text,
                "recommended_response": f"Error: {e}",
                "strategy": "",
                "alternative_approaches": [],
                "avoid_doing": []
            }


class MeetingSummarizer:
    """Generates meeting summaries and follow-up actions"""

    def __init__(self):
        self.model = "gpt-5-nano"

    def generate_summary(self, transcript_history: List[Dict], questions_answered: List[Dict] = None, questions_pending: List[Dict] = None) -> Dict:
        """
        Generate a comprehensive meeting summary
        """
        transcript_text = "\n".join([
            f"[{item['timestamp']}] {item.get('speaker', 'unknown').upper()}: {item['text']}"
            for item in transcript_history
        ])

        questions_answered_text = "\n".join([
            f"- {q.get('question', 'Unknown')}"
            for q in (questions_answered or [])
        ]) or "None"

        questions_pending_text = "\n".join([
            f"- {q.get('question', 'Unknown')}"
            for q in (questions_pending or [])
        ]) or "None"

        prompt = f"""Generate a comprehensive meeting summary for a Sales Engineer.

FULL TRANSCRIPT:
{transcript_text}

QUESTIONS ANSWERED:
{questions_answered_text}

QUESTIONS PENDING (need follow-up):
{questions_pending_text}

Return JSON:
{{
  "key_points": ["Key discussion point 1", "Point 2", "Point 3"],
  "pain_points_identified": ["Pain point 1", "Pain point 2"],
  "requirements_gathered": ["Requirement 1", "Requirement 2"],
  "buying_signals": ["Signal 1", "Signal 2"],
  "concerns": ["Concern 1", "Concern 2"],
  "next_steps": [
    {{
      "action": "Action to take",
      "timeframe": "within 24 hours|this week|next call",
      "owner": "SE|customer|both"
    }}
  ],
  "follow_up_email_draft": "Brief email draft for follow-up"
}}"""

        try:
            response = client.responses.create(
                model=self.model,
                input=[
                    {"role": "developer", "content": "You are a sales meeting analyst. Return valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                text={"verbosity": "low"},
                reasoning={"effort": "medium"}
            )

            result = ""
            for item in response.output:
                if hasattr(item, "content") and item.content is not None:
                    for content in item.content:
                        if hasattr(content, "text"):
                            result += content.text

            result = result.strip()

            try:
                if result.startswith("```"):
                    result = result.split("```")[1]
                    if result.startswith("json"):
                        result = result[4:]

                return json.loads(result)
            except json.JSONDecodeError:
                return {
                    "key_points": [],
                    "pain_points_identified": [],
                    "requirements_gathered": [],
                    "buying_signals": [],
                    "concerns": [],
                    "next_steps": [],
                    "follow_up_email_draft": result
                }

        except Exception as e:
            print(f"Summary generation error: {e}")
            return {
                "error": str(e)
            }


# Singleton instances
question_detector = QuestionDetector()
question_answerer = QuestionAnswerer()
discovery_generator = DiscoveryQuestionGenerator()
objection_handler = ObjectionHandler()
meeting_summarizer = MeetingSummarizer()
