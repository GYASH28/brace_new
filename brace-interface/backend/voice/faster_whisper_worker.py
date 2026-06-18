import sys
import json
import os
import traceback
from faster_whisper import WhisperModel

def main():
    model_size = os.environ.get("BRACE_WHISPER_MODEL", "base")
    device = os.environ.get("BRACE_WHISPER_DEVICE", "cpu")
    compute_type = os.environ.get("BRACE_WHISPER_COMPUTE_TYPE", "int8")
    
    sys.stdout.write(json.dumps({"type": "init", "status": "loading"}) + "\n")
    sys.stdout.flush()
    
    try:
        model = WhisperModel(model_size, device=device, compute_type=compute_type)
        sys.stdout.write(json.dumps({"type": "init", "status": "ready"}) + "\n")
        sys.stdout.flush()
    except Exception as e:
        sys.stdout.write(json.dumps({"type": "init", "status": "error", "error": str(e)}) + "\n")
        sys.stdout.flush()
        return

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
            
        try:
            req = json.loads(line)
            req_id = req.get("id")
            audio_path = req.get("audio_path")
            language = req.get("language")
            
            if not audio_path:
                sys.stdout.write(json.dumps({"id": req_id, "error": "No audio path provided"}) + "\n")
                sys.stdout.flush()
                continue
                
            segments, info = model.transcribe(audio_path, language=language, vad_filter=True)
            text = " ".join(segment.text.strip() for segment in segments).strip()
            
            sys.stdout.write(json.dumps({
                "id": req_id,
                "text": text,
                "language": getattr(info, "language", None)
            }) + "\n")
            sys.stdout.flush()
        except Exception as e:
            req_id = None
            if 'req' in locals() and isinstance(req, dict):
                req_id = req.get("id")
            sys.stdout.write(json.dumps({
                "id": req_id,
                "error": str(e)
            }) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    main()
