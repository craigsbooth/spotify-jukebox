const request = require('supertest');
const app = require('../../server'); // Go up TWO levels to find server.js in root

describe('Jukebox Server API Core logic', () => {
  
  it('GET /queue - Returns an array', async () => {
    const res = await request(app).get('/queue');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /reorder - Correctly updates the priority sequence', async () => {
    const mockQueue = [
      { uri: 'spotify:track:1', name: 'Song A' },
      { uri: 'spotify:track:2', name: 'Song B' }
    ];
    // Move Song B to the top
    const reordered = [mockQueue[1], mockQueue[0]];
    
    const res = await request(app)
      .post('/reorder')
      .send({ queue: reordered });
    
    expect(res.statusCode).toEqual(200);
    
    const check = await request(app).get('/queue');
    // The server adds fallbacks to the queue call, but Song B should be first
    expect(check.body[0].uri).toBe('spotify:track:2');
  });

  it('POST /shuffle - Resets the fallback shuffle bag', async () => {
    const res = await request(app).post('/shuffle');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /reaction-event - Stores and broadcasts emoji reactions', async () => {
    const res = await request(app)
      .post('/reaction-event')
      .send({ emoji: '🔥' });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.emoji).toBe('🔥');
    expect(res.body.id).toBeDefined();
  });

  it('GET /fallback - Returns the currently active fallback playlist info', async () => {
    const res = await request(app).get('/fallback');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('name');
  });
});