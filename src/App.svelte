<script lang="ts">
  import { onMount } from "svelte";

  // state
  let playing = $state(false);
  let hasPerms = $state(false);
  let width = $state(480);
  let height = $state(240);
  let recording = $state(0); // 0: not recording, 2: recording, 3: recording paused
  let screenSharing = $state(false);
  let audioInputDevices: MediaDeviceInfo[] = $state([]);
  let audioOutputDevices: MediaDeviceInfo[] = $state([]);
  let videoInputDevices: MediaDeviceInfo[] = $state([]);

  let mediaRecorder: MediaRecorder | null = $state(null);
  let recordedBlobs: Array<Blob> = [];
  let stream: MediaStream | null = $state(null);
  let screenShareStream: MediaStream | null = $state(null);
  let myVideo: HTMLMediaElement | null;
  const constraints = { video: true, audio: true };

  const getPermissions = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (stream) {
        hasPerms = true;
      }
    } catch (error) {}
  };
  const getDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    console.log(devices);
    devices.forEach((device) => {
      if (device.kind == "audioinput") audioInputDevices.push(device);
      if (device.kind == "audiooutput") audioOutputDevices.push(device);
      if (device.kind == "videoinput") videoInputDevices.push(device);
    });
  };

  const toggleFeed = () => {
    console.log("toggleFeed is working");
    myVideo = document.querySelector("#incoming");
    if (playing) {
      const tracks = stream?.getTracks();
      tracks?.forEach((track) => track.stop());
      if (myVideo) myVideo.srcObject = null;
      hasPerms = false;
    } else {
      if (myVideo) {
        myVideo.srcObject = stream;
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
  const startRecording = () => {
    console.log("started recording...");
    if (!stream) return;

    mediaRecorder = new MediaRecorder(stream, {});
    if (mediaRecorder == null) return;

    mediaRecorder.ondataavailable = (e: BlobEvent) => {
      console.log(e.data);
      recordedBlobs.push((e as BlobEvent).data);
    };

    mediaRecorder.start();
    recording = 1;
  };

  const pauseRecording = () => {
    if (recording == 1) {
      console.log("recording paused.");
      mediaRecorder?.pause();
      recording = 2;
    } else if (recording == 2) {
      console.log("recording unpaused.");
      mediaRecorder?.resume();
      recording = 1;
    }
  };

  const stopRecording = () => {
    console.log("recording stopped.");
    mediaRecorder?.stop();
    recording = 0;
  };

  const playRecording = () => {
    console.log("Playing recording.");
    const mimeType = mediaRecorder?.mimeType || "video/webm";
    const superBlob = new Blob(recordedBlobs, { type: mimeType });
    const recordedVideo: HTMLMediaElement | null =
      document.querySelector("#outgoing");
    if (recordedVideo) {
      recordedVideo.src = window.URL.createObjectURL(superBlob);
      recordedVideo.controls = true;
      recordedVideo.play();
    }
  };

  const shareScreen = async () => {
    const screenShareElement: HTMLMediaElement | null =
      document.querySelector("#screen-share");
    if (screenSharing) {
      if (screenShareElement) screenShareElement.srcObject = null;
    } else {
      try {
        screenShareStream = await navigator.mediaDevices.getDisplayMedia();
        if (screenShareStream) {
          console.log(screenShareStream);
          if (screenShareElement) {
            screenShareElement.srcObject = screenShareStream;
          }
        }
      } catch (error) {}
    }
    screenSharing = !screenSharing;
  };

  onMount(async () => {
    await getPermissions();
    await getDevices();
  });
</script>

<main>
  <section class="options">
    <button id="permsButton" onclick={getPermissions}>Get Permissions</button>
    <button onclick={toggleFeed} disabled={!hasPerms}
      >{playing ? "Stop" : "Show"} my video</button
    >
    <button disabled={!hasPerms} onclick={changeSize}>
      Change screen size</button
    >
    <div>
      <input bind:value={width} type="number" />
      <input bind:value={height} type="number" />
    </div>
    <button disabled={!hasPerms} onclick={startRecording}
      >Start Recording</button
    >
    <button disabled={!hasPerms || recording == 0} onclick={pauseRecording}
      >{recording == 2 ? "Unpause" : "Pause"} Recording</button
    >
    <button disabled={!hasPerms || recording == 0} onclick={stopRecording}
      >Stop Recording</button
    >
    <button disabled={!hasPerms} onclick={playRecording}>Play Recording</button>
    <button onclick={shareScreen}
      >{screenSharing ? "Stop Sharing" : "Share Screen"}</button
    >
    <div class="input">
      <label for="audio-input">Select Audio Input</label>
      <select name="audio-input" id="audio-input"
        ><option value="0">Select</option>
        {#each audioInputDevices as audioInputDevice}
          <option value={audioInputDevice.deviceId}
            >{audioInputDevice.label}</option
          >
        {/each}
      </select>
    </div>
    <div class="input">
      <label for="audio-output">Select Audio Output</label>
      <select name="audio-output" id="audio-output"
        ><option value="0">Select</option>
        {#each audioOutputDevices as audioOutputDevice}
          <option value={audioOutputDevice.deviceId}
            >{audioOutputDevice.label}</option
          >
        {/each}
      </select>
    </div>
    <div class="input">
      <label for="video-input">Select Video Input</label>
      <select name="video-input" id="video-input"
        ><option value="0">Select</option>
        {#each videoInputDevices as videoInputDevice}
          <option value={videoInputDevice.deviceId}
            >{videoInputDevice.label}</option
          >
        {/each}</select
      >
    </div>
  </section>
  <section class="feed">
    <video id="incoming" autoplay></video>
    <video id="outgoing" autoplay></video>
    <video id="screen-share" autoplay></video>
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
  input {
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
</style>
