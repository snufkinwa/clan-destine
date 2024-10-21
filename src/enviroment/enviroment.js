import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { createWaves } from "./waves.js";
import { fitCameraToObject } from "../utils.js";
import { addGroundObject } from "../utils.js";

export function loadEnvironment(scene, camera, controls, groundObjects) {
  const gltfLoader = new GLTFLoader();
  const fbxLoader = new FBXLoader();

  const bridgePath = "./models/wooden_bridge_village_wood.glb";
  const churchRuinsPath = "./models/source/SketchfabScene_2.fbx";
  const treeGatePath = "./models/tree_gate.glb";
  const cliffPath = "./models/sea_cliff_rock_face.glb";
  const groundPath = "./models/grass_filed.glb";
  const treePath = "./models/old_tree.glb";

  fbxLoader.load(
    churchRuinsPath,
    (fbx) => {
      console.log("Church ruins loaded successfully.");
      fbx.position.set(3, -0.3, -5.5);
      fbx.scale.set(0.001, 0.001, 0.001);
      scene.add(fbx);

      const namesToHide = [
        "Fence_04",
        "Fence_01",
        "Pillar_04",
        "Brick_05",
        "Fence_03",
        "PavementCircle",
        "Pillar_01",
        "Pillar_02",
        "Cube001",
        "Brick_03",
        "Sun",
        "Cube",
        "Ruins_Small_03",
        "Brick_04",
        "Arch_03",
        "Pillar_03",
        "Arch_02",
        "Pillar_05",
        "Brick_01",
        "Ruins_Large_01",
        "Arch_04",
        "Arch_01",
        "Brick_02",
        "Ruins_Small_02",
        "Ruins_Large_02",
        "Ruins_Small_01",
        "Ruins_Large_03",
        "CircularStairs",
        "Well",
        "Column_02",
        "Column_01",
      ];

      fbx.traverse((child) => {
        //console.log(child.name);
        if (child.isMesh && namesToHide.includes(child.name)) {
          child.visible = false; // Hides the mesh
        }

        if (child.isLight) {
          child.intensity = 0;
        }
        if (child.isMesh) {
          child.geometry.computeVertexNormals();
          child.material.emissive?.set(0x000000);
        }
      });
      fitCameraToObject(camera, scene, controls);
    },
    (progress) => {
      console.log(
        "Loading church ruins...",
        (progress.loaded / progress.total) * 100,
        "%"
      );
    },
    (error) => {
      console.error("An error occurred while loading the church ruins:", error);
    }
  );

  gltfLoader.load(
    treePath,
    (gltf) => {
      console.log("Tree loaded successfully.");

      const tree = gltf.scene;

      const squareSize = 5;

      const positions = [
        { x: -squareSize / 2, z: squareSize / 2, y: 20 },
        { x: squareSize / 2, z: squareSize / 2, y: 20 },
        { x: squareSize / 2, z: squareSize / 2, y: 20 },
        { x: -squareSize / 2, z: squareSize / 2, y: 20 },
      ];

      const rotations = [
        Math.atan2(squareSize / 2, squareSize / 2),
        Math.atan2(-squareSize / 2, squareSize / 2),
        Math.atan2(-squareSize / 2, -squareSize / 2),
        Math.atan2(squareSize / 2, -squareSize / 2),
      ];

      positions.forEach((pos, i) => {
        const treeClone = tree.clone();

        treeClone.position.set(pos.x, 4, 30);

        treeClone.rotation.z = rotations[i];

        treeClone.scale.set(1, 1, 1);

        scene.add(treeClone);
      });
    },
    (progress) => {},
    (error) => {
      console.error("An error occurred while loading the tree:", error);
    }
  );

  gltfLoader.load(
    cliffPath,
    (gltf) => {
      console.log("Cliff loaded successfully.");
      scene.add(gltf.scene);
      gltf.scene.position.set(0, -4.93, 4);
      gltf.scene.scale.set(1.75, 1.75, 1.75);
      gltf.scene.rotation.set(0, 2, 0);
    },
    (progress) => {}
  );

  gltfLoader.load(
    treeGatePath,
    (gltf) => {
      console.log("Tree gate loaded successfully.");
      gltf.scene.position.set(-1, -1, 20);
      gltf.scene.scale.set(7, 7, 7);
      scene.add(gltf.scene);
    },
    (progress) => {}
  );

  gltfLoader.load(
    groundPath,
    (gltf) => {
      console.log("Ground loaded successfully.");
      const ground = gltf.scene;

      ground.position.set(0, -0.32, -3.5);
      ground.scale.set(10, 10, 10);
      ground.rotation.set(0, -Math.PI, 0);

      scene.add(ground);
      addGroundObject(groundObjects, ground);
    },
    (progress) => {
      console.log(
        "Loading ground...",
        (progress.loaded / progress.total) * 100,
        "%"
      );
    },
    (error) => {
      console.error("An error occurred while loading the ground:", error);
    }
  );

  const bridgePoints = [];
  let bridgeObject = null;

  gltfLoader.load(
    bridgePath,
    (gltf) => {
      const bridge = gltf.scene;
      bridgeObject = bridge;

      const numBridges = 5;
      const bridgeDistance = 15;

      for (let i = 0; i < numBridges; i++) {
        const bridgeClone = bridge.clone();
        const positionZ = 12 + (i / 2) * bridgeDistance;
        bridgeClone.position.set(0, 0, positionZ);
        scene.add(bridgeClone);

        // Store the position in the bridgePoints array
        bridgePoints.push(new THREE.Vector3(0, 0, positionZ));
      }

      createWaves(scene);

      fitCameraToObject(camera, scene, controls);
    },
    (progress) => {
      console.log(
        "Loading bridge...",
        (progress.loaded / progress.total) * 100,
        "%"
      );
    },
    (error) => {
      console.error("An error occurred while loading the bridge:", error);
    }
  );
}

export function getBridgeObject() {
  return bridgeObject;
}
