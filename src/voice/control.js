/** Build the voice control independently of its connection backend. */
export function createVoiceControl({ reset = false } = {}) {
  let root = document.getElementById('te-voice-control');
  if (root && reset) {
    root.remove();
    root = null;
  }
  if (!root) {
    root = document.createElement('div');
    root.id = 'te-voice-control';
    root.dataset.status = 'idle';
    root.dataset.speaker = 'idle';
    root.innerHTML = `
      <div class="te-voice-heading">
        <div class="te-voice-kicker">AI AGENT</div>
        <div id="te-voice-status">OFF</div>
        <div class="te-voice-cost">
          <button id="te-voice-tier" class="te-voice-tier-btn" type="button" aria-pressed="false" title="Voice model tier — applies next session">STD</button>
          <span id="te-voice-cost-value" class="te-voice-cost-value" data-level="ok" title="Estimated session cost">~$0.00</span>
        </div>
      </div>
      <button id="te-voice-button" type="button" aria-label="Voice control — activate to toggle voice; hold Space to speak" aria-describedby="te-voice-help">
        <span class="te-mic-orbit"><img src="/mic.svg" alt="" /></span>
        <span class="te-mic-label">ON/OFF</span>
      </button>
      <div class="te-voice-visualizer" aria-hidden="true">
        ${Array.from({ length: 15 }, (_, index) => `<span style="--bar:${index}"></span>`).join('')}
      </div>
      <div class="te-voice-readout">
        <div id="te-voice-detail">VOICE STANDBY</div>
      </div>
      <div id="te-voice-help" class="te-voice-help-tray" role="tooltip">
        <span class="te-voice-help-kicker">VOICE CONTROL</span>
        <span class="te-voice-help-detail">Hold Space to speak · tap Space to activate focused controls</span>
      </div>
      <div class="te-voice-error-tray" role="alert" aria-live="assertive">
        <div class="te-voice-error-header">
          <span>VOICE SYSTEM ERROR</span>
          <button class="te-voice-error-dismiss" type="button">DISMISS</button>
        </div>
        <div id="te-voice-error-detail"></div>
        <div class="te-voice-error-hint">Check microphone permission and network access, then try again.</div>
      </div>
    `;
    const commandDock = document.getElementById('command-dock');
    if (commandDock) {
      const locationBar = document.getElementById('location-bar');
      const controlPanel = document.getElementById('control-panel');
      commandDock.appendChild(root);
      if (locationBar) commandDock.insertBefore(locationBar, root);
      if (controlPanel) commandDock.appendChild(controlPanel);
    } else {
      document.body.appendChild(root);
    }
    root
      .querySelector('.te-voice-error-dismiss')
      ?.addEventListener('click', () => {
        root.classList.add('error-dismissed');
      });
  }
  return {
    root,
    button: root.querySelector('#te-voice-button'),
    buttonLabel: root.querySelector('.te-mic-label'),
    status: root.querySelector('#te-voice-status'),
    detail: root.querySelector('#te-voice-detail'),
    helpDetail: root.querySelector('.te-voice-help-detail'),
    errorDetail: root.querySelector('#te-voice-error-detail'),
    tierButton: root.querySelector('#te-voice-tier'),
    costValue: root.querySelector('#te-voice-cost-value'),
  };
}
