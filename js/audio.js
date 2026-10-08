/**
 * Nexus Party - Audio System Manager
 * Handles Web Audio API processing, Active Speaker Detection, Visualizers & Soundboard SFX
 */

class AudioManager {
    constructor() {
        this.audioCtx = null;
        this.micStream = null;
        this.micSource = null;
        this.analyser = null;
        this.filterNode = null;
        this.compressorNode = null;
        this.speakingThreshold = 0.08; // sensitivity threshold
        this.isSpeaking = false;
        this.speakersListeners = [];

        this.visualizerCanvas = null;
        this.canvasCtx = null;
        this.animFrameId = null;

        this.noiseSuppressionEnabled = true;
        this.echoCancellationEnabled = true;
    }

    /**
     * Initialize Audio Context & User Microphone Stream
     */
    async initAudioStream(customDeviceId = null) {
        try {
            if (!this.audioCtx) {
                const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
                this.audioCtx = new AudioCtxClass();
            }

            if (this.audioCtx.state === 'suspended') {
                await this.audioCtx.resume();
            }

            const constraints = {
                audio: {
                    deviceId: customDeviceId ? { exact: customDeviceId } : undefined,
                    echoCancellation: this.echoCancellationEnabled,
                    noiseSuppression: this.noiseSuppressionEnabled,
                    autoGainControl: true
                }
            };

            this.micStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.setupAudioNodes(this.micStream);
            return this.micStream;
        } catch (err) {
            console.warn('[AudioManager] Microphones unavailable or permission denied:', err);
            return null;
        }
    }

    /**
     * Setup Audio Graph (Mic -> Filter -> Compressor -> Analyser)
     */
    setupAudioNodes(stream) {
        if (!this.audioCtx || !stream) return;

        // Disconnect old nodes if re-initializing
        if (this.micSource) {
            try { this.micSource.disconnect(); } catch (e) {}
        }

        this.micSource = this.audioCtx.createMediaStreamSource(stream);

        // High-pass filter to remove low-frequency rumble (< 80 Hz)
        this.filterNode = this.audioCtx.createBiquadFilter();
        this.filterNode.type = 'highpass';
        this.filterNode.frequency.setValueAtTime(80, this.audioCtx.currentTime);

        // Dynamics Compressor for level normalization & noise suppression simulation
        this.compressorNode = this.audioCtx.createDynamicsCompressor();
        this.compressorNode.threshold.setValueAtTime(-24, this.audioCtx.currentTime);
        this.compressorNode.knee.setValueAtTime(30, this.audioCtx.currentTime);
        this.compressorNode.ratio.setValueAtTime(12, this.audioCtx.currentTime);

        // Analyser node for speech volume & spectrum visualizer
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 128;
        this.analyser.smoothingTimeConstant = 0.8;

        // Connect chain
        this.micSource.connect(this.filterNode);
        this.filterNode.connect(this.compressorNode);
        this.compressorNode.connect(this.analyser);

        // Start active speaker detection loop
        this.startSpeakerDetection();
    }

    /**
     * Active Speaker Detection Loop
     */
    startSpeakerDetection() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
            if (!this.analyser) return;
            this.analyser.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength / 255.0; // scale 0.0 to 1.0

            const currentlySpeaking = average > this.speakingThreshold;
            if (currentlySpeaking !== this.isSpeaking) {
                this.isSpeaking = currentlySpeaking;
                this.notifySpeakerChange(this.isSpeaking, average);
            }

