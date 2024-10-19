import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { updateCameraBehindVRM } from "../../utils.js";
import { animateHandGrips, playAnimation } from "./actions.js";

let currentVrm = null;
let leftSword = null;
let rightSword = null;
let mixer = null;

// Hardcoded sword paths
const goldSwordPath =
  "./models/L6FantasySwordVer.1.1_Black/L6FantasySwordVer.1.0.fbx";
const blackSwordPath =
  "./models/L6FantasySwordVer.1.1_Gold/L6FantasySwordVer.1.0.fbx";

// Initialize the player with the VRM model and attach the swords
export function initPlayer(
  scene,
  camera,
  controls,
  vrmPath = "./models/test2.vrm"
) {
  const gltfLoader = new GLTFLoader();
  gltfLoader.crossOrigin = "anonymous";
  gltfLoader.register((parser) => {
    return new VRMLoaderPlugin(parser);
  });

  return new Promise((resolve, reject) => {
    // Load the VRM model
    gltfLoader.load(
      vrmPath,
      (gltf) => {
        const vrm = gltf.userData.vrm;
        if (currentVrm) {
          scene.remove(currentVrm.scene);

          VRMUtils.deepDispose(currentVrm.scene);
        }

        currentVrm = vrm;
        scene.add(vrm.scene);

        vrm.scene.traverse((obj) => {
          obj.frustumCulled = false;
        });

        mixer = new THREE.AnimationMixer(vrm.scene);

        // Load and attach the swords
        loadSwords(scene);

        updateCameraBehindVRM(camera, vrm);
        controls.target.copy(vrm.scene.position);

        playAnimation("idle", mixer);

        resolve(vrm);
      },
      (progress) => {
        console.log(
          "Loading VRM model...",
          (progress.loaded / progress.total) * 100,
          "%"
        );
      },
      (error) => {
        console.error("Error loading VRM model:", error);
        reject(error);
      }
    );
  });
}

// Function to load and attach gold and black swords to the VRM hands
function loadSwords(scene) {
  const fbxLoader = new FBXLoader();

  // Load the gold sword and attach to the left hand
  fbxLoader.load(
    goldSwordPath,
    (fbx) => {
      console.log("Gold sword loaded:", fbx);
      leftSword = fbx.clone();
      const leftHand = currentVrm.humanoid.getNormalizedBoneNode("leftHand");

      if (leftHand) {
        leftHand.add(leftSword);
        leftSword.position.set(0.05, 0, 0.1);
        leftSword.scale.set(0.01, 0.01, 0.01); // Adjust position as needed
      }
    },
    (progress) => {
      console.log(
        "Loading gold sword...",
        (progress.loaded / progress.total) * 100,
        "%"
      );
    },
    (error) => {
      console.error("Error loading gold sword:", error);
    }
  );

  // Load the black sword and attach to the right hand
  fbxLoader.load(
    blackSwordPath,
    (fbx) => {
      console.log("Black sword loaded:", fbx);
      rightSword = fbx.clone();
      const rightHand = currentVrm.humanoid.getNormalizedBoneNode("rightHand");

      if (rightHand) {
        rightHand.add(rightSword);
        rightSword.position.set(-0.04, 0, 0.1);
        rightSword.scale.set(0.01, 0.01, 0.01); // Adjust position as needed
      }
    },
    (progress) => {
      console.log(
        "Loading black sword...",
        (progress.loaded / progress.total) * 100,
        "%"
      );
    },
    (error) => {
      console.error("Error loading black sword:", error);
    }
  );
}

// In the main animation loop, update the mixer
function animate(deltaTime) {
  requestAnimationFrame(animate);

  if (currentVrm) {
    updatePlayer(deltaTime);
  }

  if (mixer) {
    mixer.update(deltaTime);
  }
}

animate(0); // Start the animation loop

// Update the player (and any animations) on every frame
export function updatePlayer(deltaTime) {
  if (currentVrm) {
    currentVrm.update(deltaTime);
  }
}

// Trigger the sword slash animation
export function triggerSlashAnimation() {
  if (currentVrm && leftSword && rightSword) {
    // Add sword-slashing logic here (animations or movements)
    console.log("Slash animation triggered");
    playAnimation("slash1", mixer);
  }
}

// Get the current VRM player
export function getPlayer() {
  return currentVrm;
}
