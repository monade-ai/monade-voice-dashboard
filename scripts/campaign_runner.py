#!/usr/bin/env python3
"""
Campaign Runner Script
Reads contacts from CSV, makes bulk calls via Monade API, and outputs results with transcripts.

Usage:
    python campaign_runner.py --input contacts.csv --output results.csv --assistant-id YOUR_ASSISTANT_ID

Input CSV format:
    name,number
    Rahul,9867764589
    Priya,9876543210

Output CSV format:
    name,number,call_id,call_status,transcript
"""

import argparse
import csv
import json
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Optional, Dict, List

# Configuration
DEFAULT_API_URL = "http://localhost:3000"  # Local dev server
MONADE_API_URL = "http://35.200.254.189/db_services"
USER_UID = "b08d1d4d-a47d-414b-9360-80264388793f"
API_KEY = "monade_d8325992-cf93-4cdd-9c54-34ca18d72441"

# Retry configuration
MAX_TRANSCRIPT_RETRIES = 30  # Max attempts to find transcript
TRANSCRIPT_POLL_INTERVAL = 5  # Seconds between polls


def format_phone_number(number: str) -> str:
    """Format phone number - add + and country code if needed."""
    number = str(number).strip()
    # Remove any spaces or dashes
    number = number.replace(" ", "").replace("-", "")
    
    if not number.startswith("+"):
        number = "+" + number
    
    # Add country code if just 10 digits (Indian number)
    if len(number) == 11 and number.startswith("+"):
        number = "+91" + number[1:]
    
    return number


def initiate_call(
    api_url: str,
    phone_number: str,
    assistant_id: str,
    assistant_name: str,
    from_number: str,
    callee_info: Dict = None
) -> Dict:
    """Initiate a call via the dashboard API."""
    url = f"{api_url}/api/calling"
    
    payload = {
        "phone_number": phone_number,
        "assistant_id": assistant_id,
        "assistant_name": assistant_name,
        "from_number": from_number,
        "callee_info": callee_info or {}
    }
    
    print(f"[Call] Initiating call to {phone_number}...")
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        print(f"[Call] Success! Call ID: {data.get('call_id', 'N/A')}")
        return {"success": True, "data": data}
    except requests.exceptions.RequestException as e:
        print(f"[Call] Failed: {e}")
        return {"success": False, "error": str(e)}


def fetch_transcripts() -> List[Dict]:
    """Fetch all transcripts from the Monade API."""
    url = f"{MONADE_API_URL}/api/users/{USER_UID}/transcripts"
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, list) else data.get("transcripts", [])
    except requests.exceptions.RequestException as e:
        print(f"[Transcript] Error fetching transcripts: {e}")
        return []


def find_transcript_for_call(call_id: str, transcripts: List[Dict]) -> Optional[Dict]:
    """Find transcript matching a call ID."""
    for t in transcripts:
        if t.get("call_id") == call_id:
            return t
    return None


def find_transcript_by_phone(phone_number: str, start_time: datetime, transcripts: List[Dict]) -> Optional[Dict]:
    """Find transcript matching phone number created after start_time."""
    formatted_phone = phone_number if phone_number.startswith("+") else "+" + phone_number
    
    for t in transcripts:
        t_phone = t.get("phone_number", "")
        t_created = t.get("created_at", "")
        
        if t_phone == formatted_phone and t_created:
            try:
                # Parse transcript creation time
                t_time = datetime.fromisoformat(t_created.replace("Z", "+00:00"))
                if t_time > start_time:
                    return t
            except (ValueError, TypeError):
                continue
    return None


def fetch_transcript_content(transcript_url: str) -> str:
    """Fetch the actual transcript content from the URL - conversation only."""
    try:
        response = requests.get(transcript_url, timeout=30)
        response.raise_for_status()
        
        # Parse JSONL format
        lines = response.text.strip().split("\n")
        messages = []
        for line in lines:
            try:
                entry = json.loads(line)
                
                # Skip metadata lines (they have 'metadata' key)
                if "metadata" in entry:
                    continue
                
                # Handle both formats: sender/text and role/content
                sender = entry.get("sender", entry.get("role", ""))
                text = entry.get("text", entry.get("content", ""))
                
                # text might be a list
                if isinstance(text, list):
                    text = " ".join(text)
                
                if sender and text:
                    # Capitalize sender for readability
                    sender = sender.capitalize()
                    messages.append(f"{sender}: {text}")
            except json.JSONDecodeError:
                continue
        
        return "\n".join(messages) if messages else ""
    except requests.exceptions.RequestException as e:
        print(f"[Transcript] Error fetching content: {e}")
        return ""


