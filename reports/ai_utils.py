import json
import logging
from django.conf import settings
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

def analyze_report_findings(findings_text, purpose_items):
    """
    Calls the Gemini API to compare the inspector's findings against the project's purpose items.
    Returns a list of dicts: [{"purpose_item_id": int, "verdict": str, "reason": str}]
    """
    api_key = getattr(settings, 'GEMINI_API_KEY', None)
    if not api_key:
        logger.warning("GEMINI_API_KEY is not set. Skipping AI analysis.")
        return []

    try:
        client = genai.Client(api_key=api_key)
        
        # Construct the items payload
        items_str = "\n".join([f"- ID: {item.id}, Claimed Description: {item.description}" for item in purpose_items])
        
        prompt = f"""
You are an AI assisting an inspection official. Given the following `Purpose Items` for a government-funded project, and the inspector's free-text `Findings`, determine if the findings indicate that each purpose item matches the claim, is a mismatch (e.g. not done or improperly done), or if it's unclear.

Purpose Items:
{items_str}

Inspector Findings:
{findings_text}

Analyze the findings and provide a strict JSON array where each element matches this schema:
{{
  "purpose_item_id": integer,
  "verdict": "matches" | "mismatch" | "unclear",
  "reason": "Brief explanation based on the findings text"
}}
"""
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        
        # Parse the JSON response
        try:
            result = json.loads(response.text)
            return result
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode Gemini JSON response: {e}")
            return []
            
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}")
        return []
