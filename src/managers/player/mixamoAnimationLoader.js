import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { mixamoVRMRigMap } from "./mixamoVRMRigMap.js";

export function loadMixamoAnimation(url, vrm) {
  const loader = new FBXLoader();
  console.log(`Attempting to load animation from: ${url}`);

  return loader
    .loadAsync(url)
    .then((asset) => {
      if (!asset.animations.length) {
        console.error(`No animations found in ${url}`);
        return null;
      }

      console.log(`Successfully loaded animations from ${url}`);
      const clip = asset.animations[0];
      const tracks = [];

      const restRotationInverse = new THREE.Quaternion();
      const parentRestWorldRotation = new THREE.Quaternion();
      const _quatA = new THREE.Quaternion();
      const _vec3 = new THREE.Vector3();

      // Adjust with reference to hips height
      const motionHipsHeight =
        asset.getObjectByName("mixamorigHips").position.y;
      const vrmHipsY = vrm.humanoid
        ?.getNormalizedBoneNode("hips")
        .getWorldPosition(_vec3).y;
      const vrmRootY = vrm.scene.getWorldPosition(_vec3).y;
      const vrmHipsHeight = Math.abs(vrmHipsY - vrmRootY);
      const hipsPositionScale = vrmHipsHeight / motionHipsHeight;

      clip.tracks.forEach((track) => {
        const [mixamoRigName, propertyName] = track.name.split(".");
        const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
        const vrmNodeName =
          vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;
        const mixamoRigNode = asset.getObjectByName(mixamoRigName);

        if (vrmNodeName != null) {
          mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
          mixamoRigNode.parent.getWorldQuaternion(parentRestWorldRotation);

          if (track instanceof THREE.QuaternionKeyframeTrack) {
            const values = track.values.slice();
            for (let i = 0; i < values.length; i += 4) {
              _quatA.fromArray(values, i);
              _quatA
                .premultiply(parentRestWorldRotation)
                .multiply(restRotationInverse);
              _quatA.toArray(values, i);
            }

            // For VRM 1.0, flip the quaternion
            if (vrm.meta?.metaVersion === "1") {
              for (let i = 0; i < values.length; i += 2) {
                values[i] *= -1;
                values[i + 1] *= -1;
              }
            }

            tracks.push(
              new THREE.QuaternionKeyframeTrack(
                `${vrmNodeName}.${propertyName}`,
                track.times,
                values
              )
            );
          } else if (track instanceof THREE.VectorKeyframeTrack) {
            const values = track.values.map((v, i) => {
              if (vrm.meta?.metaVersion === "1" && i % 3 !== 1) {
                return -v * hipsPositionScale;
              }
              return v * hipsPositionScale;
            });

            tracks.push(
              new THREE.VectorKeyframeTrack(
                `${vrmNodeName}.${propertyName}`,
                track.times,
                values
              )
            );
          }
        }
      });

      return new THREE.AnimationClip("vrmAnimation", clip.duration, tracks);
    })
    .catch((error) => {
      console.error(`Error loading FBX from ${url}:`, error);
      return null;
    });
}