            requestAnimationFrame(checkVolume);
        };

        checkVolume();
    }

    setSensitivity(valPercent) {
        // Map 1-100% to threshold (0.25 to 0.01)
        this.speakingThreshold = 0.20 - ((valPercent / 100) * 0.19);
    }

    onSpeakingChange(callback) {
        this.speakersListeners.push(callback);
    }

    notifySpeakerChange(speaking, volume) {
        this.speakersListeners.forEach(cb => cb(speaking, volume));
    }

    /**
     * Bind Audio Spectrum Visualizer Canvas
     */
    startVisualizer(canvasElement) {
        this.visualizerCanvas = canvasElement;
        this.canvasCtx = canvasElement.getContext('2d');

        // Set canvas resolution
        canvasElement.width = canvasElement.offsetWidth || 800;
        canvasElement.height = canvasElement.offsetHeight || 100;

        const bufferLength = this.analyser ? this.analyser.frequencyBinCount : 64;
        const dataArray = new Uint8Array(bufferLength);

        const renderFrame = () => {
            this.animFrameId = requestAnimationFrame(renderFrame);

            const width = canvasElement.width;
            const height = canvasElement.height;
            this.canvasCtx.clearRect(0, 0, width, height);

            if (this.analyser) {
                this.analyser.getByteFrequencyData(dataArray);
            } else {
                // Synthetic animation fallback if mic muted
                for (let i = 0; i < bufferLength; i++) {
                    dataArray[i] = Math.sin(Date.now() * 0.005 + i) * 40 + 50;
                }
            }

            const barWidth = (width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * height;

                // Gradient from Blurple to Emerald Green
                const gradient = this.canvasCtx.createLinearGradient(0, height, 0, height - barHeight);
                gradient.addColorStop(0, '#5865F2');
                gradient.addColorStop(0.5, '#9B51E0');
                gradient.addColorStop(1, '#23A55A');

                this.canvasCtx.fillStyle = gradient;
                this.canvasCtx.beginPath();
                this.canvasCtx.roundRect(x, height - barHeight, barWidth - 3, barHeight, [4, 4, 0, 0]);
                this.canvasCtx.fill();

                x += barWidth;
            }
        };

        renderFrame();
    }

    stopVisualizer() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        if (this.canvasCtx && this.visualizerCanvas) {
            this.canvasCtx.clearRect(0, 0, this.visualizerCanvas.width, this.visualizerCanvas.height);
        }
    }

    /**
     * Web Audio Soundboard Synthesizer (Zero external assets required!)
     */
    playSoundEffect(type) {
        if (!this.audioCtx) {
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioCtxClass();
        }
        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        switch (type) {
            case 'airhorn': {
                // Dual sawtooth oscillators pitching up
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();

                osc1.type = 'sawtooth';
                osc2.type = 'sawtooth';

                osc1.frequency.setValueAtTime(466, now); // Bb4
                osc2.frequency.setValueAtTime(622, now); // Eb5

                // Pitch envelope
                osc1.frequency.exponentialRampToValueAtTime(520, now + 0.4);
                osc2.frequency.exponentialRampToValueAtTime(700, now + 0.4);

                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(ctx.destination);

                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + 0.45);
                osc2.stop(now + 0.45);
                break;
            }
            case 'victory': {
                // Fanfare triad chords C - E - G - High C
                const notes = [261.63, 329.63, 392.00, 523.25];
                notes.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    const startTime = now + (idx * 0.12);

                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, startTime);

                    gain.gain.setValueAtTime(0.25, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(startTime);
                    osc.stop(startTime + 0.35);
                });
                break;
            }
            case 'gg': {
                // Game over chime
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, now);
                osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);

                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            }
            case 'applause': {
                // White noise burst for applause
                const bufferSize = ctx.sampleRate * 0.8;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.25));
                }
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

                noise.connect(gain);
                gain.connect(ctx.destination);
                noise.start(now);
                break;
            }
            case 'drum': {
                // Rimshot drum
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            }
            case 'laugh': {
                // Sitcom laugh synth modulation
                [0, 0.1, 0.2, 0.3].forEach(offset => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(300 + Math.random() * 80, now + offset);
                    gain.gain.setValueAtTime(0.15, now + offset);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.08);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + offset);
                    osc.stop(now + offset + 0.08);
                });
                break;
            }
        }
    }
}

window.audioManager = new AudioManager();
