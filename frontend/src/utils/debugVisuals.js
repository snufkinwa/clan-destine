import * as THREE from "three";
import { getBoxYPosition } from "../managers/boxManager.js";

let gridHelper = null;
let hitBoxes = {
  left: null,
  right: null,
};
let gridBoxes = [];
let isDebugVisible = false;
let debugScene;

export function initDebugScene(scene) {
  debugScene = scene;
}

export function createDebugVisuals(
  scene,
  TOTAL_LANES,
  TOTAL_ROWS,
  BLOCK_PLACEMENT_SQUARE_SIZE
) {
  // Create grid boxes for each possible position
  const boxGeometry = new THREE.BoxGeometry(
    BLOCK_PLACEMENT_SQUARE_SIZE,
    BLOCK_PLACEMENT_SQUARE_SIZE,
    BLOCK_PLACEMENT_SQUARE_SIZE
  );

  const boxMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });

  // Create boxes for the entire depth
  const DEPTH_POSITIONS = 20;
  const DEPTH_SPACING = 0.5;

  for (let lane = 0; lane < TOTAL_LANES; lane++) {
    for (let row = 0; row < TOTAL_ROWS; row++) {
      for (let depth = 0; depth < DEPTH_POSITIONS; depth++) {
        const box = new THREE.Mesh(boxGeometry, boxMaterial.clone());

        // Position the box
        const xPosition = (lane - 1.5) * BLOCK_PLACEMENT_SQUARE_SIZE;
        const yPosition = 0.25 + getBoxYPosition(row);
        const zPosition = depth * DEPTH_SPACING;

        box.position.set(xPosition, yPosition, zPosition);
        box.visible = false;
        scene.add(box);
        gridBoxes.push(box);
      }
    }
  }

  // Create hit zone visualization for swords
  const hitBoxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const leftMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.3,
    wireframe: true,
  });
  const rightMaterial = new THREE.MeshBasicMaterial({
    color: 0x0000ff,
    transparent: true,
    opacity: 0.3,
    wireframe: true,
  });

  hitBoxes.left = new THREE.Mesh(hitBoxGeometry, leftMaterial);
  hitBoxes.right = new THREE.Mesh(hitBoxGeometry, rightMaterial);

  hitBoxes.left.visible = false;
  hitBoxes.right.visible = false;

  scene.add(hitBoxes.left);
  scene.add(hitBoxes.right);
}

export function updateHitBoxPositions(leftSword, rightSword) {
  if (!leftSword || !rightSword || !hitBoxes.left || !hitBoxes.right) return;

  const leftPos = new THREE.Vector3();
  const rightPos = new THREE.Vector3();
  leftSword.getWorldPosition(leftPos);
  rightSword.getWorldPosition(rightPos);

  hitBoxes.left.position.copy(leftPos);
  hitBoxes.right.position.copy(rightPos);
}

export function toggleDebugVisuals() {
  isDebugVisible = !isDebugVisible;

  if (gridHelper) gridHelper.visible = isDebugVisible;
  if (hitBoxes.left) hitBoxes.left.visible = isDebugVisible;
  if (hitBoxes.right) hitBoxes.right.visible = isDebugVisible;

  gridBoxes.forEach((box) => {
    box.visible = isDebugVisible;
  });
}

export function visualizeSlashArea(start, end, duration = 500) {
  if (!debugScene || !isDebugVisible) return;

  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const material = new THREE.LineBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 1,
  });

  const line = new THREE.Line(geometry, material);
  debugScene.add(line);

  const startTime = Date.now();
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;

    if (progress >= 1) {
      debugScene.remove(line);
      return;
    }

    material.opacity = 1 - progress;
    requestAnimationFrame(animate);
  }
  animate();
}
