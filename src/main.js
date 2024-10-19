import "../style.css";
import melodyslashLogo from "/swords.svg";
import { initGame } from "./gameLogic.js";
import { handleFileUpload } from "./managers/fileManager.js";

document.querySelector("#app").innerHTML = `
  <div>
      <img src="${melodyslashLogo}" class="logo" alt="MelodySlash logo" />
      <canvas id="game-canvas" width="800" height="600"></canvas>
      <input type="file" id="audio-upload" accept=".mp3, .m4a, audio/*" style="display: none;"/>
      <div id="overlay" class="overlay hidden">
        <p>Drop your MP3 or M4A file to upload</p>
      </div>

  </div>
`;

const canvas = document.getElementById("game-canvas");
const audioUploadInput = document.getElementById("audio-upload");
const overlay = document.getElementById("overlay");
const webcam = document.getElementById("webcam");
initGame(canvas);

audioUploadInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    handleFileUpload(file, overlay); // Pass the file and overlay to handleFileUpload
  }
});

// Full-screen drag-and-drop events
window.addEventListener("dragover", (event) => {
  event.preventDefault();
  overlay.classList.remove("hidden");
});

window.addEventListener("dragleave", () => {
  overlay.classList.add("hidden");
});

window.addEventListener("drop", (event) => {
  event.preventDefault();
  overlay.classList.add("hidden");

  const files = event.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    handleFileUpload(file, overlay); // Pass the file and overlay to handleFileUpload
  }
});
