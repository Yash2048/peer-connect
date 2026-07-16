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
  let incomingVideo: HTMLVideoElement | undefined = $state();
  let outgoingVideo: HTMLVideoElement | undefined = $state();
  let screenShareVideo: HTMLVideoElement | undefined = $state();

  let stream: MediaStream | null;
  let mediaRecorder: MediaRecorder | null;
  let screenShareStream: MediaStream | null;
  let recordedBlobs: Array<Blob> = [];
  const constraints: MediaStreamConstraints = { video: true, audio: true };

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
    audioInputDevices = devices.filter((device) => device.kind == "audioinput");
    audioOutputDevices = devices.filter(
      (device) => device.kind == "audiooutput",
    );
    videoInputDevices = devices.filter((device) => device.kind == "videoinput");
  };

  const toggleFeed = () => {
    console.log("toggleFeed is working");
    if (playing) {
      const tracks = stream?.getTracks();
      tracks?.forEach((track) => track.stop());
      if (incomingVideo) incomingVideo.srcObject = null;
      hasPerms = false;
    } else {
      if (incomingVideo) {
        incomingVideo.srcObject = stream;
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
    if (outgoingVideo) {
      outgoingVideo.src = window.URL.createObjectURL(superBlob);
      outgoingVideo.controls = true;
      outgoingVideo.play();
    }
  };

  const shareScreen = async () => {
    if (screenSharing) {
      if (screenShareVideo) screenShareVideo.srcObject = null;
    } else {
      try {
        screenShareStream = await navigator.mediaDevices.getDisplayMedia();
        if (screenShareStream) {
          console.log(screenShareStream);
          if (screenShareVideo) {
            screenShareVideo.srcObject = screenShareStream;
          }
        }
      } catch (error) {}
    }
    screenSharing = !screenSharing;
  };

  const changeAudioInput = async (e: Event) => {
    const deviceId = (e.target as HTMLSelectElement).value;
    const newConstraints = {
      audio: { deviceId: { exact: deviceId } },
      video: true,
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia(newConstraints);
      console.log(stream);
      if (incomingVideo && stream) incomingVideo.srcObject = stream;
    } catch (error) {
      console.error(error);
    }
  };
  const changeAudioOutput = async (e: Event) => {
    try {
      if (incomingVideo && stream)
        await incomingVideo.setSinkId((e.target as HTMLSelectElement).value);
    } catch (error) {
      console.error(error);
    }
  };
  const changeVideoInput = async (e: Event) => {
    const deviceId = (e.target as HTMLSelectElement).value;
    const newConstraints = {
      video: { deviceId: { exact: deviceId } },
      audio: true,
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia(newConstraints);
      console.log(stream);
      if (incomingVideo && stream) incomingVideo.srcObject = stream;
    } catch (error) {
      console.error(error);
    }
  };

  onMount(async () => {
    await getPermissions();
    await getDevices();
  });
</script>

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
    <button onclick={shareScreen} aria-pressed={screenSharing}
      >{screenSharing ? "Stop Sharing" : "Share Screen"}</button
    >
    <div class="input">
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
    </div>
  </section>
  <section class="feed">
    <div>
      <h2>Incoming Feed</h2>
      <video id="incoming" bind:this={incomingVideo} autoplay playsinline
      ></video>
    </div>
    <div>
      <h2>Outgoing Feed</h2>
      <video id="outgoing" bind:this={outgoingVideo} autoplay playsinline
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
  .screen-size{
    display: flex;
    flex-direction: column;
    gap:1rem
  }
</style>
