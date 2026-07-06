<script lang="ts">
  let playing = $state(false);
  let hasPerms = $state(false);
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
  // state
</script>

<main>
  <section class="options">
    <button onclick={askPermissions}>Get Permissions</button>
    <button onclick={toggleFeed} disabled={!hasPerms}
      >{playing ? "Stop" : "Show"} my video</button
    >
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
    padding: 5rem;
    justify-content: space-between;
  }
  .options,
  .feed {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  button:nth-child(1) {
    background-color: #005f3d;
    border: 0;
  }
</style>
