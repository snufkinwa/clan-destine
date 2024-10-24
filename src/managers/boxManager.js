import * as THREE from "three";
import { getCurrentBPM, setOnBPMChangeCallback } from "./audioManager.js";
import {
  BLOCK_PLACEMENT_SQUARE_SIZE,
  TOTAL_LANES,
  TOTAL_ROWS,
  BRIDGE_HEIGHT,
  SPAWN_DISTANCE,
} from "../utils/constants.js";

const boxMap = new Map();
let boxIdCounter = 0;

const laneRowTracker = Array.from({ length: TOTAL_LANES }, () =>
  Array(TOTAL_ROWS).fill(0)
);

let currentBPM = getCurrentBPM();

// Add a box queue
const boxQueue = [];

function isPositionAvailable(lane, row) {
  return laneRowTracker[lane][row] < 1;
}

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

  let lane = boxData.lane;
  let row = Math.floor(Math.random() * TOTAL_ROWS);

  if (lane < 0) lane = 0;
  if (lane >= TOTAL_LANES) lane = TOTAL_LANES - 1;

  if (!isPositionAvailable(lane, row)) {
    let foundPosition = false;
    for (
      let tryLane = lane - 1;
      tryLane <= lane + 1 && !foundPosition;
      tryLane++
    ) {
      if (tryLane < 0 || tryLane >= TOTAL_LANES) continue;
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

  box.position.set(xPosition, yPosition, SPAWN_DISTANCE);

  scene.add(box);
  const boxId = `box_${boxIdCounter++}`;
  boxMap.set(boxId, { mesh: box, spawnTime: Date.now() });
  return boxId;
}

export function updateBoxes(deltaTime, scene) {
  const currentTime = Date.now();
  const beatsPerSecond = currentBPM / 60;
  const speed = SPAWN_DISTANCE * beatsPerSecond * 0.25;

  while (boxQueue.length > 0 && boxMap.size < 10) {
    const boxData = boxQueue.shift();
    spawnBox(scene, boxData, 1, 0);
  }

  for (const [boxId, boxData] of boxMap.entries()) {
    const { mesh, spawnTime } = boxData;
    const elapsedTime = (currentTime - spawnTime) / 1000;

    const newZ = SPAWN_DISTANCE - elapsedTime * speed;
    mesh.position.z = newZ;

    if (newZ < -0.5) {
      mesh.parent.remove(mesh);
      boxMap.delete(boxId);
    }
  }
}

export function checkCollisions(player, leftSword, rightSword, scene) {
  if (!leftSword || !rightSword) return;

  const leftBox = new THREE.Box3().setFromObject(leftSword);
  const rightBox = new THREE.Box3().setFromObject(rightSword);

  boxMap.forEach((boxData, boxId) => {
    if (!boxData.mesh) return;

    const boxBounds = new THREE.Box3().setFromObject(boxData.mesh);
    if (leftBox.intersectsBox(boxBounds) || rightBox.intersectsBox(boxBounds)) {
      slashBox(boxId, boxData, scene);
    }
  });
}

function slashBox(boxId, boxData, scene) {
  if (!boxData?.mesh?.parent) {
    console.warn(`Cannot slash box ${boxId}: Invalid mesh or parent`);
    return;
  }

  boxData.mesh.parent.remove(boxData.mesh);
  boxMap.delete(boxId);
  createSlashEffect(boxData.mesh.position, scene);
}

function createSlashEffect(position, scene) {
  if (!position || !scene) {
    console.warn("Invalid parameters for createSlashEffect");
    return;
  }

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
  scene.add(particleSystem);

  const animateParticles = () => {
    if (!particleSystem.parent) {
      return; // Stop animation if particle system was removed
    }

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

export function getBoxYPosition(row) {
  return BRIDGE_HEIGHT + row * BLOCK_PLACEMENT_SQUARE_SIZE;
}
