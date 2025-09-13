// Room Page JavaScript
let player;
let roomId;
let userName;
let isHost = false;
let messagesSubscription;
let videoStateSubscription;
let participantsSubscription;
let lastVideoState = null;
let isUpdatingFromRemote = false;

document.addEventListener('DOMContentLoaded', function() {
    // Check if Supabase is properly configured
    if (!supabase || SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
        utils.showNotification('Please configure Supabase credentials in config.js', 'error');
        return;
    }

    // Get room ID from URL
    roomId = utils.getUrlParameter('room');
    if (!roomId) {
        utils.showNotification('Invalid room ID', 'error');
        window.location.href = 'index.html';
        return;
    }

    // Update room ID display
    document.getElementById('roomId').textContent = `Room: ${roomId}`;

    // Initialize room
    initializeRoom();

    // Event listeners
    setupEventListeners();
});

// YouTube API ready callback
function onYouTubeIframeAPIReady() {
    console.log('YouTube API ready');
}

async function initializeRoom() {
    try {
        // Get room details
        const roomResult = await db.getRoom(roomId);
        if (!roomResult.success) {
            throw new Error('Room not found');
        }

        const room = roomResult.data;
        const videoId = utils.extractYouTubeId(room.video_url);
        
        if (!videoId) {
            throw new Error('Invalid video URL');
        }

        // Initialize YouTube player
        initializeYouTubePlayer(videoId);
        
        // Show join modal
        showJoinModal();
        
    } catch (error) {
        console.error('Error initializing room:', error);
        utils.showNotification('Failed to load room', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    }
}

function initializeYouTubePlayer(videoId) {
    player = new YT.Player('videoPlayer', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'disablekb': 1,
            'fs': 0,
            'modestbranding': 1,
            'rel': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    console.log('Player ready');
    hideVideoOverlay();
    
    // Enable controls
    document.getElementById('playBtn').disabled = false;
    
    // Load initial video state
    loadVideoState();
}

function onPlayerStateChange(event) {
    if (isUpdatingFromRemote) return;
    
    const isPlaying = event.data === YT.PlayerState.PLAYING;
    const currentTime = player.getCurrentTime();
    
    // Update play button
    updatePlayButton(isPlaying);
    
    // Update video state in database (only if user is host or first to interact)
    if (userName) {
        updateVideoStateInDB(currentTime, isPlaying);
    }
}

function setupEventListeners() {
    // Join modal
    document.getElementById('joinBtn').addEventListener('click', handleJoinRoom);
    document.getElementById('userName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleJoinRoom();
        }
    });
    
    // Video controls
    document.getElementById('playBtn').addEventListener('click', togglePlayPause);
    
    // Chat
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Room actions
    document.getElementById('shareRoomBtn').addEventListener('click', showShareModal);
    document.getElementById('leaveRoomBtn').addEventListener('click', leaveRoom);
    document.getElementById('copyShareBtn').addEventListener('click', copyShareLink);
    
    // Auto-focus on name input
    setTimeout(() => {
        document.getElementById('userName').focus();
    }, 500);
}

function showJoinModal() {
    document.getElementById('joinModal').style.display = 'flex';
}

function hideJoinModal() {
    document.getElementById('joinModal').style.display = 'none';
}

async function handleJoinRoom() {
    const nameInput = document.getElementById('userName');
    const name = nameInput.value.trim();
    
    if (!name) {
        utils.showNotification('Please enter your name', 'error');
        return;
    }
    
    if (name.length > 20) {
        utils.showNotification('Name must be 20 characters or less', 'error');
        return;
    }
    
    try {
        // Add participant to database
        const result = await db.addParticipant(roomId, name);
        if (!result.success) {
            throw new Error(result.error);
        }
        
        userName = name;
        hideJoinModal();
        
        // Enable chat
        enableChat();
        
        // Load existing messages
        loadMessages();
        
        // Subscribe to real-time updates
        subscribeToUpdates();
        
        // Update participants count
        updateParticipantsCount();
        
        // Send join message
        sendSystemMessage(`${name} joined the room`);
        
        utils.showNotification(`Welcome, ${name}!`, 'success');
        
    } catch (error) {
        console.error('Error joining room:', error);
        utils.showNotification('Failed to join room', 'error');
    }
}

function enableChat() {
    document.getElementById('chatInput').disabled = false;
    document.getElementById('sendBtn').disabled = false;
    document.getElementById('chatInput').placeholder = 'Type a message...';
}

