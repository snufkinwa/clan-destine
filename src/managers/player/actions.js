// actions.js
import * as THREE from "three";
import { createVRMAnimationHumanoidTracks } from "@pixiv/three-vrm-animation";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { loadMixamoAnimation } from "./mixamoAnimationLoader.js"; // Assuming you reuse the loadMixamoAnimation

const animations = {};

/**
 * Load all animations into a dictionary and return a promise
 */
export function loadPlayerAnimations(vrm) {
  const animationPaths = {
    idle: "./models/animations/idle.fbx",
    slash1: "./models/animations/slash1.fbx",
    slash2: "./models/animations/slash2.fbx",
    slash3: "./models/animations/slash3.fbx",
    slash4: "./models/animations/slash4.fbx",
    slash5: "./models/animations/slash5.fbx",
    slash6: "./models/animations/slash6.fbx",
  };

  const promises = Object.keys(animationPaths).map((key) => {
    return loadMixamoAnimation(animationPaths[key], vrm).then((clip) => {
      animations[key] = clip;
    });
  });

  return Promise.all(promises);
}

/**
 * Play an animation on the VRM model
 */
export function playAnimation(action, mixer) {
  const clip = animations[action];
  if (clip) {
    const actionClip = mixer.clipAction(clip);
    actionClip.reset();
    actionClip.play();
  } else {
    console.warn(`Animation ${action} not found!`);
  }
}

/**
 * Stop the current animation
 */
export function stopAnimation(mixer) {
  mixer.stopAllAction();
}

let leftHandAnimationWeight = 1;
let rightHandAnimationWeight = 1;

// Function to animate the left and right hand grips using VRM humanoid tracks
export function animateHandGrips(vrm, mixer) {
  if (!vrm || !mixer) return;

  //TODO: Simple VRM animation tatic of making the hands grip
  /*"LeftHandAnimationName":"L_Grip","LeftHandAnimationWeight":1.0,"RightHandAnimationName":"R_Grip","RightHandAnimationWeight":1.0 */
}
