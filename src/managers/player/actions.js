import * as THREE from "three";
import { loadMixamoAnimation } from "./mixamoAnimationLoader.js";

const animations = {};
const animationPaths = {
  idle: "/models/animations/idle.fbx",
  slash1: "/models/animations/slash1.fbx",
  slash2: "/models/animations/slash2.fbx",
  slash3: "/models/animations/slash3.fbx",
  slash4: "/models/animations/slash4.fbx",
  slash5: "/models/animations/slash5.fbx",
  slash6: "/models/animations/slash6.fbx",
};

export function loadPlayerAnimations(vrm) {
  const promises = Object.entries(animationPaths).map(([key, path]) =>
    loadMixamoAnimation(path, vrm).then((clip) => {
      if (clip) {
        clip.loop = key === "idle" ? THREE.LoopRepeat : THREE.LoopOnce;
        animations[key] = clip;
        console.log(`Loaded animation: ${key}`);
      } else {
        console.warn(`Failed to load animation: ${key}`);
      }
    })
  );

  return Promise.all(promises).then(() => {
    console.log("All animations loaded:", Object.keys(animations));
  });
}

export function playAnimation(action, mixer) {
  const clip = animations[action];
  if (clip) {
    mixer.stopAllAction();
    const actionClip = mixer.clipAction(clip);
    actionClip.reset();

    if (action !== "idle") {
      actionClip.clampWhenFinished = true;
      actionClip.loop = THREE.LoopOnce;
    }

    actionClip.play();
    return actionClip;
  } else {
    console.warn(`Animation ${action} not found!`);
    return null;
  }
}

export function stopAnimation(mixer) {
  mixer.stopAllAction();
}

export function animateHandGrips(vrm, mixer) {
  if (!vrm || !mixer) return;

  const leftHandTrack = new THREE.QuaternionKeyframeTrack(
    "leftHand.quaternion",
    [0, 1],
    [0, 0, 0, 1, 0.3, 0.3, 0.3, 0.7]
  );

  const rightHandTrack = new THREE.QuaternionKeyframeTrack(
    "rightHand.quaternion",
    [0, 1],
    [0, 0, 0, 1, -0.3, 0.3, -0.3, 0.7]
  );

  const gripClip = new THREE.AnimationClip("handGrip", 1, [
    leftHandTrack,
    rightHandTrack,
  ]);
  const gripAction = mixer.clipAction(gripClip);
  gripAction.play();
}
