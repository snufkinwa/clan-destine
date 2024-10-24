import * as THREE from "three";
import { math } from "./math.js";

export function createCameraSystems(camera, target) {
  let currentPosition = new THREE.Vector3();
  let currentLookAt = new THREE.Vector3();
  let isFirstPerson = false;

  // Keep track of the transition state to prevent continuous movement
  let transitioning = false;

  function calculateThirdPersonOffset() {
    const idealOffset = new THREE.Vector3(0, 2, -5);
    idealOffset.applyQuaternion(target.scene.quaternion);
    idealOffset.add(target.scene.position);
    return idealOffset;
  }

  function calculateThirdPersonLookAt() {
    const idealLookAt = new THREE.Vector3(0, 1, 10);
    idealLookAt.applyQuaternion(target.scene.quaternion);
    idealLookAt.add(target.scene.position);
    return idealLookAt;
  }

  function updateThirdPerson(timeElapsed) {
    if (!transitioning) return; // Only move if transitioning

    const idealOffset = calculateThirdPersonOffset();
    const idealLookAt = calculateThirdPersonLookAt();

    const t = 1.0 - Math.pow(0.001, timeElapsed);

    // Use math.smootherstep for smoother transition of position and lookAt
    currentPosition.x = math.smootherstep(t, currentPosition.x, idealOffset.x);
    currentPosition.y = math.smootherstep(t, currentPosition.y, idealOffset.y);
    currentPosition.z = math.smootherstep(t, currentPosition.z, idealOffset.z);

    currentLookAt.x = math.smootherstep(t, currentLookAt.x, idealLookAt.x);
    currentLookAt.y = math.smootherstep(t, currentLookAt.y, idealLookAt.y);
    currentLookAt.z = math.smootherstep(t, currentLookAt.z, idealLookAt.z);

    camera.position.copy(currentPosition);
    camera.lookAt(currentLookAt);

    // End transition when near the target position
    if (currentPosition.distanceTo(idealOffset) < 0.01) {
      transitioning = false;
    }
  }

  function updateFirstPerson() {
    if (!transitioning) return; // Only move if transitioning

    if (target.firstPerson && target.firstPerson.firstPersonBone) {
      const firstPersonBone = target.firstPerson.firstPersonBone;

      // Get the ideal first-person position and quaternion
      const idealPosition = firstPersonBone.getWorldPosition(
        new THREE.Vector3()
      );
      const idealQuaternion = firstPersonBone.getWorldQuaternion(
        new THREE.Quaternion()
      );

      // Use math.lerp for smooth position transition
      currentPosition.x = math.lerp(0.1, currentPosition.x, idealPosition.x);
      currentPosition.y = math.lerp(0.1, currentPosition.y, idealPosition.y);
      currentPosition.z = math.lerp(0.1, currentPosition.z, idealPosition.z);

      // Use slerp for smooth rotation transition
      camera.quaternion.slerp(idealQuaternion, 0.1);

      // Update camera position and quaternion
      camera.position.copy(currentPosition);

      if (currentPosition.distanceTo(idealPosition) < 0.01) {
        transitioning = false;
      }
    }
  }

  function toggleFirstPerson(forceState) {
    if (typeof forceState === "boolean") {
      isFirstPerson = forceState;
    } else {
      isFirstPerson = !isFirstPerson;
    }

    if (target.firstPerson) {
      transitioning = true; // Trigger smooth transition
      if (isFirstPerson) {
        camera.layers.enable(target.firstPerson.firstPersonOnlyLayer);
        camera.layers.disable(target.firstPerson.thirdPersonOnlyLayer);
      } else {
        camera.layers.disable(target.firstPerson.firstPersonOnlyLayer);
        camera.layers.enable(target.firstPerson.thirdPersonOnlyLayer);
      }
    }
  }

  function update(timeElapsed) {
    if (isFirstPerson) {
      updateFirstPerson();
    } else {
      updateThirdPerson(timeElapsed);
    }
  }

  return {
    update,
    toggleFirstPerson,
    isFirstPerson: () => isFirstPerson,
  };
}
