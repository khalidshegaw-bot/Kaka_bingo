class AudioEngine {
  constructor() {
    this.ctx = null;
    this.synth = window.speechSynthesis;
    this.unlocked = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.unlocked) {
      this.unlocked = true;
      // Unlock Web Audio
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      gain.gain.value = 0.001;
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(0);
      osc.stop(this.ctx.currentTime + 0.1);
      
      // Warm up Speech Synthesis engine
      if (this.synth) {
        const silentUtterance = new SpeechSynthesisUtterance('');
        this.synth.speak(silentUtterance);
      }
    }
  }

  playBallDrawnChime() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(659.25, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  announceBall(ballLabel) {
    if (!this.synth) return;
    try {
      this.synth.cancel(); // Stop previous voice
      // Format B-12 to "B 12" for proper pronunciation
      const textToSpeak = ballLabel.replace('-', ' ');
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';
      this.synth.speak(utterance);
    } catch (e) {
      console.log('Voice error:', e);
    }
  }
}

window.audioEngine = new AudioEngine();
