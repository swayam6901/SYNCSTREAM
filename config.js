// Supabase Configuration
// Replace these with your actual Supabase project credentials
const SUPABASE_CONFIG = {
    url: 'https://trghvobcfbgmsresikrm.supabase.co', // e.g., 'https://your-project.supabase.co'
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZ2h2b2JjZmJnbXNyZXNpa3JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODAwNTQsImV4cCI6MjA3MzI1NjA1NH0.RIWSnjXMQMK1NGJvLT3856uM_oY8-SFMhwzm6vAZy7M' // Your public anon key
};

// Check if Supabase credentials are configured
const isSupabaseConfigured = () => {
    return SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL' && 
           SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
           SUPABASE_CONFIG.url.startsWith('http');
};

// Initialize Supabase with fallback
let supabase = null;
let isOfflineMode = false;

if (isSupabaseConfigured() && typeof window !== 'undefined' && window.supabase) {
    try {
        supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log('✅ Supabase initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        isOfflineMode = true;
    }
} else {
    console.warn('⚠️ Supabase not configured - running in demo mode');
    isOfflineMode = true;
    document.addEventListener('DOMContentLoaded', () => {
        utils.showNotification('🎭 Demo Mode: Configure Supabase for full functionality', 'warning', 5000);
    });
}

// Demo data for offline mode
const demoData = {
    rooms: new Map(),
    messages: new Map(),
    participants: new Map(),
    videoStates: new Map()
};

// Loading state manager
const loadingManager = {
    activeLoaders: new Set(),
    
    show(id, message = 'Loading...') {
        this.activeLoaders.add(id);
        this.updateGlobalLoader();
        
        // Create specific loader if element exists
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('loading');
            const loader = element.querySelector('.loader');
            if (loader) {
                loader.textContent = message;
            }
        }
    },
    
    hide(id) {
        this.activeLoaders.delete(id);
        this.updateGlobalLoader();
        
        const element = document.getElementById(id);
        if (element) {
            element.classList.remove('loading');
        }
    },
    
    updateGlobalLoader() {
        const globalLoader = document.querySelector('.global-loader');
        if (globalLoader) {
            if (this.activeLoaders.size > 0) {
                globalLoader.style.display = 'flex';
            } else {
                globalLoader.style.display = 'none';
            }
        }
    }
};

