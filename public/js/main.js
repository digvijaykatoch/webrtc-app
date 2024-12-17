const socket = io();

// DOM elements
const joinScreen = document.getElementById('join-screen');
const videoChat = document.getElementById('video-chat');
const joinBtn = document.getElementById('join-btn');
const leaveBtn = document.getElementById('leave-btn');
const roomNameInput = document.getElementById('room-name');
const localVideo = document.getElementById('local-video');
const remoteVideos = document.getElementById('remote-videos');
const muteBtn = document.getElementById('mute-btn');
const videoBtn = document.getElementById('video-btn');

let localStream;
let peerConnections = {};
let isMuted = false;
let isVideoDisabled = false;

// Event listeners
joinBtn.addEventListener('click', () => {
  const roomName = roomNameInput.value;
  if (roomName) {
    joinRoom(roomName);
  }
});

leaveBtn.addEventListener('click', leaveRoom);
muteBtn.addEventListener('click', toggleMute);
videoBtn.addEventListener('click', toggleVideo);

// Join room
async function joinRoom(roomName) {
  joinScreen.style.display = 'none';
  videoChat.style.display = 'block';

  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  socket.emit('join', roomName);

  socket.on('offer', async (id, description) => {
    const peerConnection = new RTCPeerConnection();
    peerConnections[id] = peerConnection;

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit('answer', roomName, peerConnection.localDescription);

    peerConnection.ontrack = event => {
      const remoteVideo = createRemoteVideoElement(id, event.streams[0]);
      remoteVideos.appendChild(remoteVideo);
    };

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('candidate', roomName, event.candidate);
      }
    };
  });

  socket.on('answer', async (id, description) => {
    const peerConnection = peerConnections[id];
    await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
  });

  socket.on('candidate', (id, candidate) => {
    const peerConnection = peerConnections[id];
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  });

  socket.on('leave', id => {
    const peerConnection = peerConnections[id];
    peerConnection.close();
    delete peerConnections[id];
    removeRemoteVideoElement(id);
  });
}

// Leave room
function leaveRoom() {
  for (let id in peerConnections) {
    peerConnections[id].close();
    delete peerConnections[id];
  }
  localStream.getTracks().forEach(track => track.stop());
  joinScreen.style.display = 'block';
  videoChat.style.display = 'none';
  socket.emit('leave', roomNameInput.value);
  remoteVideos.innerHTML = '';
}

// Toggle mute
function toggleMute() {
  isMuted = !isMuted;
  localStream.getAudioTracks()[0].enabled = !isMuted;
  muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
}

// Toggle video
function toggleVideo() {
  isVideoDisabled = !isVideoDisabled;
  localStream.getVideoTracks()[0].enabled = !isVideoDisabled;
  videoBtn.textContent = isVideoDisabled ? 'Enable Video' : 'Disable Video';
}

// Create remote video element
function createRemoteVideoElement(id, stream) {
  const video = document.createElement('video');
  video.id = `remote-video-${id}`;
  video.srcObject = stream;
  video.autoplay = true;
  video.playsinline = true;
  return video;
}

// Remove remote video element
function removeRemoteVideoElement(id) {
  const video = document.getElementById(`remote-video-${id}`);
  if (video) {
    video.remove();
  }
}