async function loadMessages() {
    try {
        const result = await db.getMessages(roomId);
        if (result.success) {
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.innerHTML = '';
            
            result.data.forEach(message => {
                displayMessage(message);
            });
            
            scrollToBottom();
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function subscribeToUpdates() {
    // Subscribe to new messages
    messagesSubscription = supabase
        .channel('messages')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${roomId}`
        }, (payload) => {
            displayMessage(payload.new);
            scrollToBottom();
        })
        .subscribe();
    
    // Subscribe to video state changes
    videoStateSubscription = supabase
        .channel('video_state')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'video_state',
            filter: `room_id=eq.${roomId}`
        }, (payload) => {
            if (payload.new && payload.new.updated_at !== lastVideoState?.updated_at) {
                syncVideoState(payload.new);
            }
        })
        .subscribe();
    
    // Subscribe to participant changes
    participantsSubscription = supabase
        .channel('participants')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'participants',
            filter: `room_id=eq.${roomId}`
        }, () => {
            updateParticipantsCount();
        })
        .subscribe();
}

function displayMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    
    const isSystemMessage = message.sender_name === 'System';
    messageDiv.className = isSystemMessage ? 'message system-message' : 'message';
    
    const time = new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageDiv.innerHTML = `
        ${!isSystemMessage ? `<div class="message-sender">${utils.sanitizeHtml(message.sender_name)}</div>` : ''}
        <div class="message-content">${utils.sanitizeHtml(message.message)}</div>
        <div class="message-time">${time}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
}

function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message || !userName) return;
    
    try {
        const result = await db.sendMessage(roomId, userName, message);
        if (result.success) {
            input.value = '';
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        utils.showNotification('Failed to send message', 'error');
    }
}

async function sendSystemMessage(message) {
    try {
        await db.sendMessage(roomId, 'System', message);
    } catch (error) {
        console.error('Error sending system message:', error);
    }
}

function togglePlayPause() {
    if (!player || !userName) return;
    
    const playerState = player.getPlayerState();
    const isPlaying = playerState === YT.PlayerState.PLAYING;
    
    if (isPlaying) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
}

function updatePlayButton(isPlaying) {
    const playIcon = document.querySelector('.play-icon');
    const pauseIcon = document.querySelector('.pause-icon');
    
    if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'inline';
    } else {
        playIcon.style.display = 'inline';
        pauseIcon.style.display = 'none';
    }
}

async function updateVideoStateInDB(currentTime, isPlaying) {
    try {
        const result = await db.updateVideoState(roomId, currentTime, isPlaying);
        if (result.success) {
            lastVideoState = result.data[0];
        }
    } catch (error) {
        console.error('Error updating video state:', error);
    }
}

async function loadVideoState() {
    try {
        const result = await db.getVideoState(roomId);
        if (result.success && result.data) {
            syncVideoState(result.data);
        }
    } catch (error) {
        console.error('Error loading video state:', error);
    }
}

function syncVideoState(videoState) {
    if (!player || !videoState) return;
    
    isUpdatingFromRemote = true;
    
    const currentTime = player.getCurrentTime();
    const timeDiff = Math.abs(currentTime - videoState.current_time);
    
    // Sync time if difference is significant (more than 2 seconds)
    if (timeDiff > 2) {
        player.seekTo(videoState.current_time, true);
    }
    
    // Sync play state
    const playerState = player.getPlayerState();
    const isCurrentlyPlaying = playerState === YT.PlayerState.PLAYING;
    
    if (videoState.is_playing && !isCurrentlyPlaying) {
        player.playVideo();
    } else if (!videoState.is_playing && isCurrentlyPlaying) {
        player.pauseVideo();
    }
    
    updatePlayButton(videoState.is_playing);
    lastVideoState = videoState;
    
    setTimeout(() => {
        isUpdatingFromRemote = false;
    }, 1000);
}

async function updateParticipantsCount() {
    try {
        const result = await db.getParticipantsCount(roomId);
        if (result.success) {
            document.getElementById('participantCount').textContent = result.count;
            document.getElementById('onlineCount').textContent = `${result.count} online`;
        }
    } catch (error) {
        console.error('Error updating participants count:', error);
    }
}

function showShareModal() {
    const shareLink = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    document.getElementById('shareLink').value = shareLink;
    document.getElementById('shareModal').style.display = 'flex';
}

function closeShareModal() {
    document.getElementById('shareModal').style.display = 'none';
}

async function copyShareLink() {
    const shareLink = document.getElementById('shareLink').value;
    try {
        const success = await utils.copyToClipboard(shareLink);
        if (success) {
            utils.showNotification('Link copied to clipboard!', 'success');
            
            const btn = document.getElementById('copyShareBtn');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            btn.style.background = '#28a745';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 2000);
        }
    } catch (error) {
        utils.showNotification('Failed to copy link', 'error');
    }
}

function leaveRoom() {
    if (confirm('Are you sure you want to leave the room?')) {
        // Send leave message
        if (userName) {
            sendSystemMessage(`${userName} left the room`);
        }
        
        // Clean up subscriptions
        if (messagesSubscription) messagesSubscription.unsubscribe();
        if (videoStateSubscription) videoStateSubscription.unsubscribe();
        if (participantsSubscription) participantsSubscription.unsubscribe();
        
        // Redirect to home
        window.location.href = 'index.html';
    }
}

function hideVideoOverlay() {
    const overlay = document.getElementById('videoOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Update video time display
setInterval(() => {
    if (player && player.getCurrentTime) {
        try {
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();
            
            if (currentTime && duration) {
                const timeDisplay = document.getElementById('videoTime');
                timeDisplay.textContent = `${utils.formatTime(currentTime)} / ${utils.formatTime(duration)}`;
            }
        } catch (error) {
            // Ignore errors when player is not ready
        }
    }
}, 1000);

// Handle page unload
window.addEventListener('beforeunload', function() {
    if (userName) {
        // Send leave message (best effort)
        navigator.sendBeacon && navigator.sendBeacon('/api/leave', JSON.stringify({
            roomId,
            userName
        }));
    }
});

// Handle visibility change (tab switching)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && player) {
        // Resync when tab becomes visible
        setTimeout(loadVideoState, 500);
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Space to play/pause (when not typing in chat)
    if (e.code === 'Space' && document.activeElement.id !== 'chatInput') {
        e.preventDefault();
        togglePlayPause();
    }
    
    // Enter to focus chat
    if (e.key === 'Enter' && document.activeElement.id !== 'chatInput' && document.activeElement.id !== 'userName') {
        document.getElementById('chatInput').focus();
    }
    
    // Escape to leave room
    if (e.key === 'Escape') {
        leaveRoom();
    }
});

// Make functions available globally for HTML onclick handlers
window.closeShareModal = closeShareModal;