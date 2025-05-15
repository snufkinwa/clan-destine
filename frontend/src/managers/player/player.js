import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { VRMCoreLoaderPlugin } from "@pixiv/three-vrm-core";
import { updateCameraBehindVRM } from "../../utils/utils.js";
import {
  loadPlayerAnimations,
  playAnimation,
  triggerProceduralSlash,
} from "./actions.js";
import {
  initializePlayerPosition,
  updatePlayerPosition,
} from "./playerPositionManager.js";
import { ANIMATION_TIMINGS } from "../../utils/constants.js";
import { checkCollisions } from "../boxManager.js";
import { visualizeSlashArea } from "../../utils/debugVisuals.js";

let currentVrm = null;
let mixer = null;
let animationQueue = [];
let isAnimating = false;
let currentAction = null;
let leftSword = null;
let rightSword = null;
let activeCollisionCheck = null;

const blueSwordPath = "./models/song_of_broken_pines_sword_free.glb";
const axePath = "./models/verdict_axe_free.glb";

const COLLISION_WINDOWS = {
  slash3: { start: 0.2, end: 0.5 }, // Right slash
  slash4: { start: 0.2, end: 0.5 }, // Left slash
  slash5: { start: 0.2, end: 0.6 }, // Both swords
  slash6: { start: 0.2, end: 0.5 }, // Right variation
  slash2: { start: 0.2, end: 0.6 }, // Both variation
};

export function initPlayer(
  scene,
  camera,
  controls,
  vrmPath = "./models/test2.vrm"
) {
  const gltfLoader = new GLTFLoader();
  gltfLoader.crossOrigin = "anonymous";
  gltfLoader.register((parser) => new VRMCoreLoaderPlugin(parser));

  return new Promise((resolve, reject) => {
    gltfLoader.load(
      vrmPath,
      (gltf) => {
        const vrm = gltf.userData.vrm;

        if (currentVrm) {
          scene.remove(currentVrm.scene);
          VRMUtils.rotateVRM1(vrm);
          initializePlayerPosition(vrm);
        }

        currentVrm = vrm;
        scene.add(vrm.scene);

        vrm.scene.traverse((obj) => {
          obj.frustumCulled = false;
        });

        const firstPerson = vrm.userData.vrmCore.firstPerson;
        firstPerson.setup();

        mixer = new THREE.AnimationMixer(vrm.scene);

        loadSwords(scene);
        updateCameraBehindVRM(camera, vrm);
        controls.target.copy(vrm.scene.position);

        // Load animations after VRM is initialized
        loadPlayerAnimations(vrm)
          .then(() => {
            playAnimation("idle", mixer);
            console.log("Idle animation started");
            resolve(vrm);
          })
          .catch((error) => {
            console.error("Failed to load animations:", error);
          });
      },
      (progress) =>
        console.log(
          `Loading VRM model... ${(progress.loaded / progress.total) * 100}%`
        ),
      (error) => {
        console.error("Error loading VRM model:", error);
        reject(error);
      }
    );
  });
}

function loadSwords(scene) {
  const gltfLoader = new GLTFLoader();

  gltfLoader.load(
    blueSwordPath,
    (gltf) => {
      console.log("Blue sword loaded:", gltf);
      const swordMesh = gltf.scene.getObjectByProperty("type", "Mesh");
      if (swordMesh) {
        const swordContainer = new THREE.Object3D();
        swordContainer.add(swordMesh);

        swordMesh.position.set(0, 0, 0);
        swordMesh.rotation.set(0, 0, 0);
        const leftHand = currentVrm.humanoid.getNormalizedBoneNode("leftHand");
        if (leftHand) {
          leftHand.add(swordContainer);

          swordContainer.position.set(0.05, -0.07, 0.35);
          swordContainer.rotation.set(2, -1.5, -Math.PI / 1.5);

          swordContainer.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI / 2);

          swordContainer.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 4);

          swordContainer.scale.set(0.05, 0.05, 0.05);
        }

        leftSword = swordContainer;
      } else {
        console.error("No mesh found in the Blue sword model");
      }
    },
    (progress) => {
      console.log(
        "Loading Blue sword...",
        (progress.loaded / progress.total) * 100,
        "%"
      );
    },
    (error) => {
      console.error("Error loading Blue sword:", error);
    }
  );

  gltfLoader.load(
    axePath,
    (gltf) => {
      console.log("Axe loaded:", gltf);
      const axeMesh = gltf.scene.getObjectByProperty("type", "Mesh");
      if (axeMesh) {
        const axeContainer = new THREE.Object3D();
        axeContainer.add(axeMesh);

        axeMesh.position.set(0, 0, 0);
        axeMesh.rotation.set(0, 0, 0);

        axeMesh.rotateX(Math.PI);

        const rightHand =
          currentVrm.humanoid.getNormalizedBoneNode("rightHand");
        if (rightHand) {
          rightHand.add(axeContainer);

          axeContainer.position.set(-0.05, -0.07, 0.35);
          axeContainer.rotation.set(2, 1.5, Math.PI / 1.5);

          axeContainer.rotateOnAxis(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
          axeContainer.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 4);

          axeContainer.scale.set(0.07, 0.07, 0.07);
        }
        rightSword = axeContainer;
      } else {
        console.error("No mesh found in the Axe model");
      }
    },
    (progress) => {
      console.log(
        `Loading Axe... ${(progress.loaded / progress.total) * 100}%`
      );
    },
    (error) => {
      console.error("Error loading Axe:", error);
    }
  );
}

