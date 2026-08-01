<script lang="ts">
  import { onMount } from "svelte";

  // state
  let playing = $state(false);
  let hasPerms = $state(false);
  let width = $state(480);
  let height = $state(240);
  let outgoingVideo: HTMLVideoElement | undefined = $state();
  let incomingVideo: HTMLVideoElement | undefined = $state();

  let stream: MediaStream | null;
  const constraints: MediaStreamConstraints = { video: true, audio: true };

  const getPermissions = async () => {
    console.log("get perms ran!");

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (stream) {
        hasPerms = true;
        console.log("stream is available");
      }
    } catch (error) {
      console.error(error);
    }
  };

  // WebRTC code
  let roomName = $state("");
  let userName = $state("");
  import { io } from "socket.io-client";
  import MediaControl from "./components/MediaControl.svelte";
  import Calls from "./components/Calls.svelte";

  const socket = io("http://localhost:8080", {
    transports: ["websocket", "polling"],
    upgrade: true,
  });

  type SignalMessage =
    | { type: "offer"; offer: RTCSessionDescriptionInit }
    | { type: "answer"; answer: RTCSessionDescriptionInit }
    | { type: "ice-candidate"; candidate: RTCIceCandidateInit };

  let rtcConfig: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };
  let pc = new RTCPeerConnection(rtcConfig);

  let pendingCandidates: RTCIceCandidateInit[] = [];
  let remoteDescSet = false;

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("signal", {
        room: roomName,
        data: { type: "ice-candidate", candidate: event.candidate.toJSON() },
      });
    }
  };

  pc.ontrack = (event) => {
    if (incomingVideo) incomingVideo.srcObject = event.streams[0];
  };

  const joinRoom = () => {
    if (roomName) socket.emit("join", roomName);
  };

  socket.on("joined", async ({ isInitiator }) => {
    if (isInitiator) {
    } else {
      startCall();
    }
  });

  // Handle incoming signals
  socket.on("signal", async (msg: SignalMessage) => {
    if (msg.type === "offer") {
      if (pc.signalingState !== "stable") {
        return;
      }

      if (stream) {
        stream.getTracks().forEach((track) => {
          if (stream) pc.addTrack(track, stream);
        });
      }

      await pc.setRemoteDescription(msg.offer);
      remoteDescSet = true;
      for (const c of pendingCandidates) await pc.addIceCandidate(c);
      pendingCandidates = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("signal", {
        room: roomName,
        userName: userName,
        data: { type: "answer", answer },
      });
    } else if (msg.type === "answer") {
      await pc.setRemoteDescription(msg.answer);
      remoteDescSet = true;
      for (const c of pendingCandidates) await pc.addIceCandidate(c);
      pendingCandidates = [];
    } else if (msg.type === "ice-candidate") {
      if (remoteDescSet) {
        await pc.addIceCandidate(msg.candidate);
      } else {
        pendingCandidates.push(msg.candidate);
      }
    }
  });
  const startCall = async () => {
    if (stream)
      stream.getTracks().forEach((track) => {
        if (stream) pc.addTrack(track, stream);
      });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { room: roomName, data: { type: "offer", offer } });
  };

  onMount(async () => {
    await getPermissions();
    // await getDevices();
  });
</script>

<dialog id="call-info" open>
  <form method="dialog" onsubmit={joinRoom}>
    <fieldset>
      <label>
        Room Name
        <input
          type="text"
          name="room-name"
          bind:value={roomName}
          placeholder="Meeting"
          minlength="1"
          required
        />
      </label>
      <label>
        User Name
        <input
          type="text"
          name="user-name"
          bind:value={userName}
          placeholder="My room"
          minlength="1"
          required
        />
      </label>
    </fieldset>
    <div role="group">
      <button>Start Call </button>
    </div>
  </form>
</dialog>

<div class="user-info">
  <span>Room No: <span>{roomName}</span></span>
  <span>Username: <span>{userName}</span></span>
</div>
<main>
  <MediaControl {stream} {outgoingVideo} {hasPerms} {height} {playing} {startCall} {width} />
  <Calls bind:incomingVideo bind:outgoingVideo />

</main>

<style>

  main {
    display: flex;
    padding: 4rem 2rem;
    justify-content: space-between;
  }



  .user-info {
    display: flex;
    justify-content: space-between;
    span {
      padding: 0.5rem 1rem;
      span {
        text-decoration: underline;
      }
    }
  }
</style>