// Utility functions
const utils = {
    // Generate unique room ID
    generateRoomId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    },

    // Check if app is in offline/demo mode
    isOfflineMode() {
        return isOfflineMode;
    },

    // Extract YouTube video ID from URL
    extractYouTubeId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    },

    // Format time for display
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    // Get current timestamp
    getCurrentTimestamp() {
        return new Date().toISOString();
    },

    // Copy text to clipboard with feedback
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('📋 Copied to clipboard!', 'success', 2000);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('📋 Copied to clipboard!', 'success', 2000);
            return true;
        }
    },

    // Enhanced notification system with animations
    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Add icon based on type
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icons[type] || icons.info}</span>
                <span class="notification-message">${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // Enhanced styling
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '16px 20px',
            borderRadius: '16px',
            color: 'white',
            fontWeight: '600',
            zIndex: '10000',
            transform: 'translateX(100%) scale(0.8)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            minWidth: '320px',
            maxWidth: '400px',
            opacity: '0'
        });
        
        // Set background gradient based on type
        const gradients = {
            success: 'linear-gradient(135deg, #00C851, #007E33)',
            error: 'linear-gradient(135deg, #ff4444, #CC0000)',
            warning: 'linear-gradient(135deg, #ffbb33, #FF8800)',
            info: 'linear-gradient(135deg, #33b5e5, #0099CC)'
        };
        notification.style.background = gradients[type] || gradients.info;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0) scale(1)';
            notification.style.opacity = '1';
        });
        
        // Auto remove after duration
        setTimeout(() => {
            notification.style.transform = 'translateX(100%) scale(0.8)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }, duration);
    },

    // Show loading spinner
    showLoader(elementId, message = 'Loading...') {
        loadingManager.show(elementId, message);
    },

    // Hide loading spinner
    hideLoader(elementId) {
        loadingManager.hide(elementId);
    },

    // Validate YouTube URL
    isValidYouTubeUrl(url) {
        const pattern = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
        return pattern.test(url);
    },

    // Get URL parameters
    getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    },

    // Sanitize HTML to prevent XSS
    sanitizeHtml(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },

    // Add smooth page transitions
    transitionToPage(url) {
        document.body.style.opacity = '0';
        document.body.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            window.location.href = url;
        }, 300);
    },

    // Animate element entrance
    animateIn(element, delay = 0) {
        if (!element) return;
        
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, delay);
    },

    // Debounce function for performance
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Database helper functions with offline fallback
const db = {
    // Create a new room
    async createRoom(videoUrl) {
        if (isOfflineMode) {
            const roomId = utils.generateRoomId();
            demoData.rooms.set(roomId, {
                id: roomId,
                video_url: videoUrl,
                created_at: utils.getCurrentTimestamp()
            });
            return { success: true, roomId, data: { id: roomId } };
        }
        
        try {
            const roomId = utils.generateRoomId();
            const { data, error } = await supabase
                .from('rooms')
                .insert({
                    id: roomId,
                    video_url: videoUrl,
                    created_at: utils.getCurrentTimestamp()
                })
                .select();
            
            if (error) throw error;
            return { success: true, roomId, data };
        } catch (error) {
            console.error('Error creating room:', error);
            return { success: false, error: error.message };
        }
    },

    // Get room details
    async getRoom(roomId) {
        if (isOfflineMode) {
            const room = demoData.rooms.get(roomId);
            if (room) {
                return { success: true, data: room };
            } else {
                return { success: false, error: 'Room not found' };
            }
        }
        
        try {
            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .eq('id', roomId)
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error getting room:', error);
            return { success: false, error: error.message };
        }
    },

    // Add participant to room
    async addParticipant(roomId, name) {
        if (isOfflineMode) {
            const participantId = utils.generateRoomId();
            const participant = {
                id: participantId,
                room_id: roomId,
                name: name,
                joined_at: utils.getCurrentTimestamp()
            };
            
            if (!demoData.participants.has(roomId)) {
                demoData.participants.set(roomId, []);
            }
            demoData.participants.get(roomId).push(participant);
            
            return { success: true, data: participant };
        }
        
        try {
            const { data, error } = await supabase
                .from('participants')
                .insert({
                    room_id: roomId,
                    name: name,
                    joined_at: utils.getCurrentTimestamp()
                })
                .select();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error adding participant:', error);
            return { success: false, error: error.message };
        }
    },

    // Get participants count
    async getParticipantsCount(roomId) {
        if (isOfflineMode) {
            const participants = demoData.participants.get(roomId) || [];
            return { success: true, count: participants.length };
        }
        
        try {
            const { count, error } = await supabase
                .from('participants')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', roomId);
            
            if (error) throw error;
            return { success: true, count };
        } catch (error) {
            console.error('Error getting participants count:', error);
            return { success: false, error: error.message };
        }
    },

    // Send message
    async sendMessage(roomId, senderName, message) {
        if (isOfflineMode) {
            const messageData = {
                id: utils.generateRoomId(),
                room_id: roomId,
                sender_name: senderName,
                message: message,
                created_at: utils.getCurrentTimestamp()
            };
            
            if (!demoData.messages.has(roomId)) {
                demoData.messages.set(roomId, []);
            }
            demoData.messages.get(roomId).push(messageData);
            
            return { success: true, data: messageData };
        }
        
        try {
            const { data, error } = await supabase
                .from('messages')
                .insert({
                    room_id: roomId,
                    sender_name: senderName,
                    message: message,
                    created_at: utils.getCurrentTimestamp()
                })
                .select();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error sending message:', error);
            return { success: false, error: error.message };
        }
    },

    // Get messages
    async getMessages(roomId, limit = 50) {
        if (isOfflineMode) {
            const messages = demoData.messages.get(roomId) || [];
            return { success: true, data: messages.slice(-limit) };
        }
        
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('room_id', roomId)
                .order('created_at', { ascending: true })
                .limit(limit);
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error getting messages:', error);
            return { success: false, error: error.message };
        }
    },

    // Update video state
    async updateVideoState(roomId, currentTime, isPlaying) {
        if (isOfflineMode) {
            demoData.videoStates.set(roomId, {
                room_id: roomId,
                current_time: currentTime,
                is_playing: isPlaying,
                updated_at: utils.getCurrentTimestamp()
            });
            return { success: true, data: demoData.videoStates.get(roomId) };
        }
        
        try {
            const { data, error } = await supabase
                .from('video_state')
                .upsert({
                    room_id: roomId,
                    current_time: currentTime,
                    is_playing: isPlaying,
                    updated_at: utils.getCurrentTimestamp()
                })
                .select();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error updating video state:', error);
            return { success: false, error: error.message };
        }
    },

    // Get video state
    async getVideoState(roomId) {
        if (isOfflineMode) {
            const state = demoData.videoStates.get(roomId);
            return { success: true, data: state || null };
        }
        
        try {
            const { data, error } = await supabase
                .from('video_state')
                .select('*')
                .eq('room_id', roomId)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
            return { success: true, data };
        } catch (error) {
            console.error('Error getting video state:', error);
            return { success: false, error: error.message };
        }
    }
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.utils = utils;
    window.db = db;
    window.supabaseClient = supabase;
    window.loadingManager = loadingManager;
    window.isOfflineMode = isOfflineMode;
    
    // Add global error handler
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        utils.showNotification('An unexpected error occurred', 'error');
    });
    
    // Add page transition on load
    document.addEventListener('DOMContentLoaded', () => {
        document.body.style.opacity = '1';
        document.body.style.transform = 'scale(1)';
    });
}
