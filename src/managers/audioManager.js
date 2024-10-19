import * as Tone from "tone";
import Meyda from "meyda";

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
  const minTimeBetweenBoxes = 0.5;
  let lastBoxTime = 0;

  for (let i = 0; i < channelData.length - bufferSize; i += hopSize) {
    const bufferSegment = channelData.slice(i, i + bufferSize);
    const features = Meyda.extract(
      ["rms", "spectralCentroid", "perceptualSpread"],
      bufferSegment
    );

    const beatStart = i / audioBuffer.sampleRate;

    if (
      features &&
      features.rms > 0.01 &&
      beatStart - lastBoxTime >= minTimeBetweenBoxes
    ) {
      lastBoxTime = beatStart;

      const rmsToColor = (rms) => {
        const intensity = Math.min(Math.floor(rms * 255), 255);
        return (intensity << 16) | (intensity << 8) | intensity; // Grey color based on RMS
      };

      boxes.push({
        lane: Math.floor(Math.random() * 4),
        colspan: 1,
        type: "block",
        beatStart: beatStart,
        beatDuration: 1,
        color: rmsToColor(features.rms),
        rms: features.rms,
      });
    }
  }

  console.log(boxes);

  let player;
  try {
    player = new Tone.Player().toDestination();

    player.buffer = audioBuffer;

    console.log("Audio file loaded successfully.");

    return {
      boxes,
      player,
    };
  } catch (error) {
    console.error("Error creating or loading the audio player:", error);
    throw new Error("Audio buffer loading failed.");
  }
}
