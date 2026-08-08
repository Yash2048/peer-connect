<script lang="ts">
  import { onMount } from "svelte";

  // state

  let playing = $state(false);
  let hasPerms = $state(false);
  // Video elements for incoming and outgoing streams
  let outgoingVideo: HTMLVideoElement | undefined = $state();
  let incomingVideo: HTMLVideoElement | undefined = $state();
  // to store the devices from the stream
  let audioInputDevices: MediaDeviceInfo[] = $state([]);
  let audioOutputDevices: MediaDeviceInfo[] = $state([]);
  let videoInputDevices: MediaDeviceInfo[] = $state([]);
  // The stream. Client's stream
  let stream: MediaStream | null = $state(null);

  // default constraints
  // for deciding the tracks and their configurations that the stream would have
  const constraints: MediaStreamConstraints = { video: true, audio: true };

  // gets permissions for IO at mount time
  const getPermissions = async () => {
    console.info("getPermissions fired!");

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (stream) {
        hasPerms = true;
        console.log("Stream is created");
      } else {
        console.error("stream does not exist");
      }
    } catch (error) {
      console.error(error);
    }
  };
  const getDevices = async () => {
    console.info("getDevices fired!");

    const devices = await navigator.mediaDevices.enumerateDevices();
    console.log("Devices:");
    console.table(devices);
    audioInputDevices = devices.filter((device) => device.kind == "audioinput");
    audioOutputDevices = devices.filter(
      (device) => device.kind == "audiooutput",
    );
    videoInputDevices = devices.filter((device) => device.kind == "videoinput");
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
    console.info("startCall fired!")
    if (stream)
      stream.getTracks().forEach((track) => {
        if (stream) pc.addTrack(track, stream);
      });
    else {
      console.error("stream is undefined");
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { room: roomName, data: { type: "offer", offer } });
  };

  onMount(async () => {
    await getPermissions();
    await getDevices();
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
  <Calls bind:incomingVideo bind:outgoingVideo />
  <MediaControl
    bind:stream
    {audioInputDevices}
    {audioOutputDevices}
    {videoInputDevices}
    {outgoingVideo}
    {hasPerms}
    {playing}
  />
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    padding: 0 2rem;
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
