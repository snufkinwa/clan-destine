import * as THREE from "three";

const objectMap = new Map();

// Function to add an object to the scene and store it in the object map
//SFX effects maybe should be added here
export function addObjectToScene(id, object, scene) {
  if (!objectMap.has(id)) {
    scene.add(object);
    objectMap.set(id, object);
  } else {
    console.warn(`Object with ID ${id} already exists in the scene.`);
  }
}

export function removeObjectFromScene(id, scene) {
  const object = objectMap.get(id);
  if (object) {
    scene.remove(object); // Remove from scene
    objectMap.delete(id); // Remove from map
  } else {
    console.warn(`Object with ID ${id} does not exist in the scene.`);
  }
}

export function getObjectById(id) {
  return objectMap.get(id);
}

export function updateObjects(deltaTime) {
  objectMap.forEach((object) => {
    if (object.update) {
      object.update(deltaTime);
    }
  });
}

export function getObjectCount() {
  return objectMap.size;
}
