import * as THREE from "three";
import { getCurrentBPM, setOnBPMChangeCallback } from "./audioManager.js";

// Constants for grid layout
const BLOCK_PLACEMENT_SQUARE_SIZE = 0.5;
const TOTAL_LANES = 4;
const TOTAL_ROWS = 3;
const boxMap = new Map();
let boxIdCounter = 0;

// New constants for positioning
const BRIDGE_HEIGHT = 0;
const SPAWN_DISTANCE = 20;

const laneRowTracker = Array.from({ length: TOTAL_LANES }, () =>
  Array(TOTAL_ROWS).fill(0)
);

let currentBPM = getCurrentBPM();

// Add a box queue
const boxQueue = [];

function isPositionAvailable(lane, row) {
  return laneRowTracker[lane][row] < 1; // No more than 2 boxes allowed
}

// Set up callback to update BPM when it changes
setOnBPMChangeCallback((newBPM) => {
  currentBPM = newBPM;
  console.log("BPM updated in BoxManager:", currentBPM);
});

export function getDimensionsForObstacle(obstacle, beatDepth) {
  const width = BLOCK_PLACEMENT_SQUARE_SIZE || 1;
  const height = BLOCK_PLACEMENT_SQUARE_SIZE;
  const depth = 0.5;
  return { width, height, depth };
}

export function queueBoxes(boxes) {
  boxQueue.push(...boxes);
}

export function spawnBox(scene, boxData, beatDepth, zOffset) {
  const obstacleDimensions = getDimensionsForObstacle(boxData, beatDepth);
  const geometry = new THREE.BoxGeometry(
    obstacleDimensions.width,
    obstacleDimensions.height,
    obstacleDimensions.depth
  );
  const material = new THREE.MeshBasicMaterial({
    color: boxData.color || 0xff0000,
  });
  const box = new THREE.Mesh(geometry, material);

  const lane = boxData.lane;
  const row = Math.floor(Math.random() * TOTAL_ROWS);

  if (lane < 0) lane = 0;
  if (lane >= TOTAL_LANES) lane = TOTAL_LANES - 1;

  if (!isPositionAvailable(lane, row)) {
    // Try finding another position within the same lane or neighboring lanes
    //TODO: Make this more efficient
    let foundPosition = false;
    for (
      let tryLane = lane - 1;
      tryLane <= lane + 1 && !foundPosition;
      tryLane++
    ) {
      if (tryLane < 0 || tryLane >= TOTAL_LANES) continue; // Skip out-of-bound lanes
      for (let tryRow = 0; tryRow < TOTAL_ROWS && !foundPosition; tryRow++) {
        if (isPositionAvailable(tryLane, tryRow)) {
          lane = tryLane;
          row = tryRow;
          foundPosition = true;
        }
      }
    }

    if (!foundPosition) return null;
  }

  const xPosition = (lane - 1.5) * BLOCK_PLACEMENT_SQUARE_SIZE;
  const yPosition =
    BRIDGE_HEIGHT +
    row * BLOCK_PLACEMENT_SQUARE_SIZE +
    obstacleDimensions.height / 2;

  // Spawn the box at the defined spawn distance
  box.position.set(xPosition, yPosition, SPAWN_DISTANCE);

  scene.add(box);
  const boxId = `box_${boxIdCounter++}`;
  boxMap.set(boxId, { mesh: box, spawnTime: Date.now() });
  return boxId;
}

export function updateBoxes(deltaTime, scene) {
  const currentTime = Date.now();
  const beatsPerSecond = currentBPM / 60;
  const speed = SPAWN_DISTANCE * beatsPerSecond * 0.25; // Adjusted speed

  // Spawn new boxes from the queue
  while (boxQueue.length > 0 && boxMap.size < 10) {
    // Limit active boxes
    //TODO: Make this more efficient, It keeps making a wall at the beginning
    const boxData = boxQueue.shift();
    spawnBox(scene, boxData, 1, 0);
  }

  for (const [boxId, boxData] of boxMap.entries()) {
    const { mesh, spawnTime } = boxData;
    const elapsedTime = (currentTime - spawnTime) / 1000;

    // Calculate new Z position based on elapsed time and speed
    const newZ = SPAWN_DISTANCE - elapsedTime * speed;
    mesh.position.z = newZ;

    if (newZ < -0.5) {
      mesh.parent.remove(mesh);
      boxMap.delete(boxId);
    }
  }
}

//TODO: Test this
export function checkCollisions(player, leftSword, rightSword) {
  const leftSwordBox = new THREE.Box3().setFromObject(leftSword);
  const rightSwordBox = new THREE.Box3().setFromObject(rightSword);

  for (const [boxId, boxData] of boxMap.entries()) {
    const boxBoundingBox = new THREE.Box3().setFromObject(boxData.mesh);

    if (
      leftSwordBox.intersectsBox(boxBoundingBox) ||
      rightSwordBox.intersectsBox(boxBoundingBox)
    ) {
      // Collision detected
      slashBox(boxId, boxData);
    }
  }
}

function slashBox(boxId, boxData) {
  // Remove the box from the scene and the boxMap
  boxData.mesh.parent.remove(boxData.mesh);
  boxMap.delete(boxId);

  // Create slashing effect
  createSlashEffect(boxData.mesh.position);
}

function createSlashEffect(position) {
  // Create a particle system for the slash effect
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
  });

  const particleSystem = new THREE.Points(particles, particleMaterial);
  scene.add(particleSystem);

  // Animate particles
  const animateParticles = () => {
    const positions = particles.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += (Math.random() - 0.5) * 0.01;
      positions[i + 1] += (Math.random() - 0.5) * 0.01;
      positions[i + 2] += (Math.random() - 0.5) * 0.01;
    }
    particles.attributes.position.needsUpdate = true;

    particleMaterial.opacity -= 0.02;
    if (particleMaterial.opacity <= 0) {
      scene.remove(particleSystem);
    } else {
      requestAnimationFrame(animateParticles);
    }
  };

  animateParticles();
}
