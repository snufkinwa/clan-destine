import "../style.css";
import melodyslashLogo from "/swords.svg";
import { initGame } from "./gameLogic.js";
import { handleFileUpload } from "./managers/fileManager.js";

document.querySelector("#app").innerHTML = `
  <div>
      <img src="${melodyslashLogo}" class="logo" alt="MelodySlash logo" />
      <div class="loading-screen">
      <progress class="loading-progress" value="0" max="100"></progress>
      <div class="loading-text">Loading: 0%</div>
    </div>
      <div class="game-container" style="display: none;">
      <canvas id="game-canvas" width="800" height="600"></canvas>
      <input type="file" id="audio-upload" accept=".mp3, .m4a, audio/*" style="display: none;"/>
      <div id="overlay" class="overlay hidden">
        <p>Drop your MP3 or M4A file to upload</p>
      </div>
  </div>
  </div>
`;

const canvas = document.getElementById("game-canvas");
const audioUploadInput = document.getElementById("audio-upload");
const overlay = document.getElementById("overlay");
const logo = document.querySelector(".logo");
const loadingScreen = document.querySelector(".loading-screen");
const loadingProgress = document.querySelector(".loading-progress");
const loadingText = document.querySelector(".loading-text");
const gameContainer = document.querySelector(".game-container");

//For now doing this the lazy way
//TODO: Make this a proper loading screen, with progress of assets loading
function updateLoadingProgress(progress) {
  const roundedProgress = Math.round(progress);
  loadingProgress.value = roundedProgress;
  loadingText.textContent = `Loading: ${roundedProgress}%`;
}

function simulateLoading() {
  let progress = 0;
  const interval = setInterval(() => {
    progress += 1;
    updateLoadingProgress(progress);
    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        loadingScreen.style.opacity = "0";
        loadingScreen.style.pointerEvents = "none";
        gameContainer.style.display = "block";
      }, 500);
    }
  }, 100);
}

simulateLoading();

initGame(canvas);

audioUploadInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    handleFileUpload(file, overlay);
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
    handleFileUpload(file, overlay);
  }
});
