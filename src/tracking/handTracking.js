import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let handLandmarker;
let previousPosition = { x: 0, y: 0 };
let currentPosition = { x: 0, y: 0 };
const slashThreshold = 0.05; // Adjust based on game testing

// Initialize MediaPipe Hand Tracking
export async function initHandTracking(videoElement, onSlashDetected) {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "./hand_landmarker.task", // Ensure this path is correct
    },
    runningMode: "VIDEO",
    numHands: 2,
  });

  // Initialize webcam stream
  await setupCamera(videoElement);

  // Ensure the video element has valid dimensions before starting detection
  videoElement.onloadedmetadata = () => {
    videoElement.width = videoElement.videoWidth;
    videoElement.height = videoElement.videoHeight;
    detectHands(videoElement, onSlashDetected);
  };
}

// Set up the webcam stream
async function setupCamera(videoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
  });
  videoElement.srcObject = stream;
  videoElement.play();

  videoElement.style.display = "none"; // Hide the video element if not needed
}

// Detect hands in a loop
async function detectHands(videoElement, onSlashDetected) {
  if (
    handLandmarker &&
    videoElement.videoWidth > 0 &&
    videoElement.videoHeight > 0
  ) {
    const results = await handLandmarker.detectForVideo(
      videoElement,
      performance.now()
    );

    if (results.landmarks && results.landmarks.length > 0) {
      const hand = results.landmarks[0]; // First hand detected
      const indexFingerTip = hand[8]; // Index finger tip

      const x = indexFingerTip.x;
      const y = indexFingerTip.y;

      detectSlashingMovement(x, y, onSlashDetected);
    }
  }

  // Continue detection loop
  if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
    requestAnimationFrame(() => detectHands(videoElement, onSlashDetected));
  }
}

// Detect slashing based on velocity
function detectSlashingMovement(x, y, onSlashDetected) {
  currentPosition.x = x;
  currentPosition.y = y;

  const velocity = Math.sqrt(
    Math.pow(currentPosition.x - previousPosition.x, 2) +
      Math.pow(currentPosition.y - previousPosition.y, 2)
  );

  if (velocity > slashThreshold) {
    onSlashDetected();
  }

  previousPosition.x = currentPosition.x;
  previousPosition.y = currentPosition.y;
}
