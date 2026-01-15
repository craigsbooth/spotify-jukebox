// routes/quiz_socket.js - Real-Time Event Handler for Music Quiz (v3.4 - Dual Broadcast)
const quizEngine = require('./quiz_engine');

module.exports = (io) => {
    io.on('connection', (socket) => {
        // 1. DEFAULT: Join the Guest Room
        // This ensures every connection gets at least the masked public state.
        socket.join('quiz_guests');
        socket.emit('quiz_update', quizEngine.getPublicState());

        // 2. ROOM MANAGEMENT: Allow Projector/Host to upgrade their connection
        socket.on('join_room', (roomName) => {
            if (roomName === 'quiz_projector') {
                socket.leave('quiz_guests');
                socket.join('quiz_projector');
                // Immediately send the FULL unmasked state to the projector
                socket.emit('quiz_update', quizEngine.gameState);
                console.log(`📺 Projector/Host Synced: ${socket.id}`);
            }
        });

        // 3. Handle Client Actions
        socket.on('quiz_action', (payload) => {
            // --- ACTION: ROLL DICE (If using board game elements) ---
            if (payload.type === 'ROLL') {
                const steps = Math.floor(Math.random() * 6) + 1; 
                console.log(`🎲 Team ${payload.teamId} rolled a ${steps}`);
                
                if (typeof quizEngine.moveTeam === 'function') {
                    quizEngine.moveTeam(payload.teamId, steps);
                }
                
                // Broadcast updates to respective rooms
                io.to('quiz_projector').emit('quiz_update', quizEngine.gameState);
                io.to('quiz_guests').emit('quiz_update', quizEngine.getPublicState());
                
                io.emit('quiz_event', { type: 'ROLL_RESULT', teamId: payload.teamId, steps });
            }
        });

        // 4. Cleanup
        socket.on('disconnect', () => {
            // No action needed for transient mobile disconnects
        });
    });
};