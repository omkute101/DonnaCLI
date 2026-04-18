import WebSocket from 'ws';
import { loadEnvConfig } from './src/config/env.js';

const config = loadEnvConfig();
const url = `wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&language_code=en&sample_rate=16000&encoding=pcm_s16le`;
const ws = new WebSocket(url, { headers: { 'xi-api-key': config.ELEVENLABS_API_KEY } });

ws.on('open', () => {
  console.log('Connected!');
  
  // Try sending audio in different formats to see which one works
  setTimeout(() => {
    console.log('Sending raw base64 data string...');
    ws.send(JSON.stringify({"audio": Buffer.alloc(3200).toString('base64')}));
  }, 1000);
});

ws.on('message', (msg) => {
  console.log('WS MSG:', msg.toString());
});
