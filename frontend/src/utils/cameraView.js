import * as THREE from "three";
import { math } from "./math.js";

export function createCameraSystems(camera, vrm) {
  let currentPosition = new THREE.Vector3();
  let currentLookAt = new THREE.Vector3();
  let isFirstPerson = false;
  let transitioning = false; // Flag to manage smooth transitions

  // Third Person Calculation
  function calculateThirdPersonOffset() {
    const avatarPosition = vrm.scene.position;
    const distance = 6.0; // How far back the camera should be
    const angleDegrees = 75; // Angle from the vertical (0 = top-down, 90 = level behind)
    const angleRadians = THREE.MathUtils.degToRad(angleDegrees);

    const offsetX = 0; // Camera directly behind
    const offsetY = distance * Math.cos(angleRadians);
    const offsetZ = distance * Math.sin(angleRadians);

    // Combine with avatar's world position
    const idealOffset = new THREE.Vector3(
      avatarPosition.x + offsetX,
      avatarPosition.y + offsetY,
      avatarPosition.z - offsetZ // Positive Z places it behind if avatar faces negative Z
      // If avatar faces positive Z, make this negative: -offsetZ
    );
    return idealOffset;
  }

  function calculateThirdPersonLookAt() {
    // Look at a point slightly above the avatar's base position
    const lookAtTarget = new THREE.Vector3(
      vrm.scene.position.x,
      vrm.scene.position.y + 1.0,
      vrm.scene.position.z
    );
    return lookAtTarget;
  }

  // Third Person Update
  function updateThirdPerson(timeElapsed) {
    const idealOffset = calculateThirdPersonOffset();
    const idealLookAt = calculateThirdPersonLookAt();

    // Use smoother interpolation if transitioning, otherwise slerp faster
    const t = transitioning ? 1.0 - Math.pow(0.01, timeElapsed) : 0.8; // Faster lerp for fixed view

    currentPosition.lerp(idealOffset, t);
    currentLookAt.lerp(idealLookAt, t);

    camera.position.copy(currentPosition);
    camera.lookAt(currentLookAt);

    // Stop transition when close enough
    if (transitioning && currentPosition.distanceTo(idealOffset) < 0.1) {
      transitioning = false;
      console.log("Transitioned to Third Person");
      // Ensure final position/lookat are exact
      camera.position.copy(idealOffset);
      camera.lookAt(idealLookAt);
    }
  }

  // First Person Update
  function updateFirstPerson(timeElapsed) {
    // Added timeElapsed parameter
    if (!vrm.firstPerson?.firstPersonBone) {
      console.warn("First person bone not found!");
      const fallbackOffset = new THREE.Vector3(0, 1.6, 0.2);
      fallbackOffset.add(vrm.scene.position);
      camera.position.lerp(fallbackOffset, 0.1);
      camera.lookAt(
        vrm.scene.position.clone().add(new THREE.Vector3(0, 1.6, 10))
      );
      return;
    }

    const firstPersonBone = vrm.firstPerson.firstPersonBone;
    const headWorldPosition = firstPersonBone.getWorldPosition(
      new THREE.Vector3()
    );
    const headWorldQuaternion = firstPersonBone.getWorldQuaternion(
      new THREE.Quaternion()
    );

    const cameraOffset = new THREE.Vector3(0, 0, 0);
    cameraOffset.applyQuaternion(headWorldQuaternion);
    const idealPosition = headWorldPosition.clone().add(cameraOffset);

    const lookAtOffset = new THREE.Vector3(0, 0, -1);
    lookAtOffset.applyQuaternion(headWorldQuaternion);
    const idealLookAt = idealPosition.clone().add(lookAtOffset);

    const t = transitioning ? 1.0 - Math.pow(0.01, timeElapsed) : 0.2;

    // Smoothly move camera position and rotation (using lookAt)
    currentPosition.lerp(idealPosition, t);
    // We don't need currentLookAt here as lookAt handles rotation
    // currentLookAt.lerp(idealLookAt, t);

    camera.position.copy(currentPosition);
    camera.lookAt(idealLookAt);

    // Stop transition when close enough
    if (transitioning && currentPosition.distanceTo(idealPosition) < 0.05) {
      transitioning = false;
      console.log("Transitioned to First Person");
    }
  }

  // Toggle Function
  function toggleFirstPerson(forceState) {
    const newState =
      typeof forceState === "boolean" ? forceState : !isFirstPerson;
    if (newState === isFirstPerson) return;

    isFirstPerson = newState;
    transitioning = true;

    console.log(
      `Toggling camera. New state: ${
        isFirstPerson ? "First Person" : "Third Person"
      }`
    );

    if (vrm.firstPerson) {
      // Ensure setup is called - maybe redundant
      // vrm.firstPerson.setup(); // Usually called once after load

      if (isFirstPerson) {
        console.log("Switching to First Person Layers");
        camera.layers.enable(vrm.firstPerson.firstPersonOnlyLayer);
        camera.layers.disable(vrm.firstPerson.thirdPersonOnlyLayer);
        // Immediately update to start moving towards the first-person view
        // updateFirstPerson(0.1);
      } else {
        console.log("Switching to Third Person Layers");
        camera.layers.disable(vrm.firstPerson.firstPersonOnlyLayer);
        camera.layers.enable(vrm.firstPerson.thirdPersonOnlyLayer);
        // Immediately update to start moving towards the third-person view
        // updateThirdPerson(0.1);
      }
    } else {
      console.warn("VRM firstPerson setup not available!");
    }
  }

  // Update Function
  function update(timeElapsed) {
    if (!vrm) return;

    if (isFirstPerson) {
      updateFirstPerson(timeElapsed);
    } else {
      updateThirdPerson(timeElapsed);
    }
  }

  // Initial Setup
  // Start in third person
  currentPosition.copy(calculateThirdPersonOffset());
  currentLookAt.copy(calculateThirdPersonLookAt());
  camera.position.copy(currentPosition);
  camera.lookAt(currentLookAt);
  if (vrm.firstPerson) {
    // Set initial layers correctly
    camera.layers.disable(vrm.firstPerson.firstPersonOnlyLayer);
    camera.layers.enable(vrm.firstPerson.thirdPersonOnlyLayer);
  }

  return {
    update,
    toggleFirstPerson,
    isFirstPerson: () => isFirstPerson,
  };
}
