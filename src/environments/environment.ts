// export const environment = {
//   production: false,
//   insightGenieApi: {
//     baseUrl: 'https://api.insightgenie.ai',
//     apiKey: 'b0e1f8cd-98c6-4710-88e3-2139ac5ba76e',
//     apiSecret: 'eb3870e4-adda-4e69-babe-5343f1d5e6c6'
//   },
//   backendApi: 'http://localhost:3000/api',
//   // WebRTC signaling server URL for development
//   webrtcSignalingUrl: 'http://localhost:3000',
//   // STUN servers for development
//   webrtcIceServers: [
//     // Google STUN servers
//     { urls: 'stun:stun.l.google.com:19302' },
//     { urls: 'stun:stun1.l.google.com:19302' },
//     { urls: 'stun:stun2.l.google.com:19302' },
//     { urls: 'stun:stun3.l.google.com:19302' },
//     { urls: 'stun:stun4.l.google.com:19302' },
//     // Additional STUN servers for better connectivity
//     { urls: 'stun:stun.stunprotocol.org:3478' },
//     { urls: 'stun:stun.voiparound.com' },
//     { urls: 'stun:stun.voipbuster.com' },
//     { urls: 'stun:stun.voipstunt.com' },
//     { urls: 'stun:stun.counterpath.com' },
//     { urls: 'stun:stun.1und1.de' },
//     // Free TURN servers for NAT traversal (essential for remote connections)
//     {
//       urls: 'turn:numb.viagenie.ca',
//       credential: 'muazkh',
//       username: 'webrtc@live.com'
//     },
//     {
//       urls: 'turn:192.158.29.39:3478?transport=udp',
//       credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
//       username: '28224511:1379330808'
//     },
//     {
//       urls: 'turn:192.158.29.39:3478?transport=tcp',
//       credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
//       username: '28224511:1379330808'
//     }
//   ]
// }; 



export const environment = {
  production: false,
  insightGenieApi: {
    baseUrl: 'https://api.insightgenie.ai',
    apiKey: 'b0e1f8cd-98c6-4710-88e3-2139ac5ba76e',
    apiSecret: 'eb3870e4-adda-4e69-babe-5343f1d5e6c6'
  },
  backendApi: 'https://qhealth-backend-v2.onrender.com/api',
  // WebRTC signaling server URL (HTTPS required for production)
  webrtcSignalingUrl: 'https://qhealth-backend-v2.onrender.com',
  // Enhanced STUN/TURN servers for remote connectivity
  webrtcIceServers: [
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Additional STUN servers for better connectivity
    { urls: 'stun:stun.stunprotocol.org:3478' },
    { urls: 'stun:stun.voiparound.com' },
    { urls: 'stun:stun.voipbuster.com' },
    { urls: 'stun:stun.voipstunt.com' },
    { urls: 'stun:stun.counterpath.com' },
    { urls: 'stun:stun.1und1.de' },
    // Free TURN servers for NAT traversal (essential for remote connections)
    {
      urls: 'turn:numb.viagenie.ca',
      credential: 'muazkh',
      username: 'webrtc@live.com'
    },
    {
      urls: 'turn:192.158.29.39:3478?transport=udp',
      credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      username: '28224511:1379330808'
    },
    {
      urls: 'turn:192.158.29.39:3478?transport=tcp',
      credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      username: '28224511:1379330808'
    }
  ]
};
