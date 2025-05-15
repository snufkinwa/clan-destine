import * as THREE from "three";

function loadShader(url) {
  return fetch(url).then((response) => response.text());
}

export function createWaves(scene) {
  const debugObject = {
    waveDepthColor: "#1e4d40",
    waveSurfaceColor: "#4d9aaa",
    fogNear: 1,
    fogFar: 3,
    fogColor: "#8e99a2",
  };

  Promise.all([
    loadShader("./shaders/waterVertexShader.glsl"),
    loadShader("./shaders/waterFragmentShader.glsl"),
  ]).then(([vertexShader, fragmentShader]) => {
    // Create water geometry and material
    const waterGeometry = new THREE.PlaneGeometry(50, 40, 512, 512);
    const waterMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      fog: true,
      uniforms: {
        uTime: { value: 0 },
        uBigWavesElevation: { value: 0.2 },
        uBigWavesFrequency: { value: new THREE.Vector2(4, 2) },
        uBigWaveSpeed: { value: 0.75 },
        // Small Waves
        uSmallWavesElevation: { value: 0.15 },
        uSmallWavesFrequency: { value: 3 },
        uSmallWavesSpeed: { value: 0.2 },
        uSmallWavesIterations: { value: 4 },
        // Colors
        uDepthColor: { value: new THREE.Color(0x1e4d40) }, // Instead of using string
        uSurfaceColor: { value: new THREE.Color(0x4d9aaa) },
        uColorOffset: { value: 0.08 },
        uColorMultiplier: { value: 5 },
        // Fog
        ...THREE.UniformsLib["fog"],
      },
    });

    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI * 0.5;
    water.position.set(0, -0.5, 23);

    scene.add(water);
    let clock = new THREE.Clock();

    function animateWaves() {
      waterMaterial.uniforms.uTime.value = clock.getElapsedTime();
      requestAnimationFrame(animateWaves);
    }

    // Start the wave animation
    animateWaves();
  });
}
