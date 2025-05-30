from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydub import AudioSegment
import librosa
import os
import uuid
import soundfile as sf

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the frontend static files
app.mount("/", StaticFiles(directory="frontend_dist", html=True), name="frontend")

@app.post("/api/analyze-audio/")
async def analyze_audio(file: UploadFile = File(...)):
    # Create a temporary file
    suffix = os.path.splitext(file.filename)[-1]
    tmp_path = f"/tmp/{uuid.uuid4()}{suffix}"
    
    with open(tmp_path, "wb") as f:
        f.write(await file.read())
    
    try:
        # Convert MP3 to WAV using pydub if needed
        if suffix.lower() == ".mp3":
            audio = AudioSegment.from_mp3(tmp_path)
            tmp_wav_path = tmp_path.replace(".mp3", ".wav")
            audio.export(tmp_wav_path, format="wav")
            os.remove(tmp_path)  # Remove the original file
            tmp_path = tmp_wav_path
        
        # Load audio with librosa
        y, sr = librosa.load(tmp_path, sr=None)
        
        # Beat detection
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        
        # Pitch detection (using librosa's piptrack)
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch_data = []
        for i in range(pitches.shape[1]):
            index = magnitudes[:, i].argmax()
            pitch = pitches[index, i]
            if pitch > 0:
                pitch_data.append({
                    "time": float(librosa.frames_to_time(i, sr=sr)),
                    "pitch": float(pitch)
                })
        
        # Build final response
        response = {
            "tempo": float(tempo),
            "beats": [float(b) for b in beat_times],
            "pitches": pitch_data
        }
        
        return response
    
    finally:
        # Clean up temporary files
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

# Add a health check endpoint for container monitoring
@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

# For local development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)