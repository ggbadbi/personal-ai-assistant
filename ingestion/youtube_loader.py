# ingestion/youtube_loader.py
import os
import sys
import re
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from ingestion.chunker import chunk_text
from ingestion.deduplicator import filter_new

# Languages we support for transcript detection
SUPPORTED_LANGUAGES = ['en', 'hi', 'sd', 'pa', 'en-US', 'en-GB', 'a.en']


def extract_video_id(url: str) -> str:
    patterns = [r'(?:v=|youtu\.be/|embed/|shorts/)([a-zA-Z0-9_-]{11})']
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def get_video_info(video_id: str) -> dict:
    try:
        import yt_dlp
        with yt_dlp.YoutubeDL({'quiet': True, 'no_warnings': True}) as ydl:
            info = ydl.extract_info(
                f"https://www.youtube.com/watch?v={video_id}",
                download=False
            )
            return {
                'title': info.get('title', f'YouTube {video_id}'),
                'channel': info.get('uploader', 'Unknown'),
                'duration': info.get('duration', 0),
                'url': f"https://www.youtube.com/watch?v={video_id}"
            }
    except Exception as e:
        print(f"   ⚠ Video info error: {e}")
        return {
            'title': f'YouTube Video {video_id}',
            'channel': 'Unknown', 'duration': 0,
            'url': f"https://www.youtube.com/watch?v={video_id}"
        }


