/**
 * Chuxi Happy - Lunar New Year Celebration
 * @license MIT
 */

(function() {
    'use strict';

    const CONFIG = {
        AUDIO: {
            ENABLED: true,
            MASTER_VOLUME: 0.6,
            // Explosion sound parameters
            EXPLOSION: {
                THUMP_GAIN: 0.8,
                NOISE_GAIN: 0.6,
                DURATION: 0.6
            },
            // Launch sound parameters
            LAUNCH: {
                TONE_GAIN: 0.15,
                NOISE_GAIN: 0.1,
                DURATION: 0.5
            }
        },
        SIMULATION: {
            ENABLED: false,
            DURATION_MS: 10000 // 10 seconds for demo
        },
        FIREWORKS: {
            MAX_COUNT: 15,
            PARTICLE_COUNT: 70, // Slightly reduced to prevent over-layering
            LAUNCH_PROBABILITY_NORMAL: 0.05,
            LAUNCH_PROBABILITY_CELEBRATION: 0.25,
            GRAVITY: 0.06,
            FRICTION: 0.96,
            DECAY_MIN: 0.025, // Faster decay to reduce trails
            DECAY_RANGE: 0.02,
            TRAIL_FADE: 0.5, // Increase fade amount to clear previous frames faster
            TARGET_HEIGHT_MIN: 0.15,
            TARGET_HEIGHT_MAX: 0.45
        }
    };

    /**
     * Audio Management Module
     * Enhanced with multi-layered synthesis for realistic effects
     */
    const AudioSystem = {
        ctx: null,
        masterGain: null,
        compressor: null,
        noiseBuffer: null,

        init() {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) {
                    console.warn('Web Audio API not supported');
                    return;
                }
                this.ctx = new AudioContext();
                
                // Master chain: Compressor -> Master Gain -> Destination
                this.compressor = this.ctx.createDynamicsCompressor();
                this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
                this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
                this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
                this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
                this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
                
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(CONFIG.AUDIO.MASTER_VOLUME, this.ctx.currentTime);
                
                this.compressor.connect(this.masterGain);
                this.masterGain.connect(this.ctx.destination);

                this.generateNoiseBuffer();
            } catch (e) {
                console.warn('Audio initialization failed:', e);
            }
        },

        generateNoiseBuffer() {
            if (!this.ctx) return;
            const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
            this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = this.noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
        },

        resume() {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(e => console.error(e));
            }
        },

        /**
         * Play a realistic explosion sound
         * Layer 1: Low frequency "thump" (Triangle wave)
         * Layer 2: High frequency "crack" (Filtered noise)
         */
        playExplosion() {
            if (!CONFIG.AUDIO.ENABLED || !this.ctx || this.ctx.state === 'suspended') return;

            const t = this.ctx.currentTime;
            const duration = CONFIG.AUDIO.EXPLOSION.DURATION;

            // --- Layer 1: Thump (Body) ---
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            
            osc.connect(oscGain);
            oscGain.connect(this.compressor);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(80, t);
            osc.frequency.exponentialRampToValueAtTime(10, t + 0.2); // Pitch drop

            oscGain.gain.setValueAtTime(0, t);
            oscGain.gain.linearRampToValueAtTime(CONFIG.AUDIO.EXPLOSION.THUMP_GAIN, t + 0.02);
            oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

            osc.start(t);
            osc.stop(t + 0.3);

            // --- Layer 2: Crack (Texture) ---
            if (this.noiseBuffer) {
                const noise = this.ctx.createBufferSource();
                const noiseGain = this.ctx.createGain();
                const noiseFilter = this.ctx.createBiquadFilter();

                noise.buffer = this.noiseBuffer;
                noise.loop = true;

                noiseFilter.type = 'lowpass';
                noiseFilter.frequency.setValueAtTime(1000, t);
                noiseFilter.frequency.exponentialRampToValueAtTime(100, t + 0.4);

                noise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(this.compressor);

                noiseGain.gain.setValueAtTime(0, t);
                noiseGain.gain.linearRampToValueAtTime(CONFIG.AUDIO.EXPLOSION.NOISE_GAIN, t + 0.01);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

                noise.start(t);
                noise.stop(t + duration);
            }
        },

        /**
         * Play a realistic launch sound
         * Layer 1: Rising tone (Sine wave)
         * Layer 2: Air friction (Bandpass noise)
         */
        playLaunch() {
            if (!CONFIG.AUDIO.ENABLED || !this.ctx || this.ctx.state === 'suspended') return;

            const t = this.ctx.currentTime;
            const duration = CONFIG.AUDIO.LAUNCH.DURATION;

            // --- Layer 1: Whistle ---
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();

            osc.connect(oscGain);
            oscGain.connect(this.compressor);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.exponentialRampToValueAtTime(600, t + duration);

            oscGain.gain.setValueAtTime(0, t);
            oscGain.gain.linearRampToValueAtTime(CONFIG.AUDIO.LAUNCH.TONE_GAIN, t + 0.1);
            oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

            osc.start(t);
            osc.stop(t + duration);

            // --- Layer 2: Whoosh ---
            if (this.noiseBuffer) {
                const noise = this.ctx.createBufferSource();
                const noiseGain = this.ctx.createGain();
                const noiseFilter = this.ctx.createBiquadFilter();

                noise.buffer = this.noiseBuffer;
                noise.loop = true;

                noiseFilter.type = 'bandpass';
                noiseFilter.Q.value = 1;
                noiseFilter.frequency.setValueAtTime(400, t);
                noiseFilter.frequency.linearRampToValueAtTime(800, t + duration);

                noise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(this.compressor);

                noiseGain.gain.setValueAtTime(0, t);
                noiseGain.gain.linearRampToValueAtTime(CONFIG.AUDIO.LAUNCH.NOISE_GAIN, t + 0.1);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

                noise.start(t);
                noise.stop(t + duration);
            }
        }
    };

    /**
     * Particle System for Fireworks
     */
    class Particle {
        constructor(x, y, color, velocity) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.velocity = velocity;
            this.alpha = 1;
            this.friction = CONFIG.FIREWORKS.FRICTION;
            this.gravity = CONFIG.FIREWORKS.GRAVITY;
            this.decay = Math.random() * CONFIG.FIREWORKS.DECAY_RANGE + CONFIG.FIREWORKS.DECAY_MIN;
        }

        update() {
            this.velocity.x *= this.friction;
            this.velocity.y *= this.friction;
            this.velocity.y += this.gravity;
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.alpha -= this.decay;
            
            // Clean up faint particles to prevent ghosting
            if (this.alpha < 0.05) {
                this.alpha = 0;
            }
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, 3, 3);
            ctx.restore();
        }
    }

    class Firework {
        constructor(x, targetY, height) {
            this.x = x;
            this.y = height;
            this.targetY = targetY;
            this.height = height;
            
            const distance = height - targetY;
            const speed = Math.sqrt(2 * 0.1 * distance);
            
            this.velocity = { x: 0, y: -speed };
            this.color = `hsl(${Math.random() * 360}, 50%, 50%)`;
            this.particles = [];
            this.exploded = false;
            
            AudioSystem.playLaunch();
        }

        update() {
            if (!this.exploded) {
                this.y += this.velocity.y;
                this.velocity.y += 0.1;

                if (this.velocity.y >= 0 || this.y <= this.targetY) {
                    this.explode();
                }
            }

            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.update();
                if (p.alpha <= 0) {
                    this.particles.splice(i, 1);
                }
            }
        }

        draw(ctx) {
            if (!this.exploded) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(this.x, this.y, 4, 4);
            }
            this.particles.forEach(p => p.draw(ctx));
        }

        explode() {
            this.exploded = true;
            AudioSystem.playExplosion();
            
            const count = CONFIG.FIREWORKS.PARTICLE_COUNT;
            const colorHsl = Math.random() * 360;
            const color = `hsl(${colorHsl}, 100%, 60%)`;
            
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2) / count * i;
                const velocity = {
                    x: Math.cos(angle) * (Math.random() * 6),
                    y: Math.sin(angle) * (Math.random() * 6)
                };
                this.particles.push(new Particle(this.x, this.y, color, velocity));
            }
        }
    }

    /**
     * Main Application Controller
     */
    const App = {
        canvas: null,
        ctx: null,
        width: 0,
        height: 0,
        fireworks: [],
        isNewYear: false,
        simulatedTargetDate: null,
        timerInterval: null,

        init() {
            this.initAudio();
            this.initCanvas();
            this.initTimer();
            this.bindEvents();
            this.animate();
        },

        initAudio() {
            AudioSystem.init();
        },

        initCanvas() {
            this.canvas = document.getElementById('fireworks');
            this.ctx = this.canvas.getContext('2d');
            this.resize();
        },

        resize() {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        },

        initTimer() {
            if (CONFIG.SIMULATION.ENABLED) {
                this.simulatedTargetDate = new Date(Date.now() + CONFIG.SIMULATION.DURATION_MS);
            }
            this.updateTimer();
            this.timerInterval = setInterval(() => this.updateTimer(), 1000);
        },

        updateTimer() {
            const now = new Date();
            const targetDate = CONFIG.SIMULATION.ENABLED ? this.simulatedTargetDate : new Date('2026-02-17T00:00:00'); // Use real date for production
            
            if (now >= targetDate) {
                if (!this.isNewYear) {
                    this.triggerNewYear();
                }
                return;
            }

            const diff = targetDate - now;
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            document.getElementById('hours').innerText = String(hours).padStart(2, '0');
            document.getElementById('minutes').innerText = String(minutes).padStart(2, '0');
            document.getElementById('seconds').innerText = String(seconds).padStart(2, '0');
        },

        triggerNewYear() {
            this.isNewYear = true;
            const container = document.querySelector('.countdown');
            if (container) {
                container.innerHTML = "<h1 class='new-year-text'>新年快乐！🎉</h1>";
            }
            
            // Celebration launch sequence
            for(let i = 0; i < 8; i++) {
                setTimeout(() => {
                    const x = Math.random() * this.width;
                    const targetY = this.height * 0.1 + Math.random() * (this.height * 0.3);
                    this.fireworks.push(new Firework(x, targetY, this.height));
                }, i * 300);
            }
        },

        createExplosionAt(x, y) {
            const fw = new Firework(x, y, this.height);
            fw.exploded = true;
            fw.y = y;
            AudioSystem.playExplosion();
            
            const count = 50;
            const color = `hsl(${Math.random() * 360}, 100%, 60%)`;
            
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 5 + 2;
                const velocity = {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                };
                fw.particles.push(new Particle(x, y, color, velocity));
            }
            this.fireworks.push(fw);
        },

        bindEvents() {
            window.addEventListener('resize', () => this.resize());
            
            window.addEventListener('click', (e) => {
                AudioSystem.resume();
                this.createExplosionAt(e.clientX, e.clientY);
            });
            
            // Touch interaction
            window.addEventListener('touchstart', (e) => {
                AudioSystem.resume();
                const touch = e.touches[0];
                this.createExplosionAt(touch.clientX, touch.clientY);
            }, {passive: false});
        },

        animate() {
            requestAnimationFrame(() => this.animate());
            
            // Clear the canvas completely first to remove ghosting artifacts
            // This is crucial for transparent canvas over CSS background
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.fillStyle = `rgba(0, 0, 0, ${CONFIG.FIREWORKS.TRAIL_FADE})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            this.ctx.globalCompositeOperation = 'lighter';

            for (let i = this.fireworks.length - 1; i >= 0; i--) {
                const fw = this.fireworks[i];
                fw.update();
                fw.draw(this.ctx);
                if (fw.exploded && fw.particles.length === 0) {
                    this.fireworks.splice(i, 1);
                }
            }

            // Auto launch logic
            const probability = this.isNewYear 
                ? CONFIG.FIREWORKS.LAUNCH_PROBABILITY_CELEBRATION 
                : CONFIG.FIREWORKS.LAUNCH_PROBABILITY_NORMAL;
            
            if (this.fireworks.length < CONFIG.FIREWORKS.MAX_COUNT && Math.random() < probability) {
                const x = Math.random() * this.width;
                const minH = this.height * CONFIG.FIREWORKS.TARGET_HEIGHT_MIN;
                const maxH = this.height * CONFIG.FIREWORKS.TARGET_HEIGHT_MAX;
                const targetY = minH + Math.random() * (maxH - minH);
                
                this.fireworks.push(new Firework(x, targetY, this.height));
            }
        }
    };

    // Initialize the application
    window.addEventListener('DOMContentLoaded', () => App.init());

})();
