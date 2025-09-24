export const environment = {
  production: true,
  insightGenieApi: {
    baseUrl: 'https://api.insightgenie.ai',
    apiKey: 'b0e1f8cd-98c6-4710-88e3-2139ac5ba76e',
    apiSecret: 'eb3870e4-adda-4e69-babe-5343f1d5e6c6'
  },
  backendApi: 'https://qhealth-backend-v2.onrender.com/api',
  // WebRTC signaling server URL (HTTPS required for production)
  webrtcSignalingUrl: 'https://qhealth-backend-v2.onrender.com',
  // Enhanced STUN/TURN servers for production
  webrtcIceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ]
};