def wait_for_transcript(
    call_id: str,
    phone_number: str,
    start_time: datetime,
    max_retries: int = MAX_TRANSCRIPT_RETRIES,
    poll_interval: int = TRANSCRIPT_POLL_INTERVAL
) -> Optional[Dict]:
    """Poll for transcript until it appears or timeout."""
    print(f"[Transcript] Waiting for transcript (call {call_id}, phone {phone_number})...")
    
    for attempt in range(max_retries):
        transcripts = fetch_transcripts()
        
        # Try matching by call_id first
        transcript = find_transcript_for_call(call_id, transcripts)
        
        # If not found, try matching by phone number + timestamp
        if not transcript:
            transcript = find_transcript_by_phone(phone_number, start_time, transcripts)
        
        if transcript:
            print(f"[Transcript] Found! (attempt {attempt + 1})")
            return transcript
        
        print(f"[Transcript] Not found yet (attempt {attempt + 1}/{max_retries}), waiting {poll_interval}s...")
        time.sleep(poll_interval)
    
    # Not found after all retries - might be no answer/busy
    print(f"[Transcript] Not found after {max_retries} attempts - call may not have connected")
    return None


def determine_call_status(call_response: Dict, transcript: Optional[Dict]) -> str:
    """Determine the call status based on response and transcript."""
    if not call_response.get("success"):
        return "failed"
    
    if transcript:
        return "completed"
    
    # No transcript after polling - likely no answer
    return "no_answer"


def read_input_csv(filepath: str) -> List[Dict]:
    """Read contacts from input CSV file."""
    contacts = []
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            contacts.append({
                "name": row.get("name", "").strip(),
                "number": row.get("number", "").strip()
            })
    return contacts


def write_output_csv(filepath: str, results: List[Dict]):
    """Write results to output CSV file."""
    fieldnames = ["name", "number", "call_id", "call_status", "transcript"]
    
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    
    print(f"\n[Output] Results written to {filepath}")


def process_single_contact(
    contact: Dict,
    api_url: str,
    assistant_id: str,
    assistant_name: str,
    from_number: str,
    skip_transcript_wait: bool
) -> Dict:
    """Process a single contact - initiate call and wait for transcript."""
    print(f"\n[Call] Processing: {contact['name']} ({contact['number']})")
    
    # Format phone number
    phone = format_phone_number(contact["number"])
    
    # Personalization via callee_info
    callee_info = {"name": contact["name"]}
    
    # Record start time for transcript matching
    call_start_time = datetime.now(timezone.utc)
    
    # Initiate call
    call_response = initiate_call(
        api_url=api_url,
        phone_number=phone,
        assistant_id=assistant_id,
        assistant_name=assistant_name,
        from_number=from_number,
        callee_info=callee_info
    )
    
    call_id = call_response.get("data", {}).get("call_id", "")
    
    # Wait for transcript (if call succeeded)
    transcript = None
    transcript_text = ""
    
    if call_response.get("success") and not skip_transcript_wait:
        transcript = wait_for_transcript(call_id, phone, call_start_time)
        if transcript and transcript.get("transcript_url"):
            transcript_text = fetch_transcript_content(transcript["transcript_url"])
    
    # Determine status
    status = determine_call_status(call_response, transcript)
    
    return {
        "name": contact["name"],
        "number": contact["number"],
        "call_id": call_id,
        "call_status": status,
        "transcript": transcript_text
    }


