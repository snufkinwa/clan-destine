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
  getSwords,
} from "./managers/player/player.js";
import {
  createSkydome,
  raycastPlayerToGround,
  addFogToScene,
  updateThunderEffects,
  triggerManualThunder,
} from "./utils/utils.js";
import {
  setBoxSchedule,
  setTrackBPM,
  updateBoxes,
} from "./managers/boxManager.js";
import { loadEnvironment } from "./enviroment/enviroment.js";
import {
  createDebugVisuals,
  updateHitBoxPositions,
  toggleDebugVisuals,
  initDebugScene,
} from "./utils/debugVisuals.js";
import {
  BLOCK_PLACEMENT_SQUARE_SIZE,
  TOTAL_LANES,
  TOTAL_ROWS,
} from "./utils/constants.js";
import { createCameraSystems } from "./utils/cameraView.js";

let scene, camera, renderer, controls, clock, cameraSystem;
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
  createDebugVisuals(
    scene,
    TOTAL_LANES,
    TOTAL_ROWS,
    BLOCK_PLACEMENT_SQUARE_SIZE
  );
}

function setupScene(canvas) {
  scene = new THREE.Scene();
  addFogToScene(scene);
  clock = new THREE.Clock();
  clock.start();
  initDebugScene(scene);
}

function setupCamera() {
  camera = new THREE.PerspectiveCamera(
    30.0,
    window.innerWidth / window.innerHeight,
    0.3,
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

  controls.enabled = false;
}

function setupEnvironment() {
  createSkydome(scene);
  loadEnvironment(scene, camera, controls, groundObjects);
}

async function loadPlayer() {
  const vrmPath = "./models/test2.vrm";

  try {
    const player = await initPlayer(scene, camera, controls, vrmPath);
    currentPlayer = player;

    if (currentPlayer && currentPlayer.vrm) {
      const vrm = currentPlayer.vrm;

      // Setup firstPerson visibility layers
      if (vrm.firstPerson && typeof vrm.firstPerson.setup === "function") {
        vrm.firstPerson.setup();
        console.log("First-person setup initialized");
      }

      // Initialize camera system
      cameraSystem = createCameraSystems(camera, vrm);
      console.log("Camera system initialized with VRM:", vrm);

      // Set initial layer state to third-person
      camera.layers.enable(vrm.firstPerson.thirdPersonOnlyLayer);
      camera.layers.disable(vrm.firstPerson.firstPersonOnlyLayer);
    }
  } catch (error) {
    console.error("Failed to load player:", error);
  }
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
        if (cameraSystem?.isFirstPerson() && currentPlayer?.vrm) {
          triggerSlashRightBone(currentPlayer.vrm); // bone-based slash
        } else {
          triggerSlashRight(); // fallback to Mixamo animation
        }
        break;

      case "ArrowRight" && "ArrowLeft":
        console.log("Slash Both");
        triggerSlashBoth();
        break;
      case "t":
      case "T":
        triggerManualThunder(); // Manual thunder trigger for testing
        break;
      case "c":
      case "C":
        console.log("Toggling camera view");
        if (cameraSystem && currentPlayer?.vrm) {
          cameraSystem.toggleFirstPerson();
          controls.enabled = false;
          console.log(
            "Camera toggled, first person:",
            cameraSystem.isFirstPerson()
          );
        } else {
          console.warn("Camera system or player not fully initialized");
        }
        break;
      case "d":
      case "D":
        toggleDebugVisuals();
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

    if (cameraSystem) {
      cameraSystem.update(deltaTime);
    }

    const { leftSword, rightSword } = getSwords();
    if (leftSword && rightSword) {
      updateHitBoxPositions(leftSword, rightSword);
    }
  }

  updateThunderEffects();

  updateBoxes(deltaTime, currentTime);

  renderer.render(scene, camera);
}

export function processAudioData(analysisJson) {
  console.log("Processing analysis data in gameLogic:", analysisJson);
  audioAnalysis = analysisJson; // Store the analysis

  const beatTimes = audioAnalysis.beats || [];
  const bpm = audioAnalysis.tempo || 120;
  const pitchData = audioAnalysis.pitches || []; // Get pitch data

  pitchData.sort((a, b) => a.time - b.time);

  setTrackBPM(bpm);

  const boxSchedule = beatTimes.map((beatTime, index) => {
    const averagePitch = findAveragePitchForTime(beatTime, pitchData, 0.15);

    const assignedRow = mapPitchToRow(averagePitch, 80, 1000, TOTAL_ROWS);

    const baseColor = index % 2 === 0 ? COLORS.AQUA_BLUE : COLORS.CRIMSON_RED; // Simple alternation
    const pitchModifiedColor = mapPitchToColor(
      averagePitch,
      80,
      1000,
      baseColor
    );

    // Maybe? Use pitch to determine LANE (instead of index % TOTAL_LANES)
    // const assignedLane = mapPitchToLane(averagePitch, 80, 1000, TOTAL_LANES); // Need a mapPitchToLane function
    const assignedLane = index % TOTAL_LANES;

    console.log(
      `Beat ${index} at ${beatTime.toFixed(2)}s -> Pitch: ${
        averagePitch ? averagePitch.toFixed(2) + " Hz" : "N/A"
      } -> Row: ${assignedRow} -> Color: #${pitchModifiedColor.toString(16)}`
    );

    return {
      time: beatTime,
      lane: assignedLane,
      row: assignedRow,
      color: pitchModifiedColor,
      type: "beat",
    };
  });

  setBoxSchedule(boxSchedule, scene);
}
