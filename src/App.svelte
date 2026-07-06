<script lang="ts">
  // state
  let playing = $state(false);
  let hasPerms = $state(false);
  let width = $state(1280);
  let height = $state(720);

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
