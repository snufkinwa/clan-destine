import * as Tone from "tone";
import Meyda from "meyda";

let currentBPM = 80; // Default BPM
let onBPMChange = null;

export function setOnBPMChangeCallback(callback) {
  onBPMChange = callback;
}

export function getCurrentBPM() {
  return currentBPM;
}

export async function processAudio(arrayBuffer, file) {
  const audioContext = Tone.context;
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start(0);
  const renderedBuffer = await offlineContext.startRendering();

  const hopSize = 512;
  const bufferSize = 1024;
  const channelData = renderedBuffer.getChannelData(0);
  const boxes = [];
  const minTimeBetweenBoxes = 1;
  let lastBoxTime = 0;
  let beatTimes = [];

  //  Calculate average energy over the first second
  const samplesInFirstSecond = audioBuffer.sampleRate;
  let totalEnergy = 0;
  for (let i = 0; i < samplesInFirstSecond; i++) {
    totalEnergy += Math.abs(channelData[i]);
  }
  const averageEnergy = totalEnergy / samplesInFirstSecond;

  //  Set dynamic energy threshold based on average energy
  const energyThreshold = averageEnergy * 3;

  // Add a ramp-up period
  const rampUpDuration = 15;
  const rampUpSamples = rampUpDuration * audioBuffer.sampleRate;

  for (let i = 0; i < channelData.length - bufferSize; i += hopSize) {
    const bufferSegment = channelData.slice(i, i + bufferSize);
    const features = Meyda.extract(
      ["rms", "spectralCentroid", "perceptualSpread", "energy"],
      bufferSegment
    );
    const beatStart = i / audioBuffer.sampleRate;

    if (beatStart < 3) continue;

    // Apply a gradual ramp-up to the energy threshold
    //TODO: Make this ramp up more gradual , maybe use a curve, NEEDS TO BE 0 AT THE START
    const rampUpFactor = Math.min(1, i / rampUpSamples);
    const currentEnergyThreshold = energyThreshold * rampUpFactor;

    if (
      features &&
      features.energy > currentEnergyThreshold &&
      beatStart - lastBoxTime >= minTimeBetweenBoxes
    ) {
      lastBoxTime = beatStart;
      beatTimes.push(beatStart);

      const rmsToColor = (rms, lane) => {
        const intensity = Math.min(Math.floor(rms * 255), 255);
        // Aqua blue: rgb(0, 255, 255) for even lanes
        // Crimson red: rgb(220, 20, 60) for odd lanes
        if (lane % 2 === 0) {
          return (0 << 16) | (intensity << 8) | intensity;
        } else {
          return (220 << 16) | (20 << 8) | 60;
        }
      };

      const lane = Math.floor(Math.random() * 4);
      boxes.push({
        lane: lane,
        colspan: 1,
        type: "block",
        beatStart: beatStart,
        beatDuration: 1,
        color: rmsToColor(features.rms, lane),
        rms: features.rms,
      });
    }
  }

  // Calculate BPM
  if (beatTimes.length > 1) {
    const beatIntervals = [];
    for (let i = 1; i < beatTimes.length; i++) {
      beatIntervals.push(beatTimes[i] - beatTimes[i - 1]);
    }
    const averageInterval =
      beatIntervals.reduce((a, b) => a + b) / beatIntervals.length;
    currentBPM = Math.round(60 / averageInterval);

    if (onBPMChange) {
      onBPMChange(currentBPM);
    }
  }

  console.log("Detected BPM:", currentBPM);
  console.log("Generated boxes:", boxes.length);
  console.log("Average energy:", averageEnergy);
  console.log("Energy threshold:", energyThreshold);

  let player;
  try {
    player = new Tone.Player().toDestination();
    player.buffer = audioBuffer;
    console.log("Audio file loaded successfully.");
    return {
      boxes,
      player,
      bpm: currentBPM,
    };
  } catch (error) {
    console.error("Error creating or loading the audio player:", error);
    throw new Error("Audio buffer loading failed.");
  }
}