def run_campaign(
    input_file: str,
    output_file: str,
    assistant_id: str,
    assistant_name: str,
    from_number: str,
    api_url: str,
    delay: int = 5,
    skip_transcript_wait: bool = False,
    concurrency: int = 1
):
    """Run the campaign - make calls and collect results."""
    print(f"\n{'='*60}")
    print(f"CAMPAIGN RUNNER")
    print(f"{'='*60}")
    print(f"Input:        {input_file}")
    print(f"Output:       {output_file}")
    print(f"Assistant:    {assistant_name} ({assistant_id})")
    print(f"From Number:  {from_number}")
    print(f"API URL:      {api_url}")
    print(f"Concurrency:  {concurrency} parallel calls")
    print(f"Delay:        {delay}s between batches")
    print(f"{'='*60}\n")
    
    # Read contacts
    contacts = read_input_csv(input_file)
    print(f"[Input] Loaded {len(contacts)} contacts")
    
    results = []
    
    if concurrency == 1:
        # Sequential mode
        for i, contact in enumerate(contacts):
            print(f"\n--- Contact {i+1}/{len(contacts)} ---")
            result = process_single_contact(
                contact=contact,
                api_url=api_url,
                assistant_id=assistant_id,
                assistant_name=assistant_name,
                from_number=from_number,
                skip_transcript_wait=skip_transcript_wait
            )
            results.append(result)
            
            # Delay before next call
            if i < len(contacts) - 1:
                print(f"[Wait] Waiting {delay}s before next call...")
                time.sleep(delay)
    else:
        # Concurrent mode
        print(f"\n[Concurrent] Starting {concurrency} parallel workers...")
        
        with ThreadPoolExecutor(max_workers=concurrency) as executor:
            future_to_contact = {
                executor.submit(
                    process_single_contact,
                    contact=contact,
                    api_url=api_url,
                    assistant_id=assistant_id,
                    assistant_name=assistant_name,
                    from_number=from_number,
                    skip_transcript_wait=skip_transcript_wait
                ): contact
                for contact in contacts
            }
            
            for future in as_completed(future_to_contact):
                contact = future_to_contact[future]
                try:
                    result = future.result()
                    results.append(result)
                    print(f"[Done] {contact['name']}: {result['call_status']}")
                except Exception as e:
                    print(f"[Error] {contact['name']}: {e}")
                    results.append({
                        "name": contact["name"],
                        "number": contact["number"],
                        "call_id": "",
                        "call_status": "failed",
                        "transcript": ""
                    })
    
    # Write output
    write_output_csv(output_file, results)
    
    # Summary
    print(f"\n{'='*60}")
    print("CAMPAIGN COMPLETE")
    print(f"{'='*60}")
    completed = sum(1 for r in results if r["call_status"] == "completed")
    failed = sum(1 for r in results if r["call_status"] == "failed")
    no_answer = sum(1 for r in results if r["call_status"] == "no_answer")
    print(f"Total:      {len(results)}")
    print(f"Completed:  {completed}")
    print(f"No Answer:  {no_answer}")
    print(f"Failed:     {failed}")
    print(f"{'='*60}\n")


def main():
    parser = argparse.ArgumentParser(description="Campaign Runner - Bulk calling script")
    parser.add_argument("--input", "-i", required=True, help="Input CSV file path")
    parser.add_argument("--output", "-o", required=True, help="Output CSV file path")
    parser.add_argument("--assistant-id", "-a", required=True, help="Assistant ID to use for calls")
    parser.add_argument("--assistant-name", "-n", default="Campaign Assistant", help="Assistant name")
    parser.add_argument("--from-number", "-f", required=True, help="Trunk phone number (e.g., +13157918262)")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="Dashboard API URL")
    parser.add_argument("--delay", "-d", type=int, default=5, help="Delay between calls (seconds)")
    parser.add_argument("--concurrency", "-c", type=int, default=10, help="Number of parallel calls (default: 10, provider max)")
    parser.add_argument("--skip-transcript", action="store_true", help="Skip waiting for transcripts")
    
    args = parser.parse_args()
    
    run_campaign(
        input_file=args.input,
        output_file=args.output,
        assistant_id=args.assistant_id,
        assistant_name=args.assistant_name,
        from_number=args.from_number,
        api_url=args.api_url,
        delay=args.delay,
        skip_transcript_wait=args.skip_transcript,
        concurrency=args.concurrency
    )


if __name__ == "__main__":
    main()

