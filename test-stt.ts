import { ElevenLabsSTT } from './src/voice/stt.js';
import fs from 'fs';
import { store } from './src/config/store.js';

async function test() {
  const stt = new ElevenLabsSTT();
  console.log('Connecting to STT...');
  await stt.connect();
  console.log('Connected! Sending audio...');

  stt.on('partial', text => console.log('Partial:', text));
  stt.on('committed', text => console.log('Committed:', text));
  stt.on('error', err => console.error('STT Error:', err));

  // Sending chunks of valid PCM data (just random noise)
  // Actually, ElevenLabs expects a base64 string.
  const interval = setInterval(() => {
    // 3200 bytes is 100ms at 16kHz 16-bit
    const chunk = Buffer.alloc(3200);
    for (let i=0; i<3200; i++) chunk[i] = Math.random() * 255;
    stt.sendAudioChunk(chunk);
  }, 100);

  setTimeout(() => {
    clearInterval(interval);
    stt.disconnect();
    console.log('Done');
  }, 3000);
}
test();
