"use strict";

const socket = io.connect();

const localVideo = document.querySelector("#localVideo-container video");
const videoGrid = document.querySelector("#videoGrid");
const notification = document.querySelector("#notification");
const notify = (message) => {
  notification.innerHTML = message;
};

const pcConfig = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
        "stun:stun3.l.google.com:19302",
        "stun:stun4.l.google.com:19302",
      ],
    },
    {
      urls: "turn:numb.viagenie.ca",
      credential: "muazkh",
      username: "webrtc@live.com",
    },
    {
      urls: "turn:numb.viagenie.ca",
      credential: "muazkh",
      username: "webrtc@live.com",
    },
    {
      urls: "turn:192.158.29.39:3478?transport=udp",
      credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
      username: "28224511:1379330808",
    },
  ],
};

/**
 * Initialize webrtc
 */
const webrtc = new Webrtc(socket, pcConfig, {
  log: true,
  warn: true,
  error: true,
});

/**
 * Create or join a room
 */
const roomInput = document.querySelector("#roomId");
const joinBtn = document.querySelector("#joinBtn");
joinBtn.addEventListener("click", () => {
  const room = roomInput.value;
  if (!room) {
    notify("Room ID not provided");
    return;
  }

  webrtc.joinRoom(room);
});

const setTitle = (status, e) => {
  const room = e.detail.roomId;

  console.log(`Room ${room} was ${status}`);

  notify(`Room ${room} was ${status}`);
  document.querySelector("h1").textContent = `Room: ${room}`;
  webrtc.gotStream();

  // Запрос доступа к камере и микрофону после присоединения к комнате
  webrtc
    .getLocalStream(true, { width: 640, height: 480, audio: true })
    .then((stream) => (localVideo.srcObject = stream))
    .catch((error) => {
      console.error("Can't get usermedia", error);
      notify("Can't get usermedia");
    });
};
webrtc.addEventListener("createdRoom", setTitle.bind(this, "created"));
webrtc.addEventListener("joinedRoom", setTitle.bind(this, "joined"));

/**
 * Leave the room
 */
const leaveBtn = document.querySelector("#leaveBtn");
leaveBtn.addEventListener("click", () => {
  webrtc.leaveRoom();
});
webrtc.addEventListener("leftRoom", (e) => {
  const room = e.detail.roomId;
  document.querySelector("h1").textContent = "";
  notify(`Left the room ${room}`);
});

/**
 * Get local media
 */
webrtc
  .getLocalStream(true, { width: 640, height: 480, audio: true })
  .then((stream) => (localVideo.srcObject = stream))
  .catch((error) => {
    console.error("Can't get usermedia", error);
    notify("Can't get usermedia");
  });

webrtc.addEventListener("kicked", () => {
  document.querySelector("h1").textContent = "You were kicked out";
  videoGrid.innerHTML = "";
});

webrtc.addEventListener("userLeave", (e) => {
  console.log(`user ${e.detail.socketId} left room`);
  notify(`User ${e.detail.socketId} left the room`);
});

/**
 * Handle new user connection
 */
webrtc.addEventListener("newUser", (e) => {
  const socketId = e.detail.socketId;
  const stream = e.detail.stream;

  // Add audio stream to peer connection
  webrtc.addStream(stream);

  const videoContainer = document.createElement("div");
  videoContainer.setAttribute("class", "grid-item");
  videoContainer.setAttribute("id", socketId);

  const video = document.createElement("video");
  video.setAttribute("autoplay", true);
  video.setAttribute("muted", false); // Set to false to hear audio
  video.setAttribute("playsinline", true);
  video.srcObject = stream;

  const p = document.createElement("p");
  p.textContent = socketId;

  videoContainer.append(p);
  videoContainer.append(video);

  // If user is admin add kick buttons and permission controls
  if (webrtc.isAdmin) {
    const kickBtn = document.createElement("button");
    kickBtn.setAttribute("class", "kick_btn");
    kickBtn.textContent = "Kick";

    kickBtn.addEventListener("click", () => {
      webrtc.kickUser(socketId);
    });

    const audioPermissionBtn = document.createElement("button");
    audioPermissionBtn.setAttribute("class", "permission_btn");
    audioPermissionBtn.textContent = "Allow Audio";

    audioPermissionBtn.addEventListener("click", () => {
      webrtc.grantAudioPermission(socketId);
      audioPermissionBtn.disabled = true;
    });

    const videoPermissionBtn = document.createElement("button");
    videoPermissionBtn.setAttribute("class", "permission_btn");
    videoPermissionBtn.textContent = "Allow Video";

    videoPermissionBtn.addEventListener("click", () => {
      webrtc.grantVideoPermission(socketId);
      videoPermissionBtn.disabled = true;
    });

    videoContainer.append(kickBtn);
    videoContainer.append(audioPermissionBtn);
    videoContainer.append(videoPermissionBtn);
  }
  videoGrid.append(videoContainer);
});

