import * as THREE from "three";

// Constants for grid layout
const BLOCK_PLACEMENT_SQUARE_SIZE = 0.5;
const TOTAL_LANES = 4;
const TOTAL_ROWS = 3;
const boxMap = new Map();
let boxIdCounter = 0;

export function getDimensionsForObstacle(obstacle, beatDepth) {
  const width = BLOCK_PLACEMENT_SQUARE_SIZE || 1;
  const height = BLOCK_PLACEMENT_SQUARE_SIZE;
  const depth = 0.5;

  return { width, height, depth };
}

export function spawnBox(scene, boxData, beatDepth, zOffset) {
  // Calculate obstacle dimensions
  const obstacleDimensions = getDimensionsForObstacle(boxData, beatDepth);

  // Create individual geometry for the box
  const geometry = new THREE.BoxGeometry(
    obstacleDimensions.width,
    obstacleDimensions.height,
    obstacleDimensions.depth
  );
  const material = new THREE.MeshBasicMaterial({
    color: boxData.color || 0xff0000,
  });
  const box = new THREE.Mesh(geometry, material);

  // Randomize position in lanes (X-axis) and rows (Y-axis)
  const lane = Math.floor(Math.random() * TOTAL_LANES);
  const row = Math.floor(Math.random() * TOTAL_ROWS);

  // Calculate positions for lane and row
  const xPosition = lane * BLOCK_PLACEMENT_SQUARE_SIZE;
  const yPosition = row * BLOCK_PLACEMENT_SQUARE_SIZE;

  // Set box position on the grid, Z-offset is the forward direction (distance from player)
  box.position.set(xPosition, yPosition, zOffset);

  // Add the box to the scene
  scene.add(box);

  const boxId = `box_${boxIdCounter++}`;
  boxMap.set(boxId, box);

  return boxId;
}

export function updateBoxes(deltaTime) {
  const speed = 0.1;

  for (const [boxId, box] of boxMap.entries()) {
    box.position.z -= speed * deltaTime;

    if (box.position.z < -0.5) {
      box.parent.remove(box);
      boxMap.delete(boxId);
    }
  }
}

export function checkCollisions(player) {
  const playerBoundingBox = new THREE.Box3().setFromObject(player);
  for (const box of boxMap.values()) {
    const boxBoundingBox = new THREE.Box3().setFromObject(box);
    if (playerBoundingBox.intersectsBox(boxBoundingBox)) {
      // TODO: Implement collision response
    }
  }
}
