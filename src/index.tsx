/**
 * Donna CLI — Main Entry Point
 *
 * Handles CLI argument parsing and launches the appropriate mode:
 * - `donna` — Start the voice assistant session
 * - `donna init` — Run the setup wizard
 * - `donna config` — View/edit configuration
 * - `donna text` — Text-only mode (no voice)
 */

import { Command } from 'commander';
import React from 'react';
import { render } from 'ink';
import { App } from './cli/app.js';
import { Orchestrator } from './pipeline/orchestrator.js';
import { runInit } from './config/init.js';
import { store } from './config/store.js';
import { isConfigured } from './config/env.js';

// ─── CLI Program ────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('donna')
  .description('Donna CLI — Voice-First AI Developer Interface')
  .version('1.0.0');

// ── Default command: Start voice session ──────────────────────────────────

program
  .command('start', { isDefault: true })
  .description('Start a voice assistant session')
  .option('--no-voice', 'Disable voice input/output (text-only mode)')
  .option('--no-tts', 'Disable voice output only')
  .action(async (options) => {
    // Check if configured
    if (!isConfigured()) {
      console.log('\n❌ Donna is not configured yet.');
      console.log('   Run: donna init\n');
      process.exit(1);
    }

    // Apply voice options
    if (options.voice === false) {
      store.set('voiceInputEnabled', false);
      store.set('voiceOutputEnabled', false);
    }
    if (options.tts === false) {
      store.set('voiceOutputEnabled', false);
    }

    // Create orchestrator and render the Ink app
    const orchestrator = new Orchestrator();

    const { waitUntilExit } = render(
      React.createElement(App, { orchestrator }),
      {
        exitOnCtrlC: false, // We handle Ctrl+C ourselves
      },
    );

    // Handle process signals
    const cleanup = async () => {
      await orchestrator.shutdown();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    try {
      await waitUntilExit();
    } catch {
      // Ink exit
    }

    await cleanup();
  });

// ── Init command ──────────────────────────────────────────────────────────

program
  .command('init')
  .description('Set up Donna CLI (API keys, system check)')
  .action(async () => {
    await runInit();
  });

// ── Config command ────────────────────────────────────────────────────────

program
  .command('config')
  .description('View or edit Donna configuration')
  .option('--get <key>', 'Get a config value')
  .option('--set <key=value>', 'Set a config value')
  .option('--list', 'List all config values')
  .option('--reset', 'Reset to defaults')
  .action((options) => {
    if (options.list || (!options.get && !options.set && !options.reset)) {
      // List all config
      console.log('\n⚡ Donna Configuration:\n');
      const all = store.store;
      for (const [key, value] of Object.entries(all)) {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      }
      console.log(`\n  📁 Config path: ${store.path}\n`);
      return;
    }

    if (options.get) {
      const value = store.get(options.get as any);
      console.log(value !== undefined ? JSON.stringify(value) : 'Key not found');
      return;
    }

    if (options.set) {
      const [key, ...valueParts] = options.set.split('=');
      const value = valueParts.join('=');
      try {
        // Try to parse as JSON (for booleans, numbers)
        store.set(key as any, JSON.parse(value));
      } catch {
        store.set(key as any, value);
      }
      console.log(`✅ Set ${key} = ${value}`);
      return;
    }

    if (options.reset) {
      store.clear();
      console.log('✅ Configuration reset to defaults');
      return;
    }
  });

// ── Parse and run ─────────────────────────────────────────────────────────

program.parse(process.argv);
