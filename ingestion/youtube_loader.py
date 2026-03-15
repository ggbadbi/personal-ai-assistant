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
    # Try caption API first — try ALL available languages
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        api = YouTubeTranscriptApi()
        
        # First try to list what's available
        try:
            transcript_list = api.list(video_id)
            # Get first available transcript (any language)
            for t in transcript_list:
                try:
                    fetched = t.fetch()
                    segments = [{'text': s.text, 'start': s.start, 'duration': getattr(s, 'duration', 3.0)} for s in fetched]
                    print(f"   ✅ Got {len(segments)} segments in language: {t.language_code}")
                    return segments
                except:
                    continue
        except Exception as e2:
            print(f"   ⚠ list failed: {e2}")
            
        # Fallback — try fetching directly
        fetched = api.fetch(video_id)
        segments = [{'text': s.text, 'start': s.start, 'duration': getattr(s, 'duration', 3.0)} for s in fetched]
        print(f"   ✅ Got {len(segments)} caption segments")
        return segments
    except Exception as e:
        print(f"   ⚠ Caption API failed: {e}")
        print(f"   🎙️ Falling back to Whisper transcription...")

    return transcribe_with_whisper(video_id)


def transcribe_with_whisper(video_id: str) -> list:
    """Download audio and transcribe using faster-whisper on RTX 4080."""
    import tempfile

    audio_path = None
    try:
        import yt_dlp
        from faster_whisper import WhisperModel

        # Download audio only
        with tempfile.TemporaryDirectory() as tmpdir:
            audio_path = os.path.join(tmpdir, f"{video_id}.mp3")

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

            # Find the actual downloaded file
            mp3_path = audio_path
            if not os.path.exists(mp3_path):
                mp3_path = audio_path + ".mp3"
            if not os.path.exists(mp3_path):
                for f in os.listdir(tmpdir):
                    if f.endswith('.mp3') or f.endswith('.m4a') or f.endswith('.webm'):
                        mp3_path = os.path.join(tmpdir, f)
                        break

            if not os.path.exists(mp3_path):
                print(f"   ❌ Audio file not found in {tmpdir}")
                return []

            print(f"   🤖 Transcribing with Whisper (CPU)...")

            # Use CPU — avoids CUDA library issues
            model = WhisperModel(
                "base",
                device="cpu",        # ← changed from cuda to cpu
                compute_type="int8"  # ← int8 works on CPU
            )

            segments, info = model.transcribe(
                mp3_path,
                language=None,    # auto-detect language
                beam_size=5,
                word_timestamps=True
            )

            print(f"   🌐 Detected language: {info.language} (confidence: {info.language_probability:.2f})")

            result = []
            for seg in segments:
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