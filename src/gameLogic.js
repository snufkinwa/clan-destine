import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import {
  initPlayer,
  updatePlayer,
  triggerSlashLeft,
  triggerSlashRight,
  triggerSlashBoth,
} from "./managers/player/player.js";
import {
  createSkydome,
  raycastPlayerToGround,
  addFogToScene,
  updateThunderEffects,
  triggerManualThunder,
} from "./utils.js";
import { spawnBox, updateBoxes } from "./managers/boxManager.js";
import { loadEnvironment } from "./enviroment/enviroment.js";
import * as Tone from "tone";

let scene, camera, renderer, controls, clock;
let currentPlayer,
  audioBoxes = [],
  audioStartTime = null;
let groundObjects = [];
let menuGroup,
  menuVisible = false;
const beatDepth = 1;

export function initGame(canvas) {
  setupScene(canvas);
  setupCamera();
  setupRenderer(canvas);
  setupLights();
  setupControls();
  setupEnvironment();
  loadPlayer();
  createControlsMenu();
  setupEventListeners();
  animate();
}

function setupScene(canvas) {
  scene = new THREE.Scene();
  addFogToScene(scene);
  clock = new THREE.Clock();
  clock.start();
}

function setupCamera() {
  camera = new THREE.PerspectiveCamera(
    30.0,
    window.innerWidth / window.innerHeight,
    0.1,
    70.0
  );
  camera.position.set(0.0, 1.0, 5.0);
}

function setupRenderer(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);
}

function setupLights() {
  const light = new THREE.DirectionalLight(0xffffff, 0.5);
  light.position.set(1, 1, 1).normalize();
  scene.add(light);
}

function setupControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.target.set(0, 1, 0);
  controls.minDistance = 6.5;
  controls.maxDistance = 9.5;
  controls.update();
}

function setupEnvironment() {
  createSkydome(scene);
  loadEnvironment(scene, camera, controls, groundObjects);
}

function loadPlayer() {
  const vrmPath = "./models/test2.vrm";
  initPlayer(scene, camera, controls, vrmPath).then((player) => {
    currentPlayer = player;
  });
}

function createControlsMenu() {
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
    menuGroup.add(createTextMesh("Controls", 0.6));
    menuGroup.add(createTextMesh("Left Arrow - Slash Left", 0.4));
    menuGroup.add(createTextMesh("Right Arrow - Slash Right", 0.2));
    menuGroup.add(createTextMesh("M - Toggle Menu", 0));
  });

  menuGroup.position.set(0, 1, -1);
  scene.add(menuGroup);
}

function setupEventListeners() {
  window.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "m":
      case "M":
        menuVisible = !menuVisible;
        menuGroup.visible = menuVisible;
        break;
      case "ArrowLeft":
        console.log("Slash Left");
        triggerSlashLeft();
        break;
      case "ArrowRight":
        console.log("Slash Right");
        triggerSlashRight();
        break;
      case "ArrowRight" && "ArrowLeft":
        console.log("Slash Both");
        triggerSlashBoth();
        break;
      case "t":
      case "T":
        triggerManualThunder(); // Manual thunder trigger for testing
        break;
    }
  });

  window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
}

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  if (currentPlayer) {
    updatePlayer(deltaTime);
    raycastPlayerToGround(currentPlayer, groundObjects);
  }

  updateThunderEffects();

  generateBoxesFromAudio(scene);
  updateBoxes(deltaTime);

  renderer.render(scene, camera);
}

function generateBoxesFromAudio(scene) {
  if (!audioStartTime) {
    audioStartTime = Tone.now();
  }

  while (audioBoxes.length > 0) {
    const boxData = audioBoxes[0];
    const currentTime = Tone.now() - audioStartTime;

    if (currentTime >= boxData.beatStart) {
      audioBoxes.shift();
      const zOffset = boxData.beatStart * 5;
      spawnBox(scene, boxData, beatDepth, zOffset);
    } else {
      break;
    }
  }
}

export function processAudioData(boxes) {
  audioBoxes = boxes;
}
