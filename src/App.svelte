<script lang="ts">
  import { onMount } from "svelte";

  // state

  let videoPlaying = $state(true);
  // Video elements for incoming and outgoing streams
  let outgoingVideo: HTMLVideoElement | undefined = $state();
  let incomingVideo: HTMLVideoElement | undefined = $state();
  // to store the devices from the stream
  let audioInputDevices: MediaDeviceInfo[] = $state([]);
  let audioOutputDevices: MediaDeviceInfo[] = $state([]);
  let videoInputDevices: MediaDeviceInfo[] = $state([]);
  // The stream. Client's stream
  let stream: MediaStream | null = $state(null);
  let connected: boolean = $state(false);
  let connectionState: RTCPeerConnectionState = $state("new");
  // default constraints
  // for deciding the tracks and their configurations that the stream would have
  let constraints: MediaStreamConstraints = $state({
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      aspectRatio: { ideal: 16 / 9 },
    },
    audio: true,
  });

  // gets permissions for IO at mount time
  const getPermissions = async () => {
    console.info("getPermissions fired!");

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!stream) {
        console.error("stream does not exist");
        return;
      }
      console.log("Stream is created");
      if (!outgoingVideo) {
        console.error("outgoingVideo is undefined.");
        return;
      }

      outgoingVideo.srcObject = stream;
      videoPlaying = true;
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
  let makingOffer = false;
  let isInitiator = false;

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
    connected = true;
    console.info("User connected!");
    console.log(event);

    if (incomingVideo) incomingVideo.srcObject = event.streams[0];
  };

  pc.onconnectionstatechange = (event) => {
    connectionState = pc.connectionState;
    if (connectionState == "disconnected") {
      connected = false;
      if (incomingVideo) incomingVideo.srcObject = null;
    }
  };

  pc.onnegotiationneeded = async () => {
    try {
      makingOffer = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const message: SignalMessage = { type: "offer", offer };
      socket.emit("signal", { room: roomName, data: message });
    } catch (err) {
      console.error(err);
    } finally {
      makingOffer = false;
    }
  };

  const joinRoom = () => {
    if (roomName) socket.emit("join", roomName);
  };

  socket.on("joined", async ({ isInitiator }) => {
    isInitiator = isInitiator;
    if (isInitiator) {
    } else {
      startCall();
    }
  });

  // Handle incoming signals
  let ignoreOffer = false;
  const polite = !isInitiator; // one peer must be polite, the other impolite

  socket.on("signal", async (msg: SignalMessage) => {
    if (msg.type === "offer") {
      const offerCollision = makingOffer || pc.signalingState !== "stable";

      ignoreOffer = !polite && offerCollision;
      if (ignoreOffer) return;

      if (offerCollision) {
        await pc.setLocalDescription({ type: "rollback" });
      }

      if (!stream) {
        console.error("stream is undefined");
        return;
      }

      stream.getTracks().forEach((track) => {
        const alreadySent = pc.getSenders().some((s) => s.track === track);
        if (!alreadySent) {
          if (!stream) {
            console.error("stream is undefined");
            return;
          }
          pc.addTrack(track, stream);
        }
      });

      await pc.setRemoteDescription(msg.offer);
      remoteDescSet = true;
      for (const c of pendingCandidates) await pc.addIceCandidate(c);
      pendingCandidates = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("signal", {
        room: roomName,
        userName: userName,
        data: { type: "answer", answer: pc.localDescription },
      });
    } else if (msg.type === "answer") {
      await pc.setRemoteDescription(msg.answer);
      remoteDescSet = true;
      for (const c of pendingCandidates) await pc.addIceCandidate(c);
      pendingCandidates = [];
    } else if (msg.type === "ice-candidate") {
      try {
        if (remoteDescSet) {
          await pc.addIceCandidate(msg.candidate);
        } else {
          pendingCandidates.push(msg.candidate);
        }
      } catch (err) {
        if (!ignoreOffer) throw err;
      }
    }
  });

  const startCall = async () => {
    console.info("startCall fired!");
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

<main>
  <div class="user-info">
    <span>Room No: <span>{roomName}</span></span>
    <span> State: <span>{connectionState}</span></span>
    <span>Username: <span>{userName}</span></span>
  </div>
  <Calls bind:incomingVideo bind:outgoingVideo {videoPlaying} {connected} />
  <MediaControl
    bind:stream
    bind:videoPlaying
    bind:constraints
    {audioInputDevices}
    {audioOutputDevices}
    {videoInputDevices}
    {outgoingVideo}
    {pc}
  />
</main>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  :global(html) {
    height: 100%;
  }
  :global(body) {
    height: 100%;
  }

  main {
    margin: auto;
    display: flex;
    flex-direction: column;
    padding: 0.5rem 2rem;
    justify-content: space-between;
    align-items: center;
    border: 1px solid saddlebrown;
    height: 100%;
    box-sizing: border-box;
    gap: 2rem;
  }

  .user-info {
    display: flex;
    justify-content: space-between;
    span {
      padding: 0 1rem;
      span {
        text-decoration: underline;
      }
    }
  }
</style>
