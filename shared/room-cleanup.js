/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

/**
 * Room Cleanup Utilities
 * Handles cleanup of expired and abandoned rooms
 */
class RoomCleanup {
    constructor() {
        this.cleanupInterval = null;
        this.cleanupIntervalMs = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Start automatic cleanup process
     */
    startAutoCleanup() {
        if (this.cleanupInterval) {
            console.warn('⚠️ Cleanup already running');
            return;
        }

        console.log('🧹 Starting automatic room cleanup');
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredRooms();
        }, this.cleanupIntervalMs);

        // Run cleanup immediately
        this.cleanupExpiredRooms();
    }

    /**
     * Stop automatic cleanup
     */
    stopAutoCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('🛑 Stopped automatic room cleanup');
        }
    }

    /**
     * Clean up expired rooms
     */
    async cleanupExpiredRooms() {
        if (!database) {
            console.warn('⚠️ Database not initialized, skipping cleanup');
            return;
        }

        // Check if we have proper connection
        if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
            console.warn('⚠️ Firebase not connected, skipping cleanup');
            return;
        }

        try {
            console.log('🧹 Running room cleanup...');
            const roomsRef = database.ref('rooms');
            const snapshot = await roomsRef.once('value');
            const rooms = snapshot.val();

            if (!rooms) {
                console.log('✅ No rooms to clean up');
                return;
            }

            const now = Date.now();
            const expiryTime = MP_CONSTANTS.ROOM_EXPIRY_HOURS * 60 * 60 * 1000;
            let cleanedCount = 0;

            for (const [roomId, roomData] of Object.entries(rooms)) {
                let shouldDelete = false;
                let reason = '';

                // Check if room is expired
                if (roomData.meta && roomData.meta.createdAt) {
                    const age = now - roomData.meta.createdAt;
                    if (age > expiryTime) {
                        shouldDelete = true;
                        reason = 'expired';
                    }
                }

                // Check if room is empty
                if (!roomData.players || Object.keys(roomData.players).length === 0) {
                    shouldDelete = true;
                    reason = 'empty';
                }

                // Check if host disconnected and no players left
                if (roomData.meta && roomData.meta.hostDisconnected) {
                    if (!roomData.players || Object.keys(roomData.players).length === 0) {
                        shouldDelete = true;
                        reason = 'host_disconnected';
                    }
                }

                // Check if game finished and has been inactive
                if (roomData.meta && roomData.meta.status === MP_CONSTANTS.ROOM_STATUS.FINISHED) {
                    const finishedAt = roomData.meta.finishedAt || roomData.meta.createdAt;
                    const inactiveTime = 30 * 60 * 1000; // 30 minutes
                    if (now - finishedAt > inactiveTime) {
                        shouldDelete = true;
                        reason = 'finished_inactive';
                    }
                }

                // Check if all players have exited
                if (roomData.players && Object.keys(roomData.players).length > 0) {
                    const allExited = Object.values(roomData.players).every(player => player.exited === true);
                    if (allExited) {
                        shouldDelete = true;
                        reason = 'all_players_exited';
                    }
                }

                if (shouldDelete) {
                    await roomsRef.child(roomId).remove();
                    cleanedCount++;
                    console.log(`🗑️ Cleaned up room ${roomId} (${reason})`);
                }
            }

            if (cleanedCount > 0) {
                console.log(`✅ Cleaned up ${cleanedCount} room(s)`);
            } else {
                console.log('✅ No rooms needed cleanup');
            }
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }

    /**
     * Clean up specific room
     */
    async cleanupRoom(roomId, reason = 'manual') {
        if (!database) {
            throw new Error('Database not initialized');
        }

        try {
            await database.ref(`rooms/${roomId}`).remove();
            console.log(`🗑️ Cleaned up room ${roomId} (${reason})`);
            return true;
        } catch (error) {
            console.error(`❌ Error cleaning up room ${roomId}:`, error);
            return false;
        }
    }

    /**
     * Mark room for cleanup after delay
     */
    async scheduleRoomCleanup(roomId, delayMs = 60000) {
        setTimeout(() => {
            this.cleanupRoom(roomId, 'scheduled');
        }, delayMs);
        console.log(`⏰ Scheduled cleanup for room ${roomId} in ${delayMs / 1000}s`);
    }

    /**
     * Handle host disconnect - delete room
     * Updated: When host leaves/disconnects, room is deleted entirely
     */
    async handleHostDisconnect(roomId) {
        if (!database) {
            console.warn('⚠️ Database not initialized');
            return;
        }

        try {
            const roomRef = database.ref(`rooms/${roomId}`);
            const snapshot = await roomRef.once('value');
            const roomData = snapshot.val();

            if (!roomData) {
                console.log(`⚠️ Room ${roomId} not found`);
                return;
            }

            // When host disconnects, close the entire room
            console.log(`👑 Host disconnected from room ${roomId} - closing room`);
            await roomRef.child('meta/status').set('closed');
            await roomRef.child('meta/closedReason').set('Host disconnected');
            
            // Give clients time to receive the notification
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Delete the room
            await this.cleanupRoom(roomId, 'host_disconnect');
        } catch (error) {
            console.error(`❌ Error handling host disconnect in room ${roomId}:`, error);
        }
    }

    /**
     * Remove inactive players from room
     */
    async removeInactivePlayers(roomId, inactiveThresholdMs = 5 * 60 * 1000) {
        if (!database) {
            console.warn('⚠️ Database not initialized');
            return;
        }

        try {
            const roomRef = database.ref(`rooms/${roomId}`);
            const snapshot = await roomRef.once('value');
            const roomData = snapshot.val();

            if (!roomData || !roomData.players) {
                return;
            }

            const now = Date.now();
            let removedCount = 0;

            for (const [playerId, player] of Object.entries(roomData.players)) {
                if (player.lastSeen && (now - player.lastSeen > inactiveThresholdMs)) {
                    await roomRef.child(`players/${playerId}`).remove();
                    removedCount++;
                    console.log(`👋 Removed inactive player ${player.name} from room ${roomId}`);
                }
            }

            if (removedCount > 0) {
                // Check if room is now empty
                const updatedSnapshot = await roomRef.child('players').once('value');
                if (!updatedSnapshot.exists()) {
                    await this.cleanupRoom(roomId, 'all_players_inactive');
                }
            }
        } catch (error) {
            console.error(`❌ Error removing inactive players from room ${roomId}:`, error);
        }
    }

    /**
     * Get cleanup statistics
     */
    async getCleanupStats() {
        if (!database) {
            return null;
        }

        try {
            const snapshot = await database.ref('rooms').once('value');
            const rooms = snapshot.val();

            if (!rooms) {
                return {
                    totalRooms: 0,
                    expiredRooms: 0,
                    emptyRooms: 0,
                    finishedRooms: 0
                };
            }

            const now = Date.now();
            const expiryTime = MP_CONSTANTS.ROOM_EXPIRY_HOURS * 60 * 60 * 1000;

            const stats = {
                totalRooms: Object.keys(rooms).length,
                expiredRooms: 0,
                emptyRooms: 0,
                finishedRooms: 0,
                activeRooms: 0
            };

            for (const roomData of Object.values(rooms)) {
                if (roomData.meta) {
                    // Check expired
                    if (roomData.meta.createdAt && (now - roomData.meta.createdAt > expiryTime)) {
                        stats.expiredRooms++;
                    }

                    // Check finished
                    if (roomData.meta.status === MP_CONSTANTS.ROOM_STATUS.FINISHED) {
                        stats.finishedRooms++;
                    }

                    // Check active
                    if (roomData.meta.status === MP_CONSTANTS.ROOM_STATUS.PLAYING) {
                        stats.activeRooms++;
                    }
                }

                // Check empty
                if (!roomData.players || Object.keys(roomData.players).length === 0) {
                    stats.emptyRooms++;
                }
            }

            return stats;
        } catch (error) {
            console.error('❌ Error getting cleanup stats:', error);
            return null;
        }
    }
}

// Create singleton instance
const roomCleanup = new RoomCleanup();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RoomCleanup, roomCleanup };
}
