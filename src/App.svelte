<script lang="ts">
  import "./app.css";
  import { onMount } from "svelte";
  import { io } from "socket.io-client";
  import MediaControl from "./components/MediaControl.svelte";
  import Calls from "./components/Calls.svelte";
  import Dialog from "./components/Dialog.svelte";
  import { WebRTCConnection, type SignalMessage } from "./lib/webrtc.svelte";
  import AlertsOverlay from "./components/AlertsOverlay.svelte";
  import Chat from "./components/Chat.svelte";
  import { addMessage } from "./lib/chat.svelte";
  import { media } from "./lib/localMedia.svelte";

  // State
  let remoteVideoPlaying = $state(false);
  let remoteAudioPlaying = $state(false);
  // video elements for remote and local streams
  let localVideoElement: HTMLVideoElement | null = $state(null);
  let remoteVideoElement: HTMLVideoElement | undefined = $state();
  // The stream. Client's stream
  let connected: boolean = $state(false);
  // for deciding the tracks and their configurations that the stream would have
  let deviceConstraints: Record<string, MediaStreamConstraints> = $state({});
  let roomName = $state("");
  let userName = $state("");
  let peerName = $state("");
  let main: HTMLElement;
  let chatOpen = $state(false);

  const toggleChat = () => {
    chatOpen = !chatOpen;
  };
  const sendMessage = (msg: string) => {
    rtc.sendMessage(msg);
    addMessage(msg, new Date(), false);
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
    if (media.localStream) await rtc.startCall(media.localStream);
    else console.error("stream is undefined");
  };

  socket.on("joined", async (roomname, { isInitiator }) => {
    roomName = roomname;
    rtc.setInitiator(isInitiator);
    if (!isInitiator) startCall();
  });

  socket.on("signal", async (peername: string, msg: SignalMessage) => {
    await rtc.handleSignal(msg, media.localStream);
    peerName = peername;
  });

  let dialogRef: HTMLDialogElement | undefined = $state();

  onMount(async () => {
    if (dialogRef) dialogRef.showModal();
    media.localVideoElement = localVideoElement;
    await media.getStream();
    // await getPermissions();
    // await getDevices();
  });
</script>

<AlertsOverlay />
<Dialog {joinRoom} {onFormSubmit} bind:dialogRef />
<main bind:this={main}>
  <header class="user-info">
    <span>
      <span> Room </span>
      <button onclick={toClipboard}>{roomName ? roomName : "NA"}</button></span
    >
    <span> <span>State</span> <span>{connectionState}</span></span>
    <span><span>Username</span> <span>{userName ? userName : "NA"}</span></span>
  </header>
  <div class="center">
    <Calls
      bind:localVideoElement
      bind:remoteVideoElement
      {remoteVideoPlaying}
      {remoteAudioPlaying}
      {connected}
      {peerName}
      {main}
    />
    <Chat {chatOpen} {sendMessage} />
  </div>

  <MediaControl
    {localVideoElement}
    {remoteVideoElement}
    {rtc}
    {endCall}
    {toggleChat}
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
    overflow: clip;
  }
  .center {
    position: relative;
    display: flex;
    flex-grow: 1;
    margin: auto;
    justify-content: center;
    width: 100%;
    min-width: 0;
    min-height: 0;
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
