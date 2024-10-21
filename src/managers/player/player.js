import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { updateCameraBehindVRM } from "../../utils.js";
import { loadPlayerAnimations, playAnimation } from "./actions.js";

let currentVrm = null;
let leftSword = null;
let rightSword = null;
let mixer = null;

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

function adjustWeapon(
  weapon,
  rotationX,
  rotationY,
  rotationZ,
  posX,
  posY,
  posZ,
  scaleX,
  scaleY,
  scaleZ
) {
  weapon.rotation.set(rotationX, rotationY, rotationZ);
  weapon.position.set(posX, posY, posZ);
  weapon.scale.set(scaleX, scaleY, scaleZ);
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
  }

  if (mixer) {
    mixer.update(deltaTime);
  }
}

export function triggerSlashAnimation() {
  if (currentVrm && leftSword && rightSword) {
    console.log("Slash animation triggered");
    playAnimation("slash1", mixer);
  }
}

export function getPlayer() {
  return currentVrm;
}

export function getMixer() {
  return mixer;
}
