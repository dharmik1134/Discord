/**
 * Nexus Party - Main Application Controller
 * Connects UI, WebRTC media, Web Audio API, and Party Bot engine into a unified Discord experience
 */

class NexusPartyApp {
    constructor() {
        this.currentServer = 'gaming-hub';
        this.currentVoiceChannel = 'squad-lobby';
        this.currentTextChannel = 'general';

        this.userState = {
            displayName: 'Alex (You)',
            avatarColor: '#5865F2',
            micMuted: false,
            deafened: false,
            cameraActive: false,
            screenSharing: false,
            status: 'online'
        };

        this.visualizerActive = false;
        this.spotlightActive = false;

        this.initDOM();
        this.bindEvents();
        this.setupMediaIntegrations();
        this.renderVoiceUserList();
        this.renderVideoGrid();
        this.initDevices();

        // Start Party Bot Speaking Loop
        window.partyBotEngine.startBotSpeakingSimulation((botId, isSpeaking) => {
            this.handleBotSpeakingChange(botId, isSpeaking);
        });
    }

    /**
     * Cache DOM Elements
     */
    initDOM() {
        this.dom = {
            // Footers & Buttons
            btnMic: document.getElementById('btn-toggle-mic'),
            btnDeafen: document.getElementById('btn-toggle-deafen'),
            dockMic: document.getElementById('dock-btn-mic'),
            dockDeafen: document.getElementById('dock-btn-deafen'),
            dockCamera: document.getElementById('dock-btn-camera'),
            dockShare: document.getElementById('dock-btn-share'),
            dockSoundboard: document.getElementById('dock-btn-soundboard'),
            dockDisconnect: document.getElementById('dock-btn-disconnect'),
            btnSettings: document.getElementById('btn-open-settings'),
            btnInvite: document.getElementById('btn-invite-party'),
            btnVisualizer: document.getElementById('btn-toggle-visualizer'),
            btnToggleChat: document.getElementById('btn-toggle-text-drawer'),

            // Stage & Media Layout
            videoGrid: document.getElementById('video-grid'),
            spotlightContainer: document.getElementById('spotlight-container'),
            spotlightVideo: document.getElementById('spotlight-video'),
            spotlightFpsBadge: document.getElementById('spotlight-fps-badge'),
            spotlightBitrateBadge: document.getElementById('spotlight-bitrate-badge'),
            spotlightTilesStrip: document.getElementById('spotlight-tiles-strip'),
            btnStopSpotlight: document.getElementById('btn-stop-spotlight-stream'),
            btnTheater: document.getElementById('btn-theater-mode'),
            btnPopout: document.getElementById('btn-popout-stream'),
            spectrumCanvas: document.getElementById('spectrum-canvas'),

            // Channel Header & Sidebars
            headerName: document.getElementById('header-name'),
            headerIcon: document.getElementById('header-icon'),
            headerTopic: document.getElementById('header-topic'),
            voiceChannelsList: document.getElementById('voice-channels-list'),
            chatDrawer: document.getElementById('chat-drawer'),
            chatChannelTitle: document.getElementById('chat-channel-title'),
            messagesContainer: document.getElementById('messages-container'),
            chatInput: document.getElementById('chat-input'),
            typingIndicator: document.getElementById('typing-indicator'),
            typingUsername: document.getElementById('typing-username'),

            // Quality Selectors
            presetSelectorBtn: document.getElementById('preset-selector-btn'),
            currentQualityLabel: document.getElementById('current-quality-label'),
            qualityMenu: document.getElementById('quality-menu'),

            // Modals & Soundboard
            soundboardDrawer: document.getElementById('soundboard-drawer'),
            btnCloseSoundboard: document.getElementById('btn-close-soundboard'),
            modalSettings: document.getElementById('modal-settings'),
            modalInvite: document.getElementById('modal-invite'),
            selectMic: document.getElementById('select-mic'),
            selectCam: document.getElementById('select-cam'),
            micSensitivity: document.getElementById('mic-sensitivity'),
            sensitivityValue: document.getElementById('sensitivity-value'),
            toggleNoiseSuppression: document.getElementById('toggle-noise-suppression'),
            toggleEchoCancel: document.getElementById('toggle-echo-cancel'),
            btnSaveSettings: document.getElementById('btn-save-settings'),
            inviteUrlInput: document.getElementById('invite-url-input'),
            btnCopyInvite: document.getElementById('btn-copy-invite')
        };
    }

