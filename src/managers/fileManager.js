import { processAudio } from "./audioManager.js";
import { processAudioData } from "../gameLogic.js";
import * as Tone from "tone";

let isMusicPlayingFlag = false;

export async function handleFileUpload(file, overlay) {
  if (file.type.startsWith("audio/")) {
    console.log("File uploaded or dropped:", file.name);

    try {
      // Read the file as an ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Process the audio file
      const { boxes, player } = await processAudio(arrayBuffer, file);

      // Start audio playback after ensuring the player has loaded
      await Tone.start();
      await player.loaded;
      player.start();
      isMusicPlayingFlag = true;

      // Pass the processed audio data to game logic
      processAudioData(boxes);

      player.onstop = () => {
        isMusicPlayingFlag = false;
        console.log("Music has stopped.");
      };
    } catch (error) {
      console.error("Error processing audio file:", error);
      alert("Failed to process audio file. Please try again.");
    }
  } else {
    alert("Please upload a valid audio file.");
  }

  if (overlay) {
    overlay.classList.add("hidden");
  }
}

export function isMusicPlaying() {
  return isMusicPlayingFlag;
}
