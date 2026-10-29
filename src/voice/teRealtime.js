import { createTeActionRunner } from './teActions.js';
import { createVoiceCommands } from './commands.js';
export * from './realtimeController.js';

/** Compose the standalone action runner with the voice controls. */
export function initTeVoiceCommands(options) {
  return createVoiceCommands({
    ...options,
    runner: createTeActionRunner(options),
  });
}