def get_transcript_with_timestamps(video_id: str) -> list:
    """Try captions in all supported languages, fall back to Whisper."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        api = YouTubeTranscriptApi()

        # Priority language order: English, Hindi, Sindhi, Punjabi, then anything
        PRIORITY_LANGS = ['en', 'en-US', 'en-GB', 'hi', 'sd', 'pa', 'pa-IN', 'gu', 'ur']

        try:
            transcript_list = api.list(video_id)
            available = list(transcript_list)

            print(f"   🌐 Available transcripts:")
            for t in available:
                print(f"      - {t.language_code}: {t.language} ({'auto' if t.is_generated else 'manual'})")

            # Try priority languages first
            for lang in PRIORITY_LANGS:
                for t in available:
                    if t.language_code.startswith(lang):
                        try:
                            fetched = t.fetch()
                            segments = [{'text': s.text, 'start': s.start, 'duration': getattr(s, 'duration', 3.0)} for s in fetched]
                            print(f"   ✅ Using transcript: {t.language} ({t.language_code})")
                            return segments
                        except Exception as e:
                            print(f"   ⚠ Failed {t.language_code}: {e}")
                            continue

            # If no priority match — use first available
            for t in available:
                try:
                    fetched = t.fetch()
                    segments = [{'text': s.text, 'start': s.start, 'duration': getattr(s, 'duration', 3.0)} for s in fetched]
                    print(f"   ✅ Using first available: {t.language} ({t.language_code})")
                    return segments
                except:
                    continue

        except Exception as e:
            print(f"   ⚠ Transcript list failed: {e}")

            # Direct fetch fallback
            fetched = api.fetch(video_id)
            segments = [{'text': s.text, 'start': s.start, 'duration': getattr(s, 'duration', 3.0)} for s in fetched]
            print(f"   ✅ Direct fetch: {len(segments)} segments")
            return segments

    except Exception as e:
        print(f"   ⚠ Caption API failed: {e}")
        print(f"   🎙️ Falling back to Whisper...")

    return transcribe_with_whisper(video_id)

def transcribe_with_whisper(video_id: str) -> list:
    """Download audio and transcribe using faster-whisper."""
    import tempfile

    try:
        import yt_dlp
        from faster_whisper import WhisperModel

        with tempfile.TemporaryDirectory() as tmpdir:
            audio_path = os.path.join(tmpdir, f"{video_id}")

            print(f"   📥 Downloading audio...")
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': audio_path,
                'quiet': True,
                'no_warnings': True,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '128',
                }],
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([f"https://www.youtube.com/watch?v={video_id}"])

            # Find downloaded file
            mp3_path = None
            for fname in os.listdir(tmpdir):
                if fname.endswith(('.mp3', '.m4a', '.webm', '.opus')):
                    mp3_path = os.path.join(tmpdir, fname)
                    break

            if not mp3_path or not os.path.exists(mp3_path):
                print(f"   ❌ Audio file not found in {tmpdir}: {os.listdir(tmpdir)}")
                return []

            print(f"   🤖 Transcribing with Whisper (CPU)...")
            print(f"   ℹ️  This takes 1-3 minutes for a song. Please wait...")

            model = WhisperModel(
                "base",
                device="cpu",
                compute_type="int8"
            )

            segments_gen, info = model.transcribe(
                mp3_path,
                language=None,
                beam_size=5,
                word_timestamps=False,
                condition_on_previous_text=True,
                initial_prompt="This audio may be in English, Hindi, Sindhi, or Punjabi Gurmukhi."
            )

            print(f"   🌐 Detected language: {info.language} (confidence: {info.language_probability:.2f})")

            # Consume generator into list
            result = []
            for seg in segments_gen:
                if seg.text.strip():
                    result.append({
                        'text': seg.text.strip(),
                        'start': seg.start,
                        'duration': seg.end - seg.start
                    })

            print(f"   ✅ Whisper transcribed {len(result)} segments")
            return result

    except Exception as e:
        print(f"   ❌ Whisper error: {e}")
        import traceback
        print(traceback.format_exc())
        return []
    except Exception as e:
        print(f"   ❌ Whisper error: {e}")
        import traceback
        print(traceback.format_exc())
        return []


def format_timestamp(seconds: float) -> str:
    """Convert seconds to MM:SS or HH:MM:SS format."""
    seconds = int(seconds)
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def segments_to_chunks(segments: list, meta: dict) -> list:
    """
    Convert transcript segments into chunks with timestamp metadata.
    Groups ~300 words per chunk, keeps start timestamp.
    """
    if not segments:
        return []

    chunks = []
    current_words = []
    current_start = segments[0]['start']
    word_count = 0

    for seg in segments:
        words = seg['text'].split()
        current_words.extend(words)
        word_count += len(words)

        if word_count >= 300:
            chunk_text_str = ' '.join(current_words)
            ts = format_timestamp(current_start)
            yt_url = meta.get('url', '')
            video_id = meta.get('video_id', '')

            chunk_meta = {
                **meta,
                'timestamp': ts,
                'timestamp_seconds': int(current_start),
                'timestamp_url': f"{yt_url}&t={int(current_start)}s" if yt_url else '',
            }

            from ingestion.chunker import Chunk
            import hashlib
            chunk_id = hashlib.md5(chunk_text_str.encode()).hexdigest()
            chunks.append(Chunk(text=chunk_text_str, metadata=chunk_meta, chunk_id=chunk_id))

            current_words = []
            current_start = seg['start']
            word_count = 0

    # Add remaining words
    if current_words:
        chunk_text_str = ' '.join(current_words)
        ts = format_timestamp(current_start)
        yt_url = meta.get('url', '')
        chunk_meta = {
            **meta,
            'timestamp': ts,
            'timestamp_seconds': int(current_start),
            'timestamp_url': f"{yt_url}&t={int(current_start)}s" if yt_url else '',
        }
        from ingestion.chunker import Chunk
        import hashlib
        chunk_id = hashlib.md5(chunk_text_str.encode()).hexdigest()
        chunks.append(Chunk(text=chunk_text_str, metadata=chunk_meta, chunk_id=chunk_id))

    return chunks


def ingest_youtube(url: str):
    """Main entry point — ingest a YouTube video."""
    print(f"   Processing YouTube: {url}")

    video_id = extract_video_id(url)
    if not video_id:
        print(f"   ❌ Invalid URL: {url}")
        return [], "Invalid YouTube URL"

    info = get_video_info(video_id)
    title = info['title']
    print(f"   📺 Title: {title}")
    print(f"   👤 Channel: {info['channel']}")
    print(f"   ⏱ Duration: {format_timestamp(info['duration'])}")

    segments = get_transcript_with_timestamps(video_id)
    if not segments:
        print(f"   ❌ Could not get transcript for: {title}")
        return [], title

    total_words = sum(len(s['text'].split()) for s in segments)
    print(f"   📝 Total words: {total_words}")

    meta = {
        "source": title,
        "type": "youtube",
        "url": info['url'],
        "channel": info['channel'],
        "video_id": video_id,
        "date_ingested": datetime.now().isoformat()
    }

    chunks = segments_to_chunks(segments, meta)
    new_chunks = filter_new(chunks)
    print(f"   ✅ '{title}': {len(new_chunks)} chunks with timestamps")

    return new_chunks, title