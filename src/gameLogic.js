import * as THREE from "three";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  initPlayer,
  updatePlayer,
  triggerSlashAnimation,
} from "./managers/player/player.js";
import { createSkydome, raycastPlayerToGround } from "./utils.js";
import { spawnBox, updateBoxes } from "./managers/boxManager.js";
import { loadEnvironment } from "./enviroment/enviroment.js";
import * as Tone from "tone";

let groundObjects = [];
let audioBoxes = []; // Store boxes generated from audio
let currentPlayer = null;
const beatDepth = 1;
let audioStartTime = null;
//TODO: Add a way to toggle between first and third person
let isFirstPerson = false;

let menuVisible = false;
let menuGroup = null;

function createControlsMenu(scene) {
  menuGroup = new THREE.Group();

  const menuGeometry = new THREE.PlaneGeometry(3, 2);
  const menuMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.7,
  });
  const menuBackground = new THREE.Mesh(menuGeometry, menuMaterial);
  menuGroup.add(menuBackground);

  const loader = new FontLoader();
  loader.load("./StitchWarrior.json", function (font) {
    const textMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    const createTextMesh = (text, y) => {
      const textGeometry = new TextGeometry(text, {
        font: font,
        size: 0.1,
        height: 0.01,
      });
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(1.4, y, 0.05);
      textMesh.rotation.y = Math.PI;
      return textMesh;
    };

    menuGroup.add(createTextMesh("Drag and drop audio file to play", 0.8));
    menuGroup.add(createTextMesh("Controls:", 0.6));
    menuGroup.add(createTextMesh("Left Arrow - Slash Left", 0.4));
    menuGroup.add(createTextMesh("Right Arrow - Slash Right", 0.2));
    menuGroup.add(createTextMesh("M - Toggle Menu", 0));
  });

  menuGroup.position.set(0, 1, -1);
  scene.add(menuGroup);
}

// Process the audio data and store it for use during box generation
export function processAudioData(boxes) {
  audioBoxes = boxes;
}

// Generate boxes from audio beats
function generateBoxesFromAudio(scene) {
  if (!audioStartTime) {
    audioStartTime = Tone.now(); // Get the current time from Tone.js
  }

  while (audioBoxes.length > 0) {
    const boxData = audioBoxes[0];
    const currentTime = Tone.now() - audioStartTime;

    if (currentTime >= boxData.beatStart) {
      audioBoxes.shift();

      // Use the beatStart time to calculate a unique zOffset for each box
      const zOffset = boxData.beatStart * 5;

      spawnBox(scene, boxData, beatDepth, zOffset);
    } else {
      break;
    }
  }
}

// Reset box counter
export function resetBoxCounter() {
  boxCounter = 0;
}

// Add fog to the scene for atmosphere
function addFogToScene(scene, color = 0xaaaaaa, near = 1, far = 100) {
  scene.fog = new THREE.Fog(color, near, far);
}

// Initialize the game
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
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.target.set(0, 1, 0);
  controls.minDistance = 6.5;
  controls.maxDistance = 9.5;
  //TODO: Fix this so the camera doesn't go infront or below the player
  controls.update();

  // Load the skydome and environment
  createSkydome(scene);
  loadEnvironment(scene, camera, controls, groundObjects);

  const clock = new THREE.Clock();
  clock.start();

  // Initialize the player (VRM)
  const vrmPath = "./models/test2.vrm";
  initPlayer(scene, camera, controls, vrmPath).then((player) => {
    currentPlayer = player;
  });

  createControlsMenu(scene);

  // Add event listener for toggling the menu and slashing
  window.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "m":
      case "M":
        menuVisible = !menuVisible;
        menuGroup.visible = menuVisible;
        break;
      case "ArrowLeft":
        console.log("Slash Left");
        triggerLeftSlash();
        break;
      case "ArrowRight":
        console.log("Slash Right");
        triggerRightSlash();
        break;
    }
  });

  // Main animation loop
  function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    // Update the player (VRM) animations
    if (currentPlayer) {
      updatePlayer(deltaTime);
      raycastPlayerToGround(currentPlayer, groundObjects);
    }

    // Generate boxes based on the audio input
    generateBoxesFromAudio(scene);

    // Update the positions of the boxes
    updateBoxes(deltaTime);

    // Render the scene
    renderer.render(scene, camera);
  }

  animate();

  // Handle window resize
  window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
}
