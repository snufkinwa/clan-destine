import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { updateCameraBehindVRM } from "../../utils.js";
import { loadPlayerAnimations, playAnimation } from "./actions.js";
import {
  initializePlayerPosition,
  updatePlayerPosition,
} from "./playerPositionManager.js";

let currentVrm = null;
let mixer = null;
let animationQueue = [];
let isAnimating = false;
let currentAction = null;

// Animation durations in seconds
const ANIMATION_TIMINGS = {
  idle: 1.0,
  slash3: 0.833, // Right slash
  slash4: 0.833, // Left slash
  slash5: 1.0, // Both swords
  slash6: 0.833, // Right slash variation
  slash2: 1.0, // Both swords variation
};

const blueSwordPath = "./models/song_of_broken_pines_sword_free.glb";
const axePath = "./models/verdict_axe_free.glb";

export function initPlayer(
  scene,
  camera,
  controls,
  vrmPath = "./models/test2.vrm"
) {
  const gltfLoader = new GLTFLoader();
  gltfLoader.crossOrigin = "anonymous";
  gltfLoader.register((parser) => new VRMLoaderPlugin(parser));

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

        vrm.firstPerson.setup();

        mixer = new THREE.AnimationMixer(vrm.scene);

        loadSwords(scene);
        updateCameraBehindVRM(camera, vrm);
        controls.target.copy(vrm.scene.position);

        // Load animations after VRM is initialized
        loadPlayerAnimations(vrm)
          .then(() => {
            playAnimation("idle", mixer);
            console.log("Idle animation started");
          })
          .catch((error) => {
            console.error("Failed to load animations:", error);
          });

        resolve(vrm);
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
      // Find the first mesh in the loaded model
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

export function updatePlayer(deltaTime) {
  if (currentVrm) {
    currentVrm.update(deltaTime);
    updatePlayerPosition(currentVrm, deltaTime);
  }

  if (mixer) {
    mixer.update(deltaTime);
  }
}

function onAnimationFinished(event) {
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

  // Set up the animation to trigger onAnimationFinished when done
  if (currentAction) {
    currentAction.clampWhenFinished = true;
    currentAction.loop = THREE.LoopOnce;
    mixer.addEventListener("finished", onAnimationFinished);
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

function queueAnimation(animationName) {
  // If we're not currently animating or the queue is empty, execute immediately
  if (!isAnimating && animationQueue.length === 0) {
    executeAnimation(animationName);
  } else {
    // Only queue if it won't exceed our buffer
    if (animationQueue.length < 2) {
      animationQueue.push(animationName);
    }
  }
}
export function getPlayer() {
  return currentVrm;
}

export function getMixer() {
  return mixer;
}
