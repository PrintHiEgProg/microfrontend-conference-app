const socket = io('http://localhost:3000'); // URL вашего сервера

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const roomID = urlParams.get('room');

if (document.title === "Broadcaster") {
    const localVideo = document.getElementById('localVideo');
    
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            localVideo.srcObject = stream;
            socket.emit('broadcaster', roomID);

            socket.on('watcher', id => {
                const peerConnection = new RTCPeerConnection();
                stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

                peerConnection.createOffer()
                    .then(offer => {
                        return peerConnection.setLocalDescription(offer);
                    })
                    .then(() => {
                        socket.emit('offer', { offer: peerConnection.localDescription, roomID, id });
                    });

                socket.on('answer', answer => {
                    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                });

                socket.on('iceCandidate', candidate => {
                    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                });
            });
        });
} else if (document.title === "Member") {
  const remoteVideo = document.getElementById("remoteVideo");

  socket.emit("watcher", roomID);

  socket.on("offer", ({ offer, id }) => {
    const peerConnection = new RTCPeerConnection();
    peerConnection
      .setRemoteDescription(new RTCSessionDescription(offer))
      .then(() =>
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      )
      .then((stream) => {
        stream
          .getTracks()
          .forEach((track) => peerConnection.addTrack(track, stream));
        return peerConnection.createAnswer();
      })
      .then((answer) => {
        return peerConnection.setLocalDescription(answer);
      })
      .then(() => {
        socket.emit("answer", {
          answer: peerConnection.localDescription,
          roomID,
          id,
        });
      });

    peerConnection.ontrack = (event) => {
      remoteVideo.srcObject = event.streams[0];
    };

    socket.on("iceCandidate", (candidate) => {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });
  });
}