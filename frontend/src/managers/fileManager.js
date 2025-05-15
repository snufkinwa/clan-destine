// src/managers/fileManager.js
import { uploadAndAnalyzeAudio } from "./audioUploader.js"; // Import the uploader
import { processAudioData } from "../gameLogic.js";
import * as Tone from "tone";

let isMusicPlayingFlag = false;
let audioPlayer = null; // Keep track of the player instance

export async function handleFileUpload(file, overlay) {
  if (file.type.startsWith("audio/")) {
    console.log("File uploaded or dropped:", file.name);
    overlay.classList.remove("hidden"); // Keep overlay potentially for loading indicator
    overlay.innerHTML = "<p>Analyzing audio...</p>";

    try {
      console.log("Sending audio to backend for analysis...");
      const analysisData = await uploadAndAnalyzeAudio(file);
      console.log("Received analysis from backend:", analysisData);

      // Read the file again for playback with Tone.js
      const arrayBuffer = await file.arrayBuffer();
      await Tone.start();

      // If an old player exists, stop and [delete]
      if (audioPlayer) {
        audioPlayer.stop();
        audioPlayer.dispose();
        audioPlayer = null;
        isMusicPlayingFlag = false;
      }

      // Create and load the new audio player
      audioPlayer = new Tone.Player().toDestination();
      await audioPlayer.load(URL.createObjectURL(file));
      // Or load from buffer:
      // const audioBuffer = await Tone.context.decodeAudioData(arrayBuffer);
      // await player.load(audioBuffer);

      // Start playback
      audioPlayer.start();
      isMusicPlayingFlag = true;
      console.log("Audio playback started.");

      // Pass the backend analysis data (analysisData) to game logic
      processAudioData(analysisData);

      audioPlayer.onstop = () => {
        isMusicPlayingFlag = false;
        console.log("Music has stopped.");
        if (overlay) overlay.classList.add("hidden");
      };
    } catch (error) {
      console.error("Error processing audio file:", error);
      alert(
        `Failed to process audio file: ${error.message}. Please ensure the backend is running.`
      );
      if (overlay) overlay.classList.add("hidden");
    } finally {
    }
  } else {
    alert("Please upload a valid audio file.");
  }

  // Potentially hide overlay earlier if analysis is very fast
  // if (overlay) {
  //   overlay.classList.add("hidden");
  // }
}

export function isMusicPlaying() {
  return isMusicPlayingFlag;
}
