<script lang="ts">
  // state
  let playing = $state(false);
  let hasPerms = $state(false);
  let width = $state(1280);
  let height = $state(720);
  let recording = $state(0); // 0: not recording, 2: recording, 3: recording paused
  let mediaRecorder: MediaRecorder | null = $state(null);
  let recordedBlobs: Array<Blob> = [];

  let stream: MediaStream | null = null;
  let myVideo: HTMLMediaElement | null;
  const constraints = { video: true, audio: true };

  const askPermissions = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (stream) {
        hasPerms = true;
      }
    } catch (error) {}
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

    mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
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
</script>

<main>
  <section class="options">
    <button id="permsButton" onclick={askPermissions}>Get Permissions</button>
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
  </section>
  <section class="feed">
    <video id="incoming" autoplay></video>
    <video id="outgoing" autoplay></video>
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
</style>
