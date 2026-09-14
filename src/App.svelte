<script lang="ts">
  import "./app.css";
  import { onMount } from "svelte";
  import MediaControl from "./components/MediaControl.svelte";
  import Calls from "./components/Calls.svelte";
  import Dialog from "./components/Dialog.svelte";

  // State
  let outgoingVideoPlaying = $state(true);
  let incomingVideoPlaying = $state(false);
  // video elements for incoming and outgoing streams
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
  let ICEGatheringState: RTCIceGathererState | "NA" = $state("NA");
  let RTCSignalingState: RTCSignalingState | "NA" = $state("NA");
  // default constraints
  // for deciding the tracks and their configurations that the stream would have
  let selectedAudioInput = $state("");
  let selectedVideoInput = $state("");

  let deviceConstraints: Record<string, MediaStreamConstraints> = $state({});
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
      outgoingStream = new MediaStream([
        ...audioStream.getAudioTracks(),
        ...videoStream.getVideoTracks(),
      ]);

      if (!outgoingVideo) {
        console.error("outgoingVideo is undefined.");
        return;
      }

      outgoingVideo.srcObject = outgoingStream;
      outgoingVideoPlaying = true;
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
    videoInputDevices = devices.filter((device) => device.kind == "videoinput");
  };

  // Callback Props
  const onFormSubmit = (roomname:string, username:string) => {
    roomName = roomname;
    userName = username;
  };
  const onDialogRef = (dr:HTMLDialogElement) => {
    dialogRef = dr;
  };
  const onVideoRef = (iv:HTMLVideoElement, ov:HTMLVideoElement) => {
    incomingVideo = iv;
    outgoingVideo = ov;
  };

  // WebRTC code
  let roomName = $state("");
  let userName = $state("");
  import { io } from "socket.io-client";
  let makingOffer = false;
  let isInitiator = false;

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
      case "disconnected":
        connected = false;
        if (incomingVideo) incomingVideo.srcObject = null;
        break;
      case "failed":
        // pc.setConfiguration(rtcConfig);
        pc.restartIce();
        break;
      case "closed":
        break;
      case "connecting":
        break;
      case "new":
        break;
      default:
        break;
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
  let dialogRef: HTMLDialogElement|undefined = $state();

  onMount(async () => {
    if(dialogRef) dialogRef.showModal();
    await getPermissions();
    await getDevices();
  });
</script>

<Dialog {joinRoom} {onFormSubmit} {onDialogRef} />
<main>
  <div class="user-info">
    <span>Room No: <span>{roomName}</span></span>
    <span> State: <span>{connectionState}</span></span>
    <span>Username: <span>{userName}</span></span>
  </div>
  <Calls
    {onVideoRef}
    {outgoingVideoPlaying}
    {incomingVideoPlaying}
    {connected}
  />
  <MediaControl
    bind:outgoingStream
    bind:outgoingVideoPlaying
    {audioInputDevices}
    {audioOutputDevices}
    {videoInputDevices}
    {outgoingVideo}
    {incomingVideo}
    {selectedAudioInput}
    {selectedVideoInput}
    {pc}
    {deviceConstraints}
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
    span {
      padding: 0 1rem;
      span {
        text-decoration: underline;
      }
    }
  }
</style>
