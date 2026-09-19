<script lang="ts">
  import "./app.css";
  import { onMount } from "svelte";
  import { io } from "socket.io-client";
  import MediaControl from "./components/MediaControl.svelte";
  import Calls from "./components/Calls.svelte";
  import Dialog from "./components/Dialog.svelte";

  // State
  let localVideoPlaying = $state(true);
  let localAudioPlaying = $state(true);
  let remoteVideoPlaying = $state(false);
  let remoteAudioPlaying = $state(false);
  // video elements for remote and local streams
  let localVideoElement: HTMLVideoElement | undefined = $state();
  let remoteVideoElement: HTMLVideoElement | undefined = $state();
  // to store the devices from the stream
  let audioInputDevices: MediaDeviceInfo[] = $state([]);
  let audioOutputDevices: MediaDeviceInfo[] = $state([]);
  let videoInputDevices: MediaDeviceInfo[] = $state([]);
  // The stream. Client's stream
  let localStream: MediaStream | null = $state(null);
  let remoteStream: MediaStream | null = $state(null);
  let connected: boolean = $state(false);
  let connectionState: RTCPeerConnectionState | "NA" = $state("NA");
  // default constraints
  // for deciding the tracks and their configurations that the stream would have
  let selectedAudioInput = $state("");
  let selectedAudioOutput = $state("");
  let selectedVideoInput = $state("");

  let deviceConstraints: Record<string, MediaStreamConstraints> = $state({});
  let roomName = $state("");
  let userName = $state("");
  let peerName = $state("");
  let makingOffer = false;
  let isInitiator = false;

  // gets permissions for IO at mount time
  const getPermissions = async () => {
    console.info("getPermissions fired!");
    try {
      const initialStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      const audioCapabilities = initialStream
        .getAudioTracks()[0]
        .getCapabilities();
      const videoCapabilities = initialStream
        .getVideoTracks()[0]
        .getCapabilities();

      if (audioCapabilities.deviceId) {
        deviceConstraints[audioCapabilities.deviceId] = {
          audio: { deviceId: { exact: audioCapabilities.deviceId } },
        };
      }

      if (videoCapabilities.deviceId) {
        const { height, width } = videoCapabilities;
        deviceConstraints[videoCapabilities.deviceId] = {
          video: {
            deviceId: { exact: videoCapabilities.deviceId },
            width: width?.max,
            height: height?.max,
          },
        };
      }

      // done reading capabilities, release the probe stream
      initialStream.getTracks().forEach((track) => track.stop());

      const audioStream = await navigator.mediaDevices.getUserMedia(
        deviceConstraints[audioCapabilities.deviceId],
      );
      const videoStream = await navigator.mediaDevices.getUserMedia(
        deviceConstraints[videoCapabilities.deviceId],
      );

      selectedAudioInput = audioCapabilities.deviceId
        ? audioCapabilities.deviceId
        : "";
      selectedVideoInput = videoCapabilities.deviceId
        ? videoCapabilities.deviceId
        : "";
      localStream = new MediaStream([
        ...audioStream.getAudioTracks(),
        ...videoStream.getVideoTracks(),
      ]);

      if (!localVideoElement) {
        console.error("localVideo is undefined.");
        return;
      }

      localVideoElement.srcObject = localStream;
      localVideoPlaying = true;
      console.log("Stream is created");
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
    selectedAudioOutput = audioOutputDevices[0]?.deviceId ?? "";

    videoInputDevices = devices.filter((device) => device.kind == "videoinput");
  };
  async function toClipboard() {
    await navigator.clipboard.writeText(roomName);
  }

  const closeConnection = () => {
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.onnegotiationneeded = null;

      remoteStream?.getTracks().forEach((track) => track.stop());
      remoteStream = null;
      if (remoteVideoElement) remoteVideoElement.srcObject = null;
      remoteAudioPlaying = false;
      remoteVideoPlaying = false;
      connected = false;
      makingOffer = false;
      peerName = "";

      pc.close();
      pc = null;
    }
  };
  const endCall = () => {
    closeConnection();
    roomName = "";
    userName = "";
    connectionState = "NA";
    socket.emit("leave");
    if (dialogRef) dialogRef.showModal();
  };

  // Callback Props
  const onFormSubmit = (roomname: string, username: string) => {
    roomName = roomname;
    userName = username;
  };
  const onDialogRef = (dr: HTMLDialogElement) => {
    dialogRef = dr;
  };
  const onVideoRef = (rv: HTMLVideoElement, lv: HTMLVideoElement) => {
    remoteVideoElement = rv;
    localVideoElement = lv;
  };

  // WebRTC code
  const socket = io(import.meta.env.VITE_SIGNALING_SERVER_URL, {
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
  let pc: RTCPeerConnection | null = $state(new RTCPeerConnection(rtcConfig));

  let pendingCandidates: RTCIceCandidateInit[] = [];
  let remoteDescSet = false;
  let ignoreOffer = false;
  const polite = $derived(!isInitiator); // one peer must be polite, the other impolite

  // functions
  const joinRoom = () => {
    socket.emit("join", roomName, userName);
  };

  const startCall = async () => {
    if (!pc) {
      initPeerConnection();
    }
    console.info("startCall fired!");
    if (localStream)
      localStream.getTracks().forEach((track) => {
        if (localStream && pc) pc.addTrack(track, localStream);
      });
    else {
      console.error("stream is undefined");
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", {
      room: roomName,
      username: userName,
      data: { type: "offer", offer },
    });
  };

  const initPeerConnection = () => {
    pc = new RTCPeerConnection(rtcConfig);
    pc.onicecandidate = handleICECandidateEvent;
    pc.ontrack = handleTrackEvent;
    pc.onconnectionstatechange = handleConnectionStateChangeEvent;
    pc.onnegotiationneeded = handleNegotiationNeededEvent;
  };

  // event handlers
  const handleRemoveTrackEvent = (e: MediaStreamTrackEvent) => {
    console.info("handleRemoveTrackEvent fired!");
    console.group("Track Removed");
    console.log(`Track kind: ${e.track.kind}`);
    console.log(`Track id: ${e.track.id}`);
    console.groupEnd();
    console.log(e.track);
    if (e.track.kind === "video") {
      remoteVideoPlaying = false;
      if (remoteVideoElement) remoteVideoElement.srcObject = remoteStream;
    }
    if (e.track.kind === "audio") remoteAudioPlaying = false;
  };
  const handleICECandidateEvent = (e: RTCPeerConnectionIceEvent) => {
    if (e.candidate) {
      socket.emit("signal", {
        room: roomName,
        username: userName,
        data: { type: "ice-candidate", candidate: e.candidate.toJSON() },
      });
    }
  };
  const handleTrackEvent = (trackEv: RTCTrackEvent) => {
    console.info("handleTrackEvent fired!");

    console.group("Track Added");
    console.log(`Track kind: ${trackEv.track.kind}`);
    console.log(`Track id: ${trackEv.track.id}`);
    console.groupEnd();
    if (!remoteStream) remoteStream = trackEv.streams[0];
    if (trackEv.track.kind == "video") remoteVideoPlaying = true;
    if (trackEv.track.kind == "audio") remoteAudioPlaying = true;

    if (remoteVideoElement && !remoteVideoElement.srcObject)
      remoteVideoElement.srcObject = remoteStream;

    remoteStream.onremovetrack = handleRemoveTrackEvent;
  };
  const handleNegotiationNeededEvent = async () => {
    try {
      makingOffer = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const message: SignalMessage = { type: "offer", offer };
      socket.emit("signal", {
        room: roomName,
        username: userName,
        data: message,
      });
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
      case "failed":
        // pc.setConfiguration(rtcConfig);
        pc.restartIce();
        break;
      case "disconnected":
      // connected = false;
      // if (remoteVideoElement) remoteVideoElement.srcObject = null;
      // break;
      case "closed":
        closeConnection();
        break;
      case "connecting":
        break;
      case "new":
        break;
      default:
        break;
    }
  };

  // svelte-ignore state_referenced_locally
  if (pc) {
    Object.assign(pc, {
      // this is the first time I've seen this. #AI gen
      onicecandidate: handleICECandidateEvent,
      ontrack: handleTrackEvent,
      onconnectionstatechange: handleConnectionStateChangeEvent,
      onnegotiationneeded: handleNegotiationNeededEvent,
    });
  }
  //socket
  socket.on("joined", async (roomname, { isInitiator }) => {
    roomName = roomname;
    isInitiator = isInitiator;
    if (isInitiator) {
    } else {
      startCall();
    }
  });
  socket.on("signal", async (peername: string, msg: SignalMessage) => {
    if (pc === null) {
      initPeerConnection();
    }
    if (msg.type === "offer") {
      const offerCollision = makingOffer || pc.signalingState !== "stable";

      ignoreOffer = !polite && offerCollision;
      if (ignoreOffer) return;

      if (offerCollision) {
        await pc.setLocalDescription({ type: "rollback" });
      }

      if (!localStream) {
        console.error("stream is undefined");
        return;
      }

      localStream.getTracks().forEach((track) => {
        const alreadySent = pc.getSenders().some((s) => s.track === track);
        if (!alreadySent) {
          if (!localStream) {
            console.error("stream is undefined");
            return;
          }
          pc.addTrack(track, localStream);
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
        username: userName,
        data: { type: "answer", answer: pc.localDescription },
      });
      peerName = peername;
    } else if (msg.type === "answer") {
      await pc.setRemoteDescription(msg.answer);
      remoteDescSet = true;
      for (const c of pendingCandidates) await pc.addIceCandidate(c);
      pendingCandidates = [];

      peerName = peername;
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
  let dialogRef: HTMLDialogElement | undefined = $state();

  onMount(async () => {
    if (dialogRef) dialogRef.showModal();
    await getPermissions();
    await getDevices();
  });
</script>

<Dialog {joinRoom} {onFormSubmit} {onDialogRef} />
<main>
  <header class="user-info">
    <span>
      <span> Room </span>
      <button onclick={toClipboard}>{roomName ? roomName : "NA"}</button></span
    >
    <span> <span>State</span> <span>{connectionState}</span></span>
    <span><span>Username</span> <span>{userName ? userName : "NA"}</span></span>
  </header>
  <Calls
    {onVideoRef}
    {localVideoPlaying}
    {localAudioPlaying}
    {remoteVideoPlaying}
    {remoteAudioPlaying}
    {connected}
    {peerName}
  />
  <MediaControl
    bind:localStream
    bind:localVideoPlaying
    bind:localAudioPlaying
    {audioInputDevices}
    {audioOutputDevices}
    {videoInputDevices}
    {localVideoElement}
    {remoteVideoElement}
    {selectedAudioInput}
    {selectedAudioOutput}
    {selectedVideoInput}
    {pc}
    {deviceConstraints}
    {endCall}
  />
</main>

<style>
  main {
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
    gap: 2.5rem;
    span {
      button {
        position: relative;
        transition: all 0.25s;
        --btn-bg: transparent;
        --btn-clr: var(--accent);
        --icon-clr: var(--btn-clr);
        text-decoration: underline;

        &::after {
          position: absolute;
          top: 0.1rem;
          right: -1.5rem;
          margin-inline: 0.25rem;
          display: block;
          content: "";
          width: 16px;
          height: 16px;
          background-color: var(--icon-clr);
          mask: url(./assets/copy.svg) no-repeat center / contain;
          -webkit-mask: url(./assets/copy.svg) no-repeat center / contain;
        }
        &:hover {
          --icon-clr: hsl(from var(--accent) h s calc(l + 10));
        }
      }
      gap: 0.75rem;
      span:last-child {
        color: var(--accent);
        text-decoration: underline;
      }
    }

    @media (max-width: 650px) {
      /* color: red; */
      & span {
        /* display: flex; */
        display: grid;
        place-items: center;
      }
    }
  }
</style>
