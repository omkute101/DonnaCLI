import { Microphone } from './src/voice/microphone.js';

async function test() {
  const mic = new Microphone();
  const stream = await mic.start();
  console.log('Mic started.');
  
  let chunkCount = 0;
  stream.on('data', chunk => {
    chunkCount++;
    if (chunkCount % 50 === 0) console.log('Chunks:', chunkCount);
  });
  
  stream.on('end', () => console.log('Stream ENDED!'));
  stream.on('error', err => console.log('Stream ERROR:', err));
  stream.on('close', () => console.log('Stream CLOSED!'));
  
  setTimeout(() => {
    console.log('Ending test, total chunks:', chunkCount);
    mic.stop();
  }, 4000);
}
test();
