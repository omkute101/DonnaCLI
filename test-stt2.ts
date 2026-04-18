import { ElevenLabsSTT } from './src/voice/stt.js';

async function test() {
  const stt = new ElevenLabsSTT();
  console.log('Connecting to STT...');
  await stt.connect();
  console.log('Connected!');

  // @ts-ignore
  stt.ws.on('close', (code, reason) => {
    console.log('WS CLOSE:', code, reason.toString());
  });

  // @ts-ignore
  stt.ws.on('message', (msg) => {
    console.log('WS MSG:', msg.toString());
  });

  setInterval(() => {
    console.log('ping');
    stt.sendAudioChunk(Buffer.alloc(3200));
  }, 1000);
}
test();
