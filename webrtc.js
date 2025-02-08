const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

let localStream;
let peerConnection;
const ws = new WebSocket("ws://localhost:3000");

const servers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }], // STUN server for NAT traversal
};

let myName, otherPeer;

// Register with the signaling server
function register(name) {
    myName = name;
    ws.send(JSON.stringify({ type: "register", name }));
}

// Handle messages from WebSocket
ws.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    if (data.type === "offer") {
        otherPeer = data.from;
        await getMedia();
        createPeerConnection();

        await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        ws.send(JSON.stringify({ type: "answer", to: otherPeer, sdp: answer.sdp }));
    } else if (data.type === "answer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
    } else if (data.type === "ice-candidate") {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
};

// Get camera and mic access
async function getMedia() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
}

// Create WebRTC connection
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(servers);

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            ws.send(JSON.stringify({ type: "ice-candidate", to: otherPeer, candidate: event.candidate }));
        }
    };
}

// Start a call
async function startCall(peerName) {
    otherPeer = peerName;
    await getMedia();
    createPeerConnection();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    ws.send(JSON.stringify({ type: "offer", to: otherPeer, sdp: offer.sdp }));
}
