import * as THREE from "three";

const BOUNDING_BOX = {
  minX: -5.0,
  maxX: 5.0,
  minZ: 1.0,
  maxZ: 5.0,
  y: 0,
};

const RETURN_SPEED = 2;

export function initializePlayerPosition(player) {
  if (!player) return;
  player.scene.position.set(0, BOUNDING_BOX.y, 0);
}

export function updatePlayerPosition(player, deltaTime) {
  if (!player) return;

  const position = player.scene.position;

  // Clamp X and Z positions within bounding box
  position.x = Math.max(
    BOUNDING_BOX.minX,
    Math.min(BOUNDING_BOX.maxX, position.x)
  );
  position.z = Math.max(
    BOUNDING_BOX.minZ,
    Math.min(BOUNDING_BOX.maxZ, position.z)
  );

  // Always set Y to fixed position
  position.y = BOUNDING_BOX.y;

  // Gradually return to center
  position.x += -position.x * RETURN_SPEED * deltaTime;
  position.z += -position.z * RETURN_SPEED * deltaTime;
}

export function getPlayerBoundingBox() {
  return BOUNDING_BOX;
}
