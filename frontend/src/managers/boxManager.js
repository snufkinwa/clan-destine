// src/managers/boxManager.js
import * as THREE from "three";

import {
  BLOCK_PLACEMENT_SQUARE_SIZE,
  TOTAL_LANES,
  TOTAL_ROWS,
  BRIDGE_HEIGHT,
  SPAWN_DISTANCE,
  COLORS,
} from "../utils/constants.js";

const boxMap = new Map();
let boxIdCounter = 0;
let scheduledBoxes = [];
let gameScene = null;
let lastSpawnedIndex = -1;

// Store the BPM from the track analysis
let trackBPM = 120;

// Function to receive the schedule from gameLogic
export function setBoxSchedule(schedule, scene) {
  console.log("Box schedule received by boxManager:", schedule);
  scheduledBoxes = schedule.sort((a, b) => a.time - b.time);
  gameScene = scene;
  boxMap.clear();
  lastSpawnedIndex = -1;
  boxIdCounter = 0;
}

// Function to set the BPM determined by the backend analysis
export function setTrackBPM(bpm) {
  console.log("boxManager received BPM:", bpm);
  trackBPM = bpm;
}

// Function to determine box speed - constant or BPM (preferred)
function getBoxSpeed() {
  //  Constant speed
  // return 10.0;

  //  Speed based on BPM
  const beatsPerSecond = trackBPM / 60;
  return SPAWN_DISTANCE * beatsPerSecond * 0.25;
}

// Simplified spawn function - takes pre-defined properties
function spawnScheduledBox(boxData) {
  if (!gameScene) return null;

  const geometry = new THREE.BoxGeometry(
    BLOCK_PLACEMENT_SQUARE_SIZE,
    BLOCK_PLACEMENT_SQUARE_SIZE,
    0.5 // Depth
  );
  const material = new THREE.MeshBasicMaterial({
    color: boxData.color || COLORS.CRIMSON_RED,
  });
  const box = new THREE.Mesh(geometry, material);

  const lane = boxData.lane;
  // Determine row - can be fixed, random, or based on pitch/other data
  const row = Math.floor(Math.random() * TOTAL_ROWS); // Random row for now

  const xPosition =
    (lane - (TOTAL_LANES - 1) / 2) * BLOCK_PLACEMENT_SQUARE_SIZE;
  const yPosition = getBoxYPosition(row);

  // Spawn at the fixed distance
  box.position.set(xPosition, yPosition, SPAWN_DISTANCE);

  gameScene.add(box);
  const boxId = `box_${boxIdCounter++}`;

  // Store the mesh and its target arrival time
  boxMap.set(boxId, {
    mesh: box,
    targetTime: boxData.time, // The time it should reach z=0
  });

  return boxId;
}

// Update function revised for scheduled spawning
export function updateBoxes(deltaTime, currentTime) {
  if (!gameScene) return;

  const speed = getBoxSpeed();
  const travelTime = SPAWN_DISTANCE / speed;

  //  Spawn new boxes based on the schedule and current audio time
  for (let i = lastSpawnedIndex + 1; i < scheduledBoxes.length; i++) {
    const boxToSpawn = scheduledBoxes[i];
    // Calculate the time when this box should be spawned to arrive at its targetTime
    const requiredSpawnTime = boxToSpawn.time - travelTime;

    if (currentTime >= requiredSpawnTime) {
      console.log(
        `Spawning box for beat at ${boxToSpawn.time.toFixed(
          2
        )}s (Current time: ${currentTime.toFixed(2)}s)`
      );
      spawnScheduledBox(boxToSpawn);
      lastSpawnedIndex = i; // Update the index of the last spawned box
    } else {
      // Since the schedule is sorted, no need to check further for spawning
      break;
    }
  }

  // Update positions of active boxes
  for (const [boxId, boxData] of boxMap.entries()) {
    const { mesh } = boxData;
    if (!mesh || !mesh.parent) {
      boxMap.delete(boxId); // Clean up if mesh was removed elsewhere
      continue;
    }

    // Move box based on constant speed
    mesh.position.z -= speed * deltaTime;

    // Remove box if it has passed the player
    if (mesh.position.z < -1.0) {
      // Adjust removal threshold as needed
      mesh.parent.remove(mesh);
      boxMap.delete(boxId);
    }
  }
}

// Collision detection and effects remain similar
export function checkCollisions(player, leftSword, rightSword) {
  // Ensure swords exist
  // if (!leftSword || !rightSword) return;

  const leftBox = leftSword ? new THREE.Box3().setFromObject(leftSword) : null;
  const rightBox = rightSword
    ? new THREE.Box3().setFromObject(rightSword)
    : null;

  boxMap.forEach((boxData, boxId) => {
    if (!boxData.mesh || !boxData.mesh.parent) return;

    const boxBounds = new THREE.Box3().setFromObject(boxData.mesh);

    let intersected = false;
    if (leftBox && leftBox.intersectsBox(boxBounds)) {
      intersected = true;
    }
    if (!intersected && rightBox && rightBox.intersectsBox(boxBounds)) {
      intersected = true;
    }

    if (intersected) {
      slashBox(boxId, boxData);
    }
  });
}

function slashBox(boxId, boxData) {
  if (!boxData?.mesh?.parent || !gameScene) {
    console.warn(`Cannot slash box ${boxId}: Invalid mesh, parent, or scene`);
    return;
  }

  boxData.mesh.parent.remove(boxData.mesh);
  boxMap.delete(boxId);
  createSlashEffect(boxData.mesh.position);
}

function createSlashEffect(position) {
  if (!position || !gameScene) {
    console.warn("Invalid parameters for createSlashEffect");
    return;
  }
  // Particle effect code remains the same, using gameScene
  const particleCount = 20;
  const particles = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = position.x + (Math.random() - 0.5) * 0.5;
    positions[i + 1] = position.y + (Math.random() - 0.5) * 0.5;
    positions[i + 2] = position.z + (Math.random() - 0.5) * 0.5;
  }

  particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const particleMaterial = new THREE.PointsMaterial({
    color: 0x00ffff,
    size: 0.05,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 1,
  });

  const particleSystem = new THREE.Points(particles, particleMaterial);
  gameScene.add(particleSystem);

  const animateParticles = () => {
    if (!particleSystem.parent) {
      return;
    }

    const positions = particles.attributes.position.array;
    // Simple linear decay/movement
    for (let i = 0; i < positions.length; i += 3) {
      // Add some random velocity/direction
      positions[i] += (Math.random() - 0.5) * 0.02;
      positions[i + 1] += (Math.random() - 0.5) * 0.02;
      positions[i + 2] += (Math.random() - 0.5) * 0.02;
    }
    particles.attributes.position.needsUpdate = true;

    particleMaterial.opacity -= 0.02; // Fade out
    if (particleMaterial.opacity <= 0) {
      gameScene.remove(particleSystem);
    } else {
      requestAnimationFrame(animateParticles);
    }
  };

  animateParticles();
}

// Helper function
export function getBoxYPosition(row) {
  // Ensure row is within bounds
  const validRow = Math.max(0, Math.min(row, TOTAL_ROWS - 1));
  // Calculate Y position based on constants
  return (
    BRIDGE_HEIGHT +
    validRow * BLOCK_PLACEMENT_SQUARE_SIZE +
    BLOCK_PLACEMENT_SQUARE_SIZE / 2
  );
}
