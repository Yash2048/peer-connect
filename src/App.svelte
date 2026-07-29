<script lang="ts">
  import { onMount } from "svelte";

  // state
  let playing = $state(false);
  let hasPerms = $state(false);
  let width = $state(480);
  let height = $state(240);
  let recording = $state(0); // 0: not recording, 1: recording, 2: recording paused
  let screenSharing = $state(false);
  let audioInputDevices: MediaDeviceInfo[] = $state([]);
  let audioOutputDevices: MediaDeviceInfo[] = $state([]);
  let videoInputDevices: MediaDeviceInfo[] = $state([]);
  let outgoingVideo: HTMLVideoElement | undefined = $state();
  let incomingVideo: HTMLVideoElement | undefined = $state();
  let screenShareVideo: HTMLVideoElement | undefined = $state();

  let stream: MediaStream | null;
  let mediaRecorder: MediaRecorder | null;
  let screenShareStream: MediaStream | null;
  let recordedBlobs: Array<Blob> = [];
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

  const toggleFeed = () => {
    console.log("toggleFeed is working");
    if (playing) {
      const tracks = stream?.getTracks();
      tracks?.forEach((track) => track.stop());
      if (outgoingVideo) outgoingVideo.srcObject = null;
      hasPerms = false;
    } else {
      if (outgoingVideo) {
        outgoingVideo.srcObject = stream;
      }
    }
    playing = !playing;
  };
  const changeSize = () => {
    if (!stream) return;
    const tracks = stream.getVideoTracks();
    console.table(tracks);
    tracks.forEach((track) => {
      const capabilities = track.getCapabilities();
      if (capabilities.height && capabilities.height.max)
        height =
          height <= capabilities.height?.max
            ? height
            : capabilities.height?.max;

      if (capabilities.width && capabilities.width.max)
        width =
          width <= capabilities.width?.max ? width : capabilities.width?.max;
      const videoConstraints = {
        height: height,
        width: width,
      };
      track.applyConstraints(videoConstraints);
    });
  };

  // WebRTC code
  let roomName = $state("");
  let userName = $state("");
  import { io } from "socket.io-client";

  const socket = io("https://rkcjc80k-8080.inc1.devtunnels.ms/", {
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

  // Handle incoming signals
  socket.on("signal", async (msg: SignalMessage) => {
    if (msg.type === "offer") {
      if (stream)
        stream.getTracks().forEach((track) => {
          if (stream) pc.addTrack(track, stream);
        });
      await pc.setRemoteDescription(msg.offer);
      remoteDescSet = true;
      for (const c of pendingCandidates) await pc.addIceCandidate(c);
      pendingCandidates = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("signal", {
        room: roomName,
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
  <form method="dialog">
    <fieldset>
      <label>
        Room Name
        <input
          type="text"
          name="room-name"
          bind:value={roomName}
          placeholder="Meeting"
        />
      </label>
      <label>
        User Name
        <input
          type="text"
          name="user-name"
          bind:value={userName}
          placeholder="My room"
        />
      </label>
    </fieldset>
    <div role="group">
      <button type="submit" command="close" commandfor="call-info"
        >Start Call
      </button>
      <button type="submit" command="close" commandfor="call-info"
        >Join Call
      </button>
    </div>
  </form>
</dialog>

<div class="user-info">
  <span>Room No: <span>{roomName}</span></span>
  <span>Username: <span>{userName}</span></span>
</div>
<main>
  <section class="options">
    <button id="permsButton" onclick={getPermissions}>Get Permissions</button>
    <button onclick={toggleFeed} disabled={!hasPerms} aria-pressed={playing}
      >{playing ? "Stop" : "Show"} my video</button
    >
    <div class="screen-size">
      <button disabled={!hasPerms} onclick={changeSize}>
        Change screen size</button
      >
      <div>
        <input bind:value={width} type="number" />
        <input bind:value={height} type="number" />
      </div>
      <button onclick={startCall}>Start Call</button>
    </div>
    <!-- <button disabled={!hasPerms} onclick={startRecording}
      >Start Recording</button
    >
    <button disabled={!hasPerms || recording == 0} onclick={pauseRecording}
      >{recording == 2 ? "Unpause" : "Pause"} Recording</button
    >
    <button disabled={!hasPerms || recording == 0} onclick={stopRecording}
      >Stop Recording</button
    >
    <button disabled={!hasPerms} onclick={playRecording}>Play Recording</button>
    <button onclick={shareScreen} aria-pressed={screenSharing}
      >{screenSharing ? "Stop Sharing" : "Share Screen"}</button
    > -->
    <!-- <div class="input">
      <label for="audio-input">Select Audio Input</label>
      <select onchange={changeAudioInput} name="audio-input" id="audio-input"
        ><option value="">Select</option>
        {#each audioInputDevices as audioInputDevice}
          <option value={audioInputDevice.deviceId}
            >{audioInputDevice.label}</option
          >
        {/each}
      </select>
    </div>
    <div class="input">
      <label for="audio-output">Select Audio Output</label>
      <select onchange={changeAudioOutput} name="audio-output" id="audio-output"
        ><option value="">Select</option>
        {#each audioOutputDevices as audioOutputDevice}
          <option value={audioOutputDevice.deviceId}
            >{audioOutputDevice.label}</option
          >
        {/each}
      </select>
    </div>
    <div class="input">
      <label for="video-input">Select Video Input</label>
      <select onchange={changeVideoInput} name="video-input" id="video-input"
        ><option value="">Select</option>
        {#each videoInputDevices as videoInputDevice}
          <option value={videoInputDevice.deviceId}
            >{videoInputDevice.label}</option
          >
        {/each}</select
      >
    </div> -->
  </section>
  <section class="feed">
    <div>
      <h2>Incoming Feed</h2>
      <video id="incoming" bind:this={incomingVideo} autoplay playsinline
      ></video>
    </div>
    <div>
      <h2>Outgoing Feed</h2>
      <video id="outgoing" bind:this={outgoingVideo} autoplay muted playsinline
      ></video>
    </div>
    <div>
      <h2>Extra</h2>
      <video id="screen-share" bind:this={screenShareVideo} autoplay playsinline
      ></video>
    </div>
  </section>
</main>

<style>
  video {
    background-color: cornflowerblue;
  }
  main {
    display: flex;
    padding: 4rem 2rem;
    justify-content: space-between;
  }
  .options,
  .feed {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  #permsButton {
    background-color: #005f3d;
    border: 0;
  }
  main input {
    width: 8rem;
  }

  #outgoing,
  #incoming,
  #screen-share {
    max-width: 480px;
  }

  select {
    max-width: 16.5rem;
  }
  .screen-size {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  div[role="group"] input:hover {
    border: darkgrey 1px solid;
  }
  .user-info {
    display: flex;
    justify-content: space-between;
    span {
      padding: 0.5rem 1rem;
      span{
        text-decoration: underline;
      }
    }
  }
</style>
