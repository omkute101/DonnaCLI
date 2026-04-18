import { Orchestrator } from './src/pipeline/orchestrator.js';
import { store } from './src/config/store.js';

async function test() {
  console.log('Testing Orchestrator start...');
  const orch = new Orchestrator();
  console.log('voiceInputEnabled:', store.get('voiceInputEnabled'));
  console.log('voiceOutputEnabled:', store.get('voiceOutputEnabled'));
  try {
    const p = orch.start();
    let isResolved = false;
    p.then(() => { isResolved = true; console.log('start() resolved!') }).catch(e => console.error('start() Error:', e));
    
    let s = 0;
    while (!isResolved && s < 5) {
      await new Promise(r => setTimeout(r, 1000));
      console.log('Waiting...', s);
      s++;
    }
  } catch (e) {
    console.error(e);
  }
}
test();
