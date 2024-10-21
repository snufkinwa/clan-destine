import * as THREE from "three";

export function updateCameraBehindVRM(
  camera,
  vrm,
  zoomFactor = 0.85,
  levelHeight = 1.4
) {
  const vrmPosition = vrm.scene.position;
  const distance = 6.6 * zoomFactor;
  camera.position.set(
    vrmPosition.x - 0.75,
    vrmPosition.y + levelHeight,
    vrmPosition.z - distance
  );
  camera.lookAt(vrmPosition.x, vrmPosition.y + levelHeight, vrmPosition.z);
}

export function fitCameraToObject(camera, object, controls) {
  const boundingBox = new THREE.Box3().setFromObject(object);
  const center = boundingBox.getCenter(new THREE.Vector3());
  const size = boundingBox.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));
  cameraZ *= 1.2;
  camera.position.z = center.z + cameraZ;
  camera.position.x = center.x;
  camera.position.y = center.y;
  camera.lookAt(center);

  if (controls) {
    controls.target.copy(center);
    controls.update();
  }
}

export function createSkydome(scene) {
  const textureLoader = new THREE.TextureLoader();
  const skydomeTexture = textureLoader.load(0x9999cc);

  const skydomeGeometry = new THREE.SphereGeometry(40, 32, 32);

  const skydomeMaterial = new THREE.MeshBasicMaterial({
    map: skydomeTexture,
    side: THREE.BackSide,
  });

  const skydome = new THREE.Mesh(skydomeGeometry, skydomeMaterial);
  scene.add(skydome);
}

export function addFogToScene(scene, color = 0xaaaaaa, near = 1, far = 100) {
  scene.fog = new THREE.Fog(color, near, far);
}

// Handle raycasting the player to ground for positioning
export function raycastPlayerToGround(player, groundObjects) {
  if (!player) return;

  const raycaster = new THREE.Raycaster();
  const playerPosition = player.scene.position;

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

export function addGroundObject(groundObjects, object) {
  if (Array.isArray(groundObjects)) {
    groundObjects.push(object);
  } else {
    console.error("groundObjects is not an array");
  }
}
