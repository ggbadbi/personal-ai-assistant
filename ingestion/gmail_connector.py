# ingestion/gmail_connector.py
import os
import sys
import base64
import json
from datetime import datetime, timedelta
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ingestion.chunker import chunk_text
from ingestion.deduplicator import filter_new

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
CREDENTIALS_FILE = 'credentials.json'
TOKEN_FILE = 'token.json'


def get_gmail_service():
    """Authenticate and return Gmail API service."""
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build

    creds = None

    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_FILE):
                raise FileNotFoundError(
                    f"credentials.json not found! Download from Google Cloud Console "
                    f"and place in: {os.path.abspath(CREDENTIALS_FILE)}"
                )
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)

        with open(TOKEN_FILE, 'w') as f:
            f.write(creds.to_json())

    return build('gmail', 'v1', credentials=creds)


def decode_body(payload) -> str:
    """Recursively extract text from email payload."""
    text = ''
    if payload.get('mimeType') == 'text/plain':
        data = payload.get('body', {}).get('data', '')
        if data:
            text += base64.urlsafe_b64decode(data + '==').decode('utf-8', errors='ignore')
    elif payload.get('mimeType') == 'text/html':
        from bs4 import BeautifulSoup
        data = payload.get('body', {}).get('data', '')
        if data:
            html = base64.urlsafe_b64decode(data + '==').decode('utf-8', errors='ignore')
            text += BeautifulSoup(html, 'html.parser').get_text(separator=' ')
    for part in payload.get('parts', []):
        text += decode_body(part)
    return text


def fetch_emails(max_emails: int = 100, days_back: int = 30, label: str = 'INBOX') -> list:
    """Fetch emails from Gmail."""
    print(f"   📧 Connecting to Gmail...")
    service = get_gmail_service()

    # Build query
    after_date = (datetime.now() - timedelta(days=days_back)).strftime('%Y/%m/%d')
    query = f'after:{after_date}'

    print(f"   🔍 Fetching emails from last {days_back} days...")
    results = service.users().messages().list(
        userId='me', q=query, maxResults=max_emails, labelIds=[label]
    ).execute()

    messages = results.get('messages', [])
    print(f"   📬 Found {len(messages)} emails")

    emails = []
    for i, msg in enumerate(messages):
        try:
            full_msg = service.users().messages().get(
                userId='me', id=msg['id'], format='full'
            ).execute()

            headers = {h['name']: h['value'] for h in full_msg['payload'].get('headers', [])}
            subject = headers.get('Subject', '(no subject)')
            sender = headers.get('From', 'Unknown')
            date = headers.get('Date', '')
            body = decode_body(full_msg['payload'])

            # Skip very short emails
            if len(body.strip()) < 50:
                continue

            emails.append({
                'id': msg['id'],
                'subject': subject,
                'from': sender,
                'date': date,
                'body': body[:5000],  # cap at 5000 chars per email
                'label': label
            })

            if (i + 1) % 10 == 0:
                print(f"   ⬇️  Processed {i+1}/{len(messages)} emails...")

        except Exception as e:
            print(f"   ⚠ Skip email {msg['id']}: {e}")
            continue

    print(f"   ✅ Fetched {len(emails)} emails with content")
    return emails


def ingest_gmail(max_emails: int = 100, days_back: int = 30):
    """Main function — fetch and chunk Gmail emails."""
    emails = fetch_emails(max_emails=max_emails, days_back=days_back)

    all_chunks = []
    for email in emails:
        text = f"Subject: {email['subject']}\nFrom: {email['from']}\nDate: {email['date']}\n\n{email['body']}"
        meta = {
            'source': f"Email: {email['subject'][:50]}",
            'type': 'email',
            'from': email['from'],
            'date': email['date'],
            'email_id': email['id'],
            'date_ingested': datetime.now().isoformat()
        }
        chunks = chunk_text(text, meta, chunk_size=500, overlap=50)
        all_chunks.extend(chunks)

    new_chunks = filter_new(all_chunks)
    print(f"   ✅ Gmail: {len(new_chunks)} new chunks from {len(emails)} emails")
    return new_chunks, len(emails)