/**
 * Handle user got removed
 */
webrtc.addEventListener("removeUser", (e) => {
  const socketId = e.detail.socketId;
  if (!socketId) {
    // remove all remote stream elements
    videoGrid.innerHTML = "";
    return;
  }
  document.getElementById(socketId).remove();
});

/**
 * Handle errors
 */
webrtc.addEventListener("error", (e) => {
  const error = e.detail.error;
  console.error(error);

  notify(error);
});

/**
 * Handle notifications
 */
webrtc.addEventListener("notification", (e) => {
  const notif = e.detail.notification;
  console.log(notif);

  notify(notif);
});

/**
 * Grant audio permission to a user
 */
webrtc.grantAudioPermission = function (socketId) {
  this.mediaPermissions[socketId] = {
    audio: true,
    video: this.mediaPermissions[socketId]?.video || false,
  };
  this._sendMessage({ type: "grantAudioPermission" }, socketId);
};

/**
 * Grant video permission to a user
 */
webrtc.grantVideoPermission = function (socketId) {
  this.mediaPermissions[socketId] = {
    audio: this.mediaPermissions[socketId]?.audio || false,
    video: true,
  };
  this._sendMessage({ type: "grantVideoPermission" }, socketId);
};

/**
 * Handle permission grants
 */
webrtc.addEventListener("grantAudioPermission", (e) => {
  const socketId = e.detail.socketId;
  const videoContainer = document.getElementById(socketId);
  if (videoContainer) {
    const audioPermissionBtn = videoContainer.querySelector(
      '.permission_btn[data-type="audio"]'
    );
    if (audioPermissionBtn) audioPermissionBtn.disabled = true;
  }
});

webrtc.addEventListener("grantVideoPermission", (e) => {
  const socketId = e.detail.socketId;
  const videoContainer = document.getElementById(socketId);
  if (videoContainer) {
    const videoPermissionBtn = videoContainer.querySelector(
      '.permission_btn[data-type="video"]'
    );
    if (videoPermissionBtn) videoPermissionBtn.disabled = true;
  }
});

// Получаем ID комнаты из URL
const urlParams = new URLSearchParams(window.location.search);
const roomIdFromUrl = urlParams.get("room");

if (roomIdFromUrl) {
    // Если ID комнаты есть в URL, автоматически присоединяемся к комнате
    webrtc.joinRoom(roomIdFromUrl);
} else {
    // Если ID комнаты нет в URL, создаем новую комнату
    webrtc.joinRoom("");
}

// Обновляем URL при создании или присоединении к комнате
webrtc.addEventListener("createdRoom", (e) => {
  const room = e.detail.roomId;

  console.log(`Room ${room} was created`);

  notify(`Room ${room} was created`);
  document.querySelector("h1").textContent = `Room: ${room}`;
  webrtc.gotStream();

  // Send audio stream when creating peer connection
  webrtc.sendAudioStream();
});

webrtc.addEventListener("joinedRoom", (e) => {
  const roomId = e.detail.roomId;
  console.log("Joined room:", roomId);
    window.location.href = `index.html?room=${roomID}`;
  setTitle("joined", e);
});