    /**
     * Bind UI Click & Key Event Listeners
     */
    bindEvents() {
        // Toggle Microphone
        const toggleMicHandler = () => this.toggleMicrophone();
        this.dom.btnMic.addEventListener('click', toggleMicHandler);
        this.dom.dockMic.addEventListener('click', toggleMicHandler);

        // Toggle Deafen
        const toggleDeafenHandler = () => this.toggleDeafen();
        this.dom.btnDeafen.addEventListener('click', toggleDeafenHandler);
        this.dom.dockDeafen.addEventListener('click', toggleDeafenHandler);

        // Toggle Face Camera
        this.dom.dockCamera.addEventListener('click', () => this.toggleCamera());

        // Share 1080p60 Screen
        this.dom.dockShare.addEventListener('click', () => this.toggleScreenShare());

        // Soundboard Drawer
        this.dom.dockSoundboard.addEventListener('click', () => {
            this.dom.soundboardDrawer.classList.toggle('hidden');
        });
        this.dom.btnCloseSoundboard.addEventListener('click', () => {
            this.dom.soundboardDrawer.classList.add('hidden');
        });

        // Trigger Soundboard SFX
        document.querySelectorAll('.sfx-card').forEach(card => {
            card.addEventListener('click', () => {
                const sfx = card.getAttribute('data-sfx');
                window.audioManager.playSoundEffect(sfx);
                this.appendSystemChatMessage(`🔊 Soundboard: played **${card.querySelector('.sfx-name').innerText}**`);
            });
        });

        // Disconnect Voice
        this.dom.dockDisconnect.addEventListener('click', () => {
            this.leaveVoiceChannel();
        });

        // Toggle Audio Visualizer Spectrum
        this.dom.btnVisualizer.addEventListener('click', () => {
            this.visualizerActive = !this.visualizerActive;
            this.dom.spectrumCanvas.classList.toggle('hidden', !this.visualizerActive);
            if (this.visualizerActive) {
                window.audioManager.startVisualizer(this.dom.spectrumCanvas);
                this.dom.btnVisualizer.style.color = '#23A55A';
            } else {
                window.audioManager.stopVisualizer();
                this.dom.btnVisualizer.style.color = '';
            }
        });

        // Toggle Right Chat Panel
        this.dom.btnToggleChat.addEventListener('click', () => {
            this.dom.chatDrawer.classList.toggle('closed');
        });
        document.getElementById('btn-close-chat').addEventListener('click', () => {
            this.dom.chatDrawer.classList.add('closed');
        });

        // Stream Quality Preset Menu Selection
        document.querySelectorAll('#quality-menu .menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const quality = item.getAttribute('data-quality');
                const title = item.querySelector('.item-title').innerText;
                this.dom.currentQualityLabel.innerText = title;
                this.dom.qualityMenu.classList.remove('show');
                window.webrtcManager.updateStreamQuality(quality);
                this.appendSystemChatMessage(`⚡ Stream preset updated to **${title}**`);
            });
        });

        // Text Chat Submissions
        this.dom.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.dom.chatInput.value.trim() !== '') {
                const msgText = this.dom.chatInput.value.trim();
                this.sendChatMessage(msgText);
                this.dom.chatInput.value = '';
            }
        });

        // Quick Reactions Bar
        document.querySelectorAll('.q-emoji-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const emoji = btn.getAttribute('data-emoji');
                this.sendChatMessage(emoji);
            });
        });

        // Text & Voice Channels Switching
        document.querySelectorAll('.channel-item').forEach(item => {
            item.addEventListener('click', () => {
                const channelType = item.getAttribute('data-channel-type');
                const channelId = item.getAttribute('data-channel-id');
                const channelName = item.querySelector('.channel-name').innerText;

                if (channelType === 'text') {
                    document.querySelectorAll('.channel-item[data-channel-type="text"]').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    this.currentTextChannel = channelId;
                    this.dom.chatChannelTitle.innerText = channelName;
                    this.dom.headerName.innerText = channelName;
                    this.dom.headerIcon.className = 'fa-solid fa-hashtag header-channel-icon';
                } else if (channelType === 'voice') {
                    document.querySelectorAll('.voice-channel').forEach(i => i.classList.remove('active-voice'));
                    item.classList.add('active-voice');
                    this.currentVoiceChannel = channelId;
                    this.dom.headerName.innerText = channelName;
                    this.dom.headerIcon.className = 'fa-solid fa-volume-high header-channel-icon';
                    this.renderVoiceUserList();
                    this.renderVideoGrid();
                    this.appendSystemChatMessage(`🔊 Switched to voice channel: **${channelName}**`);
                }
            });
        });

        // Server Switcher Sidebar
        document.querySelectorAll('.server-list .server-icon').forEach(icon => {
            icon.addEventListener('click', () => {
                document.querySelectorAll('.server-list .server-icon').forEach(i => i.classList.remove('active-server'));
                icon.classList.add('active-server');
                const serverName = icon.getAttribute('data-tooltip').replace(/^[^\s]+\s/, '');
                document.getElementById('current-server-name').innerText = serverName;
            });
        });

        // Modals: Open & Close
        this.dom.btnSettings.addEventListener('click', () => {
            this.dom.modalSettings.classList.remove('hidden');
        });
        this.dom.btnInvite.addEventListener('click', () => {
            this.dom.modalInvite.classList.remove('hidden');
            this.dom.inviteUrlInput.value = `${window.location.origin}${window.location.pathname}#room=${this.currentVoiceChannel}`;
        });
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.dom.modalSettings.classList.add('hidden');
                this.dom.modalInvite.classList.add('hidden');
            });
        });

        // Settings Tabs Switcher
        document.querySelectorAll('.settings-tabs .tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.settings-tabs .tab-btn').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const targetId = tab.getAttribute('data-tab');
                document.getElementById(targetId).classList.add('active');
            });
        });

        // Copy Invite Link
        this.dom.btnCopyInvite.addEventListener('click', () => {
            this.dom.inviteUrlInput.select();
            navigator.clipboard.writeText(this.dom.inviteUrlInput.value);
            this.dom.btnCopyInvite.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            setTimeout(() => {
                this.dom.btnCopyInvite.innerHTML = '<i class="fa-solid fa-copy"></i> Copy';
            }, 2000);
        });

        // Microphone Sensitivity Slider
        this.dom.micSensitivity.addEventListener('input', (e) => {
            const val = e.target.value;
            this.dom.sensitivityValue.innerText = `${val}%`;
            window.audioManager.setSensitivity(val);
        });

        // Stop Spotlight Screen View
        this.dom.btnStopSpotlight.addEventListener('click', () => {
            this.stopSpotlightView();
        });

        // Theater / Fullscreen Mode for 1080p60 Stream
        this.dom.btnTheater.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                this.dom.spotlightContainer.requestFullscreen().catch(err => console.log(err));
            } else {
                document.exitFullscreen();
            }
        });

        // Keyboard Shortcuts (M: Mute, D: Deafen, V: Camera, S: Share Screen)
        window.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
            if (e.key === 'm' || e.key === 'M') this.toggleMicrophone();
            if (e.key === 'd' || e.key === 'D') this.toggleDeafen();
            if (e.key === 'v' || e.key === 'V') this.toggleCamera();
            if (e.key === 's' || e.key === 'S') this.toggleScreenShare();
        });
    }

    /**
     * Setup Audio/Video Integrations & Event Listeners
     */
    setupMediaIntegrations() {
        // Initialize local audio mic
        window.audioManager.initAudioStream();

        // Active speaker listener for local user
        window.audioManager.onSpeakingChange((isSpeaking) => {
            const localTile = document.getElementById('tile-local-user');
            const localUserAvatar = document.querySelector('#voice-users-squad-lobby .voice-user-avatar');

            if (isSpeaking && !this.userState.micMuted && !this.userState.deafened) {
                if (localTile) localTile.classList.add('speaking');
                if (localUserAvatar) localUserAvatar.classList.add('speaking');
            } else {
                if (localTile) localTile.classList.remove('speaking');
                if (localUserAvatar) localUserAvatar.classList.remove('speaking');
            }
        });

        // WebRTC remote stream callbacks
        window.webrtcManager.onRemoteStreamAdded = (peerId, kind, stream) => {
            this.addRemoteStreamToGrid(peerId, kind, stream);
        };

        window.webrtcManager.onLocalStreamAdded = (kind, stream, config) => {
            if (kind === 'screen') {
                this.startSpotlightView(stream, config);
            }
        };

        // Stream Stats Overlay Updates
        window.webrtcManager.onStreamStatsUpdated = (stats) => {
            this.dom.spotlightFpsBadge.innerText = `${stats.resolution} @ ${stats.fps} FPS`;
            this.dom.spotlightBitrateBadge.innerText = stats.bitrate;
        };
    }

    /**
     * Enumerate Available Mic and Camera Devices
     */
    async initDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.dom.selectMic.innerHTML = '';
            this.dom.selectCam.innerHTML = '';

            devices.forEach((d, idx) => {
                const option = document.createElement('option');
                option.value = d.deviceId;
                if (d.kind === 'audioinput') {
                    option.text = d.label || `Microphone ${idx + 1}`;
                    this.dom.selectMic.appendChild(option);
                } else if (d.kind === 'videoinput') {
                    option.text = d.label || `Camera ${idx + 1}`;
                    this.dom.selectCam.appendChild(option);
                }
            });
        } catch (e) {
            console.warn('Could not enumerate devices:', e);
        }
    }

    /**
     * Toggle Microphone State
     */
    toggleMicrophone() {
        this.userState.micMuted = !this.userState.micMuted;

        if (window.audioManager.micStream) {
            window.audioManager.micStream.getAudioTracks().forEach(t => t.enabled = !this.userState.micMuted);
        }

        this.dom.btnMic.classList.toggle('active-muted', this.userState.micMuted);
        this.dom.dockMic.classList.toggle('active-off', this.userState.micMuted);
        this.dom.dockMic.querySelector('i').className = this.userState.micMuted ? 'fa-solid fa-microphone-slash' : 'fa-solid fa-microphone';
        this.dom.btnMic.querySelector('i').className = this.userState.micMuted ? 'fa-solid fa-microphone-slash' : 'fa-solid fa-microphone';

        this.renderVoiceUserList();
        this.renderVideoGrid();
        this.appendSystemChatMessage(this.userState.micMuted ? '🎙️ Microphone Muted' : '🎙️ Microphone Unmuted');
    }

    /**
     * Toggle Deafen Audio State
     */
    toggleDeafen() {
        this.userState.deafened = !this.userState.deafened;
        this.dom.btnDeafen.classList.toggle('active-muted', this.userState.deafened);
        this.dom.dockDeafen.classList.toggle('active-off', this.userState.deafened);

        // Mute all remote audio tags
        document.querySelectorAll('audio, video').forEach(media => {
            if (media.id !== 'spotlight-video' && media.id !== 'local-cam-video') {
                media.muted = this.userState.deafened;
            }
        });

        this.renderVoiceUserList();
        this.appendSystemChatMessage(this.userState.deafened ? '🎧 Audio Deafened' : '🎧 Audio Undeafened');
    }

    /**
     * Toggle Face Camera Chat
     */
    async toggleCamera() {
        this.userState.cameraActive = !this.userState.cameraActive;
        this.dom.dockCamera.classList.toggle('highlighted', this.userState.cameraActive);

        if (this.userState.cameraActive) {
            try {
                const stream = await window.webrtcManager.startCamera(this.dom.selectCam.value);
                this.renderVideoGrid();
                this.appendSystemChatMessage('📷 Face Camera Turned ON');
            } catch (e) {
                this.userState.cameraActive = false;
                this.dom.dockCamera.classList.remove('highlighted');
                alert('Could not access face camera device.');
            }
        } else {
            window.webrtcManager.stopCamera();
            this.renderVideoGrid();
            this.appendSystemChatMessage('📷 Face Camera Turned OFF');
        }
    }

    /**
     * Toggle 1080p 60FPS Screen Sharing
     */
    async toggleScreenShare() {
        this.userState.screenSharing = !this.userState.screenSharing;

        if (this.userState.screenSharing) {
            let stream = await window.webrtcManager.startScreenShare(window.webrtcManager.activeQuality);

            // Fallback to gameplay stream simulator if browser user cancels native dialog or runs headless
            if (!stream) {
                const simulatedCanvas = window.partyBotEngine.createGameplayStreamCanvas();
                stream = simulatedCanvas.captureStream(60); // 60 FPS capture
                this.startSpotlightView(stream, { width: 1920, height: 1080, frameRate: 60, label: '1080p 60 FPS (Simulated HD Gaming)' });
                window.webrtcManager.startStatsMonitor(stream.getVideoTracks()[0]);
            }

            this.dom.dockShare.classList.add('active-off');
            this.dom.dockShare.querySelector('span').innerText = 'Stop Share';
            this.appendSystemChatMessage('⚡ **1080p 60FPS Screen Stream Started!**');
        } else {
            window.webrtcManager.stopScreenShare();
            this.stopSpotlightView();
            this.dom.dockShare.classList.remove('active-off');
            this.dom.dockShare.querySelector('span').innerText = 'Share 1080p60';
            this.appendSystemChatMessage('📺 Screen Sharing Stopped');
        }
    }

    /**
     * Render Spotlight Screen Stream Container
     */
    startSpotlightView(stream, config) {
        this.spotlightActive = true;
        this.dom.videoGrid.classList.add('hidden');
        this.dom.spotlightContainer.classList.remove('hidden');
        this.dom.spotlightVideo.srcObject = stream;
        this.dom.spotlightVideo.play();
    }

    stopSpotlightView() {
        this.spotlightActive = false;
        this.dom.spotlightContainer.classList.add('hidden');
        this.dom.videoGrid.classList.remove('hidden');
        this.dom.spotlightVideo.srcObject = null;
    }

    /**
     * Render Voice Users Sublist in Sidebar
     */
    renderVoiceUserList() {
        const container = document.getElementById(`voice-users-${this.currentVoiceChannel}`);
        if (!container) return;

        // Clear sublists
        document.querySelectorAll('.connected-users-list').forEach(ul => ul.innerHTML = '');

        // Local User Item
        const localUserLi = document.createElement('li');
        localUserLi.className = 'voice-user-item';
        localUserLi.innerHTML = `
            <div class="voice-user-avatar" style="background-color: ${this.userState.avatarColor}">YOU</div>
            <span>${this.userState.displayName}</span>
            <div class="voice-user-icons">
                ${this.userState.micMuted ? '<i class="fa-solid fa-microphone-slash text-danger"></i>' : ''}
                ${this.userState.deafened ? '<i class="fa-solid fa-headphones text-danger"></i>' : ''}
            </div>
        `;
        container.appendChild(localUserLi);

        // Party Bots in channel
        const bots = window.partyBotEngine.getBotsInChannel(this.currentVoiceChannel);
        bots.forEach(bot => {
            const botLi = document.createElement('li');
            botLi.className = 'voice-user-item';
            botLi.id = `voice-user-${bot.id}`;
            botLi.innerHTML = `
                <div class="voice-user-avatar" style="background-color: ${bot.avatarColor}">${bot.name.substring(0, 2).toUpperCase()}</div>
                <span>${bot.name}</span>
                ${bot.isStreaming ? '<span class="hd-badge">LIVE 60FPS</span>' : ''}
            `;
            container.appendChild(botLi);
        });
    }

    /**
     * Render Video Tiles Stage Grid
     */
    renderVideoGrid() {
        this.dom.videoGrid.innerHTML = '';

        // Local User Video Tile
        const localTile = document.createElement('div');
        localTile.className = 'video-tile';
        localTile.id = 'tile-local-user';

        if (this.userState.cameraActive && window.webrtcManager.localCameraStream) {
            const videoEl = document.createElement('video');
            videoEl.id = 'local-cam-video';
            videoEl.className = 'video-element';
            videoEl.autoplay = true;
            videoEl.playsInline = true;
            videoEl.muted = true;
            videoEl.srcObject = window.webrtcManager.localCameraStream;
            localTile.appendChild(videoEl);
        } else {
            localTile.innerHTML = `
                <div class="tile-avatar-fallback">
                    <div class="avatar-large" style="background-color: ${this.userState.avatarColor}">YOU</div>
                </div>
            `;
        }

        localTile.innerHTML += `
            <div class="tile-overlay-info">
                <span>${this.userState.displayName}</span>
            </div>
            <div class="tile-mic-status ${this.userState.micMuted ? 'muted' : ''}">
                <i class="fa-solid ${this.userState.micMuted ? 'fa-microphone-slash' : 'fa-microphone'}"></i>
            </div>
        `;
        this.dom.videoGrid.appendChild(localTile);

        // Render Party Bots Video Tiles
        const bots = window.partyBotEngine.getBotsInChannel(this.currentVoiceChannel);
        bots.forEach(bot => {
            const tile = document.createElement('div');
            tile.className = 'video-tile';
            tile.id = `tile-${bot.id}`;

            if (bot.isStreaming) {
                const canvas = window.partyBotEngine.createGameplayStreamCanvas();
                const videoEl = document.createElement('video');
                videoEl.className = 'video-element';
                videoEl.autoplay = true;
                videoEl.playsInline = true;
                videoEl.muted = true;
                videoEl.srcObject = canvas.captureStream(60);
                tile.appendChild(videoEl);

                tile.innerHTML += `
                    <div class="tile-stream-badge">
                        <i class="fa-solid fa-circle"></i> 1080p 60FPS
                    </div>
                `;
            } else {
                tile.innerHTML = `
                    <div class="tile-avatar-fallback">
                        <div class="avatar-large" style="background-color: ${bot.avatarColor}">${bot.name.substring(0, 2).toUpperCase()}</div>
                    </div>
                `;
            }

            tile.innerHTML += `
                <div class="tile-overlay-info">
                    <span>${bot.name}</span>
                </div>
                <div class="tile-mic-status">
                    <i class="fa-solid fa-microphone"></i>
                </div>
            `;

            // Click tile to spotlight stream if streaming
            if (bot.isStreaming) {
                tile.style.cursor = 'pointer';
                tile.addEventListener('click', () => {
                    const canvas = window.partyBotEngine.createGameplayStreamCanvas();
                    const stream = canvas.captureStream(60);
                    this.startSpotlightView(stream, { width: 1920, height: 1080, frameRate: 60, label: 'CyberGamer 1080p 60FPS' });
                    window.webrtcManager.startStatsMonitor(stream.getVideoTracks()[0]);
                });
            }

            this.dom.videoGrid.appendChild(tile);
        });
    }

    /**
     * Add Remote Peer WebRTC Video/Audio Stream to Grid
     */
    addRemoteStreamToGrid(peerId, kind, stream) {
        let tile = document.getElementById(`tile-peer-${peerId}`);
        if (!tile) {
            tile = document.createElement('div');
            tile.className = 'video-tile';
            tile.id = `tile-peer-${peerId}`;
            this.dom.videoGrid.appendChild(tile);
        }

        if (kind === 'video') {
            const videoEl = document.createElement('video');
            videoEl.className = 'video-element';
            videoEl.autoplay = true;
            videoEl.playsInline = true;
            videoEl.srcObject = stream;
            tile.appendChild(videoEl);
        } else if (kind === 'audio') {
            const audioEl = document.createElement('audio');
            audioEl.autoplay = true;
            audioEl.srcObject = stream;
            tile.appendChild(audioEl);
        }
    }

    /**
     * Handle Party Bot Speaking State Changes
     */
    handleBotSpeakingChange(botId, isSpeaking) {
        const tile = document.getElementById(`tile-${botId}`);
        const avatar = document.querySelector(`#voice-user-${botId} .voice-user-avatar`);

        if (tile) tile.classList.toggle('speaking', isSpeaking);
        if (avatar) avatar.classList.toggle('speaking', isSpeaking);
    }

    /**
     * Chat Drawer Messages Handling
     */
    sendChatMessage(text) {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.renderChatMessage({
            author: this.userState.displayName,
            text: text,
            timestamp: timestamp,
            avatarColor: this.userState.avatarColor
        });

        // Trigger bot auto-reply
        window.partyBotEngine.generateBotResponse(text, (botMsg) => {
            this.showTypingIndicator(botMsg.author);
            setTimeout(() => {
                this.hideTypingIndicator();
                this.renderChatMessage(botMsg);
            }, 1200);
        });
    }

    renderChatMessage(msg) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-message';
        msgDiv.innerHTML = `
            <div class="message-avatar" style="background-color: ${msg.avatarColor}">${msg.author.substring(0, 2).toUpperCase()}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${msg.author}</span>
                    <span class="message-timestamp">${msg.timestamp}</span>
                </div>
                <div class="message-body">${msg.text}</div>
            </div>
        `;
        this.dom.messagesContainer.appendChild(msgDiv);
        this.dom.messagesContainer.scrollTop = this.dom.messagesContainer.scrollHeight;
    }

    appendSystemChatMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-message system-notice';
        msgDiv.style.opacity = '0.85';
        msgDiv.innerHTML = `
            <div class="message-content" style="font-size: 12px; color: var(--accent-gold);">
                <i class="fa-solid fa-circle-info"></i> ${text}
            </div>
        `;
        this.dom.messagesContainer.appendChild(msgDiv);
        this.dom.messagesContainer.scrollTop = this.dom.messagesContainer.scrollHeight;
    }

    showTypingIndicator(username) {
        this.dom.typingUsername.innerText = username;
        this.dom.typingIndicator.classList.remove('hidden');
    }

    hideTypingIndicator() {
        this.dom.typingIndicator.classList.add('hidden');
    }

    leaveVoiceChannel() {
        this.appendSystemChatMessage('Disconnected from voice channel.');
        this.dom.videoGrid.innerHTML = `
            <div class="chat-welcome-notice" style="color: var(--text-muted)">
                <h3>Disconnected from Voice</h3>
                <p>Click on any voice channel in the sidebar to reconnect.</p>
            </div>
        `;
    }
}

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    window.nexusPartyApp = new NexusPartyApp();
});
