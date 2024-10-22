import * as THREE from "three";

export function updateCameraBehindVRM(
  camera,
  vrm,
  zoomFactor = 0.85,
  levelHeight = 1.4
) {
  const vrmPosition = vrm.scene.position;
  const distance = 6.8 * zoomFactor;
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

let thunderLight;
let fog;
let skydome;
let normalSkyColor = new THREE.Color(0x9999cc);
let thunderSkyColor = new THREE.Color(0xf7f7f7);
let normalFogColor = new THREE.Color(0xaaaaaa);
let thunderFogColor = new THREE.Color(0xf7f7f7);
let isThundering = false;

export function createSkydome(scene) {
  // Create skydome
  const textureLoader = new THREE.TextureLoader();
  const skydomeTexture = textureLoader.load(0xaaaaaa);
  const skydomeGeometry = new THREE.SphereGeometry(40, 32, 32);
  const skydomeMaterial = new THREE.MeshBasicMaterial({
    map: skydomeTexture,
    side: THREE.BackSide,
    fog: true,
    color: normalSkyColor,
  });
  skydome = new THREE.Mesh(skydomeGeometry, skydomeMaterial);
  scene.add(skydome);

  // Create thunder light
  thunderLight = new THREE.PointLight(0xf7f7f7, 0, 100);
  thunderLight.position.set(0, 20, 0);
  scene.add(thunderLight);

  // Create scene fog
  fog = new THREE.Fog(normalFogColor, 1, 100);
  scene.fog = fog;

  // Start thunder system
  startThunderSystem(scene);
}

function startThunderSystem(scene) {
  function createThunder() {
    if (Math.random() < 0.1) {
      // 10% chance of thunder on each check
      triggerThunder();
    }
    // Schedule next check in 5-15 seconds
    setTimeout(() => createThunder(), 5000 + Math.random() * 10000);
  }

  createThunder();
}

function triggerThunder() {
  if (isThundering) return;
  isThundering = true;

  // Create multiple flashes
  const numFlashes = 2 + Math.floor(Math.random() * 3); // 2-4 flashes
  let flashIndex = 0;

  function flash() {
    // Flash on
    thunderLight.intensity = 1 + Math.random();
    skydome.material.color.copy(thunderSkyColor);
    fog.color.copy(thunderFogColor);

    // Schedule flash off
    setTimeout(() => {
      thunderLight.intensity = 0;
      skydome.material.color.copy(normalSkyColor);
      fog.color.copy(normalFogColor);

      flashIndex++;
      if (flashIndex < numFlashes) {
        // Schedule next flash
        setTimeout(flash, 50 + Math.random() * 100);
      } else {
        isThundering = false;
      }
    }, 50 + Math.random() * 50);
  }

  flash();
}

// Function to manually trigger thunder (useful for testing or specific events)
export function triggerManualThunder() {
  triggerThunder();
}

// Call this in your animation loop to update thunder effects
export function updateThunderEffects() {
  if (isThundering) {
    // Add subtle light flickering during thunder
    if (thunderLight.intensity > 0) {
      thunderLight.intensity *= 0.9 + Math.random() * 0.2;
    }
  }
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
