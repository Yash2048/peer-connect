<script lang="ts">
  import "./app.css";
  import { onMount } from "svelte";
  import { io } from "socket.io-client";
  import MediaControl from "./components/MediaControl.svelte";
  import Calls from "./components/Calls.svelte";
  import Dialog from "./components/Dialog.svelte";
  import { WebRTCConnection, type SignalMessage } from "./lib/webrtc.svelte";

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
  let connected: boolean = $state(false);
  // for deciding the tracks and their configurations that the stream would have
  let selectedAudioInput = $state("");
  let selectedAudioOutput = $state("");
  let selectedVideoInput = $state("");

  let deviceConstraints: Record<string, MediaStreamConstraints> = $state({});
  let roomName = $state("");
  let userName = $state("");
  let peerName = $state("");

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

  const endCall = () => {
    socket.emit("leave", roomName);
    rtc.close();
    roomName = "";
    userName = "";
    if (dialogRef) dialogRef.showModal();
  };

  // Callback Props
  const onFormSubmit = (roomname: string, username: string) => {
    roomName = roomname;
    userName = username;
  };

  // socket.io
  const socket = io(import.meta.env.VITE_SIGNALING_SERVER_URL, {
    transports: ["websocket", "polling"],
    upgrade: true,
  });

  // webrtc connection
  const rtc = new WebRTCConnection({
    onSignal: (data) => {
      socket.emit("signal", { room: roomName, username: userName, data });
    },
    onRemoteTrack: (stream, kind) => {
      if (kind === "video") remoteVideoPlaying = true;
      if (kind === "audio") remoteAudioPlaying = true;
      if (remoteVideoElement && !remoteVideoElement.srcObject)
        remoteVideoElement.srcObject = stream;
    },
    onRemoteTrackRemoved: (kind, stream) => {
      if (kind === "video") {
        remoteVideoPlaying = false;
        if (remoteVideoElement) remoteVideoElement.srcObject = stream;
      }
      if (kind === "audio") remoteAudioPlaying = false;
    },
    onConnectionStateChange: () => {},
    onConnected: () => {
      connected = true;
    },
    onClosed: () => {
      remoteAudioPlaying = false;
      remoteVideoPlaying = false;
      connected = false;
      peerName = "";
      if (remoteVideoElement) remoteVideoElement.srcObject = null;
    },
  });

  const connectionState = $derived(rtc.connectionState);

  const joinRoom = () => {
    socket.emit("join", roomName, userName);
  };

  const startCall = async () => {
    console.info("startCall fired!");
    if (localStream) await rtc.startCall(localStream);
    else console.error("stream is undefined");
  };

  socket.on("joined", async (roomname, { isInitiator }) => {
    roomName = roomname;
    rtc.setInitiator(isInitiator);
    if (!isInitiator) startCall();
  });

  socket.on("signal", async (peername: string, msg: SignalMessage) => {
    await rtc.handleSignal(msg, localStream);
    peerName = peername;
  });

  let dialogRef: HTMLDialogElement | undefined = $state();

  onMount(async () => {
    if (dialogRef) dialogRef.showModal();
    await getPermissions();
    await getDevices();
  });
</script>
<Dialog {joinRoom} {onFormSubmit} bind:dialogRef />
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
    bind:localVideoElement
    bind:remoteVideoElement
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
    pc={rtc.pc}
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
        &:focus-visible {
          outline: auto;
          box-shadow: none;
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
