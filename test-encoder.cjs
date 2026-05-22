const lamejs = require('@breezystack/lamejs');
console.log("lamejs keys:", Object.keys(lamejs));
try {
  const encoder = new lamejs.Mp3Encoder(1, 44100, 128);
  console.log("encoder created successfully");
} catch(e) {
  console.error("encoder creation failed:", e);
}
