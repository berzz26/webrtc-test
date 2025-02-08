const ws = new WebSocket("wss://webrtc-test-aht2.onrender.com");

let localStream;
let remoteStream;
let peerConnection;
const config = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" } // Google STUN server
    ]
};

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

// Get user media (camera & mic)
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = stream;
    })
    .catch(error => console.error("Error accessing media devices:", error));

// Handle WebSocket messages
ws.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    switch (data.type) {
        case "offer":
            await handleOffer(data.offer);
            break;
        case "answer":
            await handleAnswer(data.answer);
            break;
        case "candidate":
            if (peerConnection) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
            break;
    }
};

// Create WebRTC connection
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(config);

    // Add local stream to the connection
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
        if (!remoteStream) {
            remoteStream = new MediaStream();
            remoteVideo.srcObject = remoteStream;
        }
        remoteStream.addTrack(event.track);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            ws.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
        }
    };
}

// Handle incoming offer
async function handleOffer(offer) {
    createPeerConnection();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    ws.send(JSON.stringify({ type: "answer", answer }));
}

// Handle incoming answer
async function handleAnswer(answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

// Start call (send an offer)
async function startCall() {
    createPeerConnection();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: "offer", offer }));
}

// Attach `startCall` function to a button
document.getElementById("callButton").addEventListener("click", startCall);