export function getSwords() {
  return {
    leftSword,
    rightSword,
  };
}

export function updatePlayer(deltaTime) {
  if (currentVrm) {
    currentVrm.update(deltaTime);
    updatePlayerPosition(currentVrm, deltaTime);
  }

  if (mixer) {
    mixer.update(deltaTime);
  }
}

function startCollisionDetection(animationName) {
  if (!COLLISION_WINDOWS[animationName]) return;

  const window = COLLISION_WINDOWS[animationName];
  const duration = ANIMATION_TIMINGS[animationName];
  const startTime = window.start * duration * 1000; // Convert to milliseconds
  const endTime = window.end * duration * 1000;

  // Clear any existing collision check
  if (activeCollisionCheck) {
    clearInterval(activeCollisionCheck);
  }

  // Start the collision detection after the start window
  setTimeout(() => {
    const checkInterval = 50; // Check every 50ms during the collision window
    let initialPositions = {
      left: leftSword ? leftSword.getWorldPosition(new THREE.Vector3()) : null,
      right: rightSword
        ? rightSword.getWorldPosition(new THREE.Vector3())
        : null,
    };

    activeCollisionCheck = setInterval(() => {
      const currentPositions = {
        left: leftSword
          ? leftSword.getWorldPosition(new THREE.Vector3())
          : null,
        right: rightSword
          ? rightSword.getWorldPosition(new THREE.Vector3())
          : null,
      };

      // Determine which swords to check based on animation
      const checkLeft = ["slash4", "slash5", "slash2"].includes(animationName);
      const checkRight = ["slash3", "slash5", "slash2", "slash6"].includes(
        animationName
      );

      // Perform collision checks
      if (checkLeft && initialPositions.left && currentPositions.left) {
        visualizeSlashArea(initialPositions.left, currentPositions.left);
        checkCollisions(currentVrm, leftSword, null);
      }

      if (checkRight && initialPositions.right && currentPositions.right) {
        visualizeSlashArea(initialPositions.right, currentPositions.right);
        checkCollisions(currentVrm, null, rightSword);
      }

      // Update initial positions for next check
      initialPositions = currentPositions;
    }, checkInterval);

    // Stop collision detection after the window ends
    setTimeout(() => {
      clearInterval(activeCollisionCheck);
      activeCollisionCheck = null;
    }, endTime - startTime);
  }, startTime);
}

function onAnimationFinished(event) {
  // Clear any remaining collision detection
  if (activeCollisionCheck) {
    clearInterval(activeCollisionCheck);
    activeCollisionCheck = null;
  }

  isAnimating = false;
  if (animationQueue.length > 0) {
    const nextAnimation = animationQueue.shift();
    executeAnimation(nextAnimation);
  } else {
    playAnimation("idle", mixer);
  }
}

function executeAnimation(animationName) {
  isAnimating = true;
  currentAction = playAnimation(
    animationName,
    mixer,
    ANIMATION_TIMINGS[animationName]
  );

  if (currentAction) {
    currentAction.clampWhenFinished = true;
    currentAction.loop = THREE.LoopOnce;
    mixer.addEventListener("finished", onAnimationFinished);

    // Start collision detection for this animation
    startCollisionDetection(animationName);
  }
}

export function triggerSlashLeft() {
  queueAnimation("slash4");
}

export function triggerSlashRight() {
  queueAnimation("slash3");
}

export function triggerSlashBoth() {
  queueAnimation("slash5");
}

export function triggerSlashRightBone(vrm) {
  triggerProceduralSlash(vrm, "right");
}

export function triggerSlashLeftBone(vrm) {
  triggerProceduralSlash(vrm, "left");
}

function queueAnimation(animationName) {
  if (!isAnimating && animationQueue.length === 0) {
    executeAnimation(animationName);
  } else if (animationQueue.length < 2) {
    animationQueue.push(animationName);
  }
}

export function getPlayer() {
  return currentVrm;
}

export function getMixer() {
  return mixer;
}
