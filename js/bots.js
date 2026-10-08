/**
 * Nexus Party - Simulated Party Bot Engine
 * Generates realistic party members, 1080p60 gameplay stream simulator & chat bots
 */

class PartyBotEngine {
    constructor() {
        this.bots = [
            {
                id: 'bot-cybergamer',
                name: 'CyberGamer_99',
                status: 'online',
                role: 'Pro Streamer',
                avatarColor: '#9B51E0',
                isStreaming: true,
                streamTitle: 'Apex Champions - 1080p 60FPS Ranked Gameplay',
                micMuted: false,
                deafened: false,
                channel: 'squad-lobby'
            },
            {
                id: 'bot-neonvibe',
                name: 'NeonVibe_DJ',
                status: 'online',
                role: 'Music Bot',
                avatarColor: '#23A55A',
                isStreaming: false,
                micMuted: false,
                deafened: false,
                channel: 'squad-lobby'
            },
            {
                id: 'bot-pixelqueen',
                name: 'PixelQueen_HD',
                status: 'idle',
                role: 'Face Cam Chat',
                avatarColor: '#F0B232',
                isStreaming: false,
                micMuted: false,
                deafened: false,
                channel: 'pro-stream-hd'
            }
        ];

        this.gameplayCanvas = null;
        this.canvasStream = null;
        this.animId = null;
    }

    /**
     * Get bots for a specific voice channel
     */
    getBotsInChannel(channelId) {
        return this.bots.filter(b => b.channel === channelId);
    }

    /**
     * Render Simulated 1080p 60FPS Retro Gaming Canvas Stream
     */
    createGameplayStreamCanvas() {
        if (this.gameplayCanvas) return this.gameplayCanvas;

        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');

        let frameCount = 0;
        let lastFpsUpdate = Date.now();
        let currentFps = 60;

        // Particle system for 60fps high motion demo
        const particles = Array.from({ length: 80 }, () => ({
            x: Math.random() * 1920,
            y: Math.random() * 1080,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            radius: Math.random() * 8 + 4,
            color: `hsl(${Math.random() * 360}, 90%, 65%)`
        }));

        const drawScene = () => {
            this.animId = requestAnimationFrame(drawScene);
            frameCount++;

            // Measure exact FPS
            const now = Date.now();
            if (now - lastFpsUpdate >= 1000) {
                currentFps = frameCount;
                frameCount = 0;
                lastFpsUpdate = now;
            }

            // Dark cyberpunk grid background
            ctx.fillStyle = '#0b0c10';
            ctx.fillRect(0, 0, 1920, 1080);

            // Draw grid
            ctx.strokeStyle = 'rgba(88, 101, 242, 0.15)';
            ctx.lineWidth = 2;
            const gridOffset = (Date.now() * 0.08) % 60;
            for (let x = 0; x < 1920; x += 60) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, 1080);
                ctx.stroke();
            }
            for (let y = gridOffset; y < 1080; y += 60) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(1920, y);
                ctx.stroke();
            }

            // Draw animated particles (High Motion Test for 60FPS smooth stream)
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > 1920) p.vx *= -1;
                if (p.y < 0 || p.y > 1080) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 15;
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            // HUD overlay text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 42px "Outfit", sans-serif';
            ctx.fillText('🎮 CyberGamer_99 - APEX LEGENDS 1080P 60FPS STREAM', 80, 120);

            ctx.fillStyle = '#F0B232';
            ctx.font = 'bold 32px "JetBrains Mono", monospace';
            ctx.fillText(`STREAM QUALITY: 1920x1080 @ ${currentFps} FPS | BITRATE: 6.8 Mbps`, 80, 180);

            ctx.fillStyle = '#23A55A';
            ctx.font = '28px "Outfit", sans-serif';
            ctx.fillText('LIVE VOICE PARTY • NOISE SUPPRESSION ACTIVE • WEBRTC MESH', 80, 230);
        };

        drawScene();
        this.gameplayCanvas = canvas;
        return canvas;
    }

    /**
     * Start periodic speaking simulations for party bots
     */
    startBotSpeakingSimulation(onBotSpeakingStateChange) {
        setInterval(() => {
            const randomBot = this.bots[Math.floor(Math.random() * this.bots.length)];
            const isSpeaking = Math.random() > 0.4;
            onBotSpeakingStateChange(randomBot.id, isSpeaking);

            if (isSpeaking) {
                setTimeout(() => {
                    onBotSpeakingStateChange(randomBot.id, false);
                }, 2000 + Math.random() * 3000);
            }
        }, 6000);
    }

    /**
     * Bot automatic responses to text chat
     */
    generateBotResponse(userMsg, onMessageReceived) {
        const lower = userMsg.toLowerCase();
        let reply = null;
        let author = 'CyberGamer_99';

        if (lower.includes('1080') || lower.includes('60fps') || lower.includes('stream') || lower.includes('quality')) {
            reply = '⚡ The 1080p 60fps stream is looking crisp! Frame rate is steady at 60 FPS with 0 dropped frames.';
            author = 'CyberGamer_99';
        } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('party')) {
            reply = 'Yo! Welcome to the squad lobby. Fire up your mic or share your screen at 1080p60!';
            author = 'PixelQueen_HD';
        } else if (lower.includes('gg') || lower.includes('win')) {
            reply = '🎮 GG WP! Victory fanfare on the soundboard!';
            author = 'NeonVibe_DJ';
        } else if (Math.random() < 0.3) {
            reply = 'Hyped for the party! Voice audio quality sounds crystal clear with WebAudio noise cancellation.';
            author = 'CyberGamer_99';
        }

        if (reply) {
            setTimeout(() => {
                onMessageReceived({
                    author: author,
                    text: reply,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    avatarColor: author === 'CyberGamer_99' ? '#9B51E0' : '#F0B232'
                });
            }, 1200 + Math.random() * 1000);
        }
    }
}

window.partyBotEngine = new PartyBotEngine();
