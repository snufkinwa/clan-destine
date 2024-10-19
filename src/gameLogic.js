import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  initPlayer,
  updatePlayer,
  triggerSlashAnimation,
} from "./managers/player/player.js";
import { createSkydome } from "./utils.js";
import { spawnBox, updateBoxes } from "./managers/boxManager.js";
import { loadEnvironment, getBridgeObject } from "./enviroment/enviroment.js";
import { initHandTracking } from "./tracking/handTracking.js";
import { isMusicPlaying } from "./managers/fileManager.js";
import * as Tone from "tone";

const raycaster = new THREE.Raycaster();
const groundObjects = [];
let audioBoxes = []; // Store boxes generated from audio
let currentPlayer = null;
const beatDepth = 1; // Adjust as needed
const zOffset = 1; // Adjust as needed

export function raycastPlayerToGround() {
  if (!currentPlayer) return;

  const playerPosition = currentPlayer.scene.position;

  // Cast ray down from the player's position
  raycaster.set(
    new THREE.Vector3(playerPosition.x, playerPosition.y + 4, playerPosition.z),
    new THREE.Vector3(0, -1, 0)
  );

  // Intersect with ground objects
  const intersects = raycaster.intersectObjects(groundObjects, true);

  if (intersects.length > 0) {
    const intersection = intersects[0];
    playerPosition.y = intersection.point.y;
  }
}

// Add ground objects to raycast against (from environment loading code)
export function addGroundObject(object) {
  groundObjects.push(object);
}

// Process the audio data and store it for use during box generation
export function processAudioData(boxes) {
  audioBoxes = boxes;
}

let boxCounter = 0;
let audioStartTime = null;

function generateBoxesFromAudio(scene) {
  if (!audioStartTime) {
    audioStartTime = Tone.now(); // Get the current time from Tone.js
  }

  while (audioBoxes.length > 0) {
    const boxData = audioBoxes[0]; // Get the first box data
    const currentTime = Tone.now() - audioStartTime; // Calculate the time since audio started

    if (currentTime >= boxData.beatStart) {
      audioBoxes.shift(); // Remove the boxData from the array

      // Use the beatStart time to calculate a unique zOffset for each box
      const zOffset = boxData.beatStart * 5; // Spread boxes based on beatStart (multiply to spread further)

      spawnBox(scene, boxData, beatDepth, zOffset); // Pass zOffset to spawnBox
    } else {
      break;
    }
  }
}

export function resetBoxCounter() {
  boxCounter = 0;
}

// Add fog to the scene for atmosphere
function addFogToScene(scene, color = 0xaaaaaa, near = 1, far = 100) {
  scene.fog = new THREE.Fog(color, near, far);
}

export function initGame(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  addFogToScene(scene);

  const camera = new THREE.PerspectiveCamera(
    30,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1, 5);

  const light = new THREE.DirectionalLight(0xffffff, 0.5);
  light.position.set(1, 1, 1).normalize();
  scene.add(light);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.screenSpacePanning = true;
  controls.target.set(0, 1, 0);
  controls.update();

  // Load the skydome and environment
  createSkydome(scene);
  loadEnvironment(scene, camera, controls);

  const clock = new THREE.Clock();
  clock.start();

  // Initialize the player (VRM)
  const vrmPath = "./models/test2.vrm";
  initPlayer(scene, camera, controls, vrmPath).then((player) => {
    currentPlayer = player;
  });

  // Initialize hand tracking
  const videoElement = document.querySelector("#webcam");
  initHandTracking(videoElement, () => {
    console.log("Slash detected!");
    triggerSlashAnimation();
  });

  function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    // Update the player (VRM) animations
    if (currentPlayer) {
      updatePlayer(deltaTime);
      raycastPlayerToGround();
    }

    generateBoxesFromAudio(scene);

    // Update the positions of the boxes
    updateBoxes(deltaTime);

    // Render the scene
    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
}
