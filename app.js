// Landing Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check if Supabase is properly configured
    if (!supabase || SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
        utils.showNotification('Please configure Supabase credentials in config.js', 'error');
        return;
    }

    // DOM elements
    const videoUrlInput = document.getElementById('videoUrl');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const btnText = document.querySelector('.btn-text');
    const btnLoader = document.querySelector('.btn-loader');
    const roomCreatedSection = document.getElementById('roomCreated');
    const roomLinkInput = document.getElementById('roomLink');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const createRoomSection = document.querySelector('.create-room-section');

    // State
    let currentRoomId = null;

    // Event listeners
    createRoomBtn.addEventListener('click', handleCreateRoom);
    copyLinkBtn.addEventListener('click', handleCopyLink);
    joinRoomBtn.addEventListener('click', handleJoinRoom);
    videoUrlInput.addEventListener('input', validateInput);
    videoUrlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleCreateRoom();
        }
    });

    // Validate input on page load
    validateInput();

    // Functions
    function validateInput() {
        const url = videoUrlInput.value.trim();
        const isValid = url && utils.isValidYouTubeUrl(url);
        
        createRoomBtn.disabled = !isValid;
        
        if (url && !isValid) {
            videoUrlInput.style.borderColor = '#dc3545';
        } else {
            videoUrlInput.style.borderColor = '#e1e5e9';
        }
    }

    async function handleCreateRoom() {
        const videoUrl = videoUrlInput.value.trim();
        
        if (!videoUrl) {
            utils.showNotification('Please enter a YouTube URL', 'error');
            return;
        }

        if (!utils.isValidYouTubeUrl(videoUrl)) {
            utils.showNotification('Please enter a valid YouTube URL', 'error');
            return;
        }

        // Extract video ID to validate
        const videoId = utils.extractYouTubeId(videoUrl);
        if (!videoId) {
            utils.showNotification('Could not extract video ID from URL', 'error');
            return;
        }

        // Show loading state
        setLoadingState(true);

        try {
            // Create room in database
            const result = await db.createRoom(videoUrl);
            
            if (result.success) {
                currentRoomId = result.roomId;
                showRoomCreated(result.roomId);
                utils.showNotification('Room created successfully!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error creating room:', error);
            utils.showNotification('Failed to create room. Please try again.', 'error');
        } finally {
            setLoadingState(false);
        }
    }

    function setLoadingState(loading) {
        createRoomBtn.disabled = loading;
        btnText.style.display = loading ? 'none' : 'inline';
        btnLoader.style.display = loading ? 'inline' : 'none';
        videoUrlInput.disabled = loading;
    }

    function showRoomCreated(roomId) {
        // Hide create room form
        createRoomSection.style.display = 'none';
        
        // Show room created section
        roomCreatedSection.style.display = 'block';
        
        // Generate and display room link
        const roomLink = generateRoomLink(roomId);
        roomLinkInput.value = roomLink;
        
        // Update room ID display
        const roomIdDisplay = document.getElementById('roomId');
        if (roomIdDisplay) {
            roomIdDisplay.textContent = `Room: ${roomId}`;
        }
    }

    function generateRoomLink(roomId) {
        const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
        return `${baseUrl}room.html?room=${roomId}`;
    }

    async function handleCopyLink() {
        try {
            const success = await utils.copyToClipboard(roomLinkInput.value);
            if (success) {
                utils.showNotification('Link copied to clipboard!', 'success');
                
                // Visual feedback
                const originalText = copyLinkBtn.textContent;
                copyLinkBtn.textContent = 'Copied!';
                copyLinkBtn.style.background = '#28a745';
                
                setTimeout(() => {
                    copyLinkBtn.textContent = originalText;
                    copyLinkBtn.style.background = '';
                }, 2000);
            }
        } catch (error) {
            utils.showNotification('Failed to copy link', 'error');
        }
    }

    function handleJoinRoom() {
        if (currentRoomId) {
            window.location.href = `room.html?room=${currentRoomId}`;
        }
    }

    // Handle browser back button
    window.addEventListener('popstate', function() {
        // Reset to initial state if user navigates back
        resetToInitialState();
    });

    function resetToInitialState() {
        createRoomSection.style.display = 'flex';
        roomCreatedSection.style.display = 'none';
        videoUrlInput.value = '';
        currentRoomId = null;
        validateInput();
    }

    // Add some visual enhancements
    function addVisualEnhancements() {
        // Add focus effects to input
        videoUrlInput.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
            this.parentElement.style.transition = 'transform 0.2s ease';
        });

        videoUrlInput.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });

        // Add hover effects to buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', function() {
                if (!this.disabled) {
                    this.style.transform = 'translateY(-2px)';
                    this.style.transition = 'transform 0.2s ease';
                }
            });

            button.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
            });
        });
    }

    // Initialize visual enhancements
    addVisualEnhancements();

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to create room
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (!createRoomBtn.disabled && createRoomSection.style.display !== 'none') {
                handleCreateRoom();
            }
        }
        
        // Escape to reset
        if (e.key === 'Escape') {
            resetToInitialState();
        }
    });

    // Auto-focus on video URL input
    setTimeout(() => {
        videoUrlInput.focus();
    }, 500);

    // Add paste detection for YouTube URLs
    videoUrlInput.addEventListener('paste', function(e) {
        setTimeout(() => {
            validateInput();
            
            // Auto-detect and clean YouTube URLs
            const pastedText = this.value;
            if (pastedText.includes('youtube.com') || pastedText.includes('youtu.be')) {
                // Clean up common URL variations
                let cleanUrl = pastedText.trim();
                
                // Remove timestamp parameters for cleaner URLs
                cleanUrl = cleanUrl.replace(/[&?]t=\d+s?/, '');
                
                if (cleanUrl !== pastedText) {
                    this.value = cleanUrl;
                    validateInput();
                }
            }
        }, 100);
    });

    // Add connection status indicator
    function checkConnection() {
        if (supabase) {
            // Test connection by attempting to get a non-existent room
            db.getRoom('connection-test').then(result => {
                // Even if it fails, it means we can connect
                const indicator = document.createElement('div');
                indicator.style.cssText = `
                    position: fixed;
                    top: 10px;
                    left: 10px;
                    background: #28a745;
                    color: white;
                    padding: 5px 10px;
                    border-radius: 15px;
                    font-size: 0.8rem;
                    z-index: 1000;
                    opacity: 0.8;
                `;
                indicator.textContent = '🟢 Connected';
                document.body.appendChild(indicator);
                
                setTimeout(() => {
                    if (indicator.parentNode) {
                        indicator.parentNode.removeChild(indicator);
                    }
                }, 3000);
            }).catch(() => {
                utils.showNotification('Connection issue detected', 'error');
            });
        }
    }

    // Check connection on load
    setTimeout(checkConnection, 1000);
});