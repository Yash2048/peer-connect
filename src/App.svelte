<script lang="ts">
  import "./app.css";
  import { onMount } from "svelte";

  // state

  let outgoingVideoPlaying = $state(true);
  let incomingVideoPlaying = $state(false);
  // Video elements for incoming and outgoing streams
  let outgoingVideo: HTMLVideoElement | undefined = $state();
  let incomingVideo: HTMLVideoElement | undefined = $state();
  // to store the devices from the stream
  let audioInputDevices: MediaDeviceInfo[] = $state([]);
  let audioOutputDevices: MediaDeviceInfo[] = $state([]);
  let videoInputDevices: MediaDeviceInfo[] = $state([]);
  // The stream. Client's stream
  let outgoingStream: MediaStream | null = $state(null);
  let incomingStream: MediaStream | null = $state(null);
  let connected: boolean = $state(false);
  let connectionState: RTCPeerConnectionState | "NA" = $state("NA");
  // default constraints
  // for deciding the tracks and their configurations that the stream would have
  let constraints: MediaStreamConstraints = $state({
    video: true,
    // {
    // width: { ideal: 1280 },
    // height: { ideal: 720 },
    // aspectRatio: { ideal: 1 / 2 },
    // },
    audio: true,
  });

  // gets permissions for IO at mount time
  const getPermissions = async () => {
    console.info("getPermissions fired!");

    try {
      outgoingStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!outgoingStream) {
        console.error("stream does not exist");
        return;
      }
      console.log("Stream is created");
      if (!outgoingVideo) {
        console.error("outgoingVideo is undefined.");
        return;
      }

      outgoingVideo.srcObject = outgoingStream;
      outgoingVideoPlaying = true;
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

  const socket = io("https://pegasus-helped-termite.ngrok-free.app", {
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
  let ignoreOffer = false;
  const polite = !isInitiator; // one peer must be polite, the other impolite

  // functions
  const joinRoom = () => {
    if (roomName) socket.emit("join", roomName);
  };

  const startCall = async () => {
    console.info("startCall fired!");
    if (outgoingStream)
      outgoingStream.getTracks().forEach((track) => {
        if (outgoingStream) pc.addTrack(track, outgoingStream);
      });
    else {
      console.error("stream is undefined");
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { room: roomName, data: { type: "offer", offer } });
  };

  // handlers
  const handleICECandidateEvent = (e: RTCPeerConnectionIceEvent) => {
    if (e.candidate) {
      socket.emit("signal", {
        room: roomName,
        data: { type: "ice-candidate", candidate: e.candidate.toJSON() },
      });
    }
  };
  const handleTrackEvent = (trackEv: RTCTrackEvent) => {
    console.info("handleTrackEvent fired!");

    if (!incomingStream) incomingStream = trackEv.streams[0];
    if (trackEv.track.kind == "video") incomingVideoPlaying = true;

    if (incomingVideo && !incomingVideo.srcObject)
      incomingVideo.srcObject = incomingStream;

    incomingStream.onremovetrack = (rmTrackEv) => {
      if (rmTrackEv.track.kind === "video") incomingVideoPlaying = false;
      if (incomingVideo) incomingVideo.srcObject = incomingStream;
    };
  };
  const handleNegotiationNeededEvent = async () => {
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
  const handleConnectionStateChangeEvent = (e: Event) => {
    connectionState = pc.connectionState;
    switch (connectionState) {
      case "connected":
        connected = true;
        break;

      default:
        break;
    }
    if (connectionState == "disconnected") {
      connected = false;
      if (incomingVideo) incomingVideo.srcObject = null;
    }
  };
  const handleRemoveTrackEvent = (e: Event) => {};

  const handleICEConnectionStateChangeEvent = (e: Event) => {};

  const handleICEGatheringStateChangeEvent = (e: Event) => {};
  const handleSignalingStateChangeEvent = (e: Event) => {};

  // events
  pc.onicecandidate = handleICECandidateEvent;
  pc.ontrack = handleTrackEvent;
  pc.onconnectionstatechange = handleConnectionStateChangeEvent;
  pc.onnegotiationneeded = handleNegotiationNeededEvent;

  //socket
  socket.on("joined", async ({ isInitiator }) => {
    isInitiator = isInitiator;
    if (isInitiator) {
    } else {
      startCall();
    }
  });
  socket.on("signal", async (msg: SignalMessage) => {
    if (msg.type === "offer") {
      const offerCollision = makingOffer || pc.signalingState !== "stable";

      ignoreOffer = !polite && offerCollision;
      if (ignoreOffer) return;

      if (offerCollision) {
        await pc.setLocalDescription({ type: "rollback" });
      }

      if (!outgoingStream) {
        console.error("stream is undefined");
        return;
      }

      outgoingStream.getTracks().forEach((track) => {
        const alreadySent = pc.getSenders().some((s) => s.track === track);
        if (!alreadySent) {
          if (!outgoingStream) {
            console.error("stream is undefined");
            return;
          }
          pc.addTrack(track, outgoingStream);
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

  // Handle incoming signals
  let a: HTMLDialogElement;

  onMount(async () => {
    a.showModal();
    await getPermissions();
    await getDevices();
  });
</script>

<dialog bind:this={a} id="call-info">
  <form method="dialog" onsubmit={joinRoom}>
    <fieldset>
      <label>
        <span>Room Name</span>
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
        <span>User Name</span>
        <input
          type="text"
          name="user-name"
          bind:value={userName}
          placeholder="My room"
          minlength="1"
          required
        />
      </label>
      <button>Start Call</button>
    </fieldset>
  </form>
</dialog>

<main>
  <div class="user-info">
    <span>Room No: <span>{roomName}</span></span>
    <span> State: <span>{connectionState}</span></span>
    <span>Username: <span>{userName}</span></span>
  </div>
  <Calls
    bind:incomingVideo
    bind:outgoingVideo
    {outgoingVideoPlaying}
    {incomingVideoPlaying}
    {connected}
  />
  <MediaControl
    bind:outgoingStream
    bind:outgoingVideoPlaying
    bind:constraints
    {audioInputDevices}
    {audioOutputDevices}
    {videoInputDevices}
    {outgoingVideo}
    {incomingVideo}
    {pc}
  />
</main>

<style>
  main {
    background-color: var(--bg);
    margin: auto;
    display: flex;
    flex-direction: column;
    padding: 0.5rem 2rem;
    justify-content: space-between;
    align-items: center;
    height: 100%;
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
  dialog {
    border: 0;
  }

  dialog#call-info {
    position: absolute;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    border: none;
    border-radius: 1rem;
    background: var(--bg);
    color: var(--text);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    width: min(360px, 90vw);
    font-family: system-ui, sans-serif;
  }

  dialog#call-info::backdrop {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(5px);
  }

  dialog#call-info form {
    padding: 1.75rem;
  }

  dialog#call-info fieldset {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  dialog#call-info label {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: var(--muted);
  }

  dialog#call-info input {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.6rem 0.75rem;
    color: var(--text);
    font-size: 0.95rem;
    outline: none;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
    &::placeholder {
      color: var(--muted);
      opacity: 0.7;
    }
    &:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(137, 180, 250, 0.2);
    }
  }

  dialog#call-info button {
    margin-top: 0.5rem;
    background: var(--accent);
    color: var(--accent-clr);
    border: none;
    border-radius: 0.5rem;
    padding: 0.65rem 1rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 0.15s ease,
      transform 0.1s ease;
  }

  dialog#call-info button:hover {
    background: var(--accent-hover);
  }

  dialog#call-info button:active {
    transform: scale(0.98);
  }
</style>
