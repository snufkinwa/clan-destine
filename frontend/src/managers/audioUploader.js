export async function uploadAndAnalyzeAudio(file) {
  const formData = new FormData();
  formData.append("file", file);

  const url = "/analyze-audio/";

  console.log(`Attempting to upload audio to:", ${url}`);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Backend Error Response:", errorBody);
    throw new Error(
      `Failed to analyze audio. Status: ${response.status}. ${errorBody}`
    );
  }

  const data = await response.json();
  return data;
}
