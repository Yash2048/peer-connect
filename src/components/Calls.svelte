<script lang="ts">
  import "../app.css";
  let {
    incomingVideo = $bindable(),
    outgoingVideo = $bindable(),
    outgoingVideoPlaying,
    incomingVideoPlaying,
    connected,
  }: {
    incomingVideo: HTMLVideoElement;
    outgoingVideo: HTMLVideoElement;
    outgoingVideoPlaying: boolean;
    incomingVideoPlaying: boolean;
    connected: boolean;
  } = $props();
</script>

<section class="feed">
  <div class="{connected ? 'minimize' : ''} outgoing-video-container">
    <video
      class="{outgoingVideoPlaying ? 'play' : 'play-off'} outgoing"
      id="outgoing"
      bind:this={outgoingVideo}
      autoplay
      muted
      playsinline
    ></video>
  </div>
  <div class="incoming-video-container">
    <video
      class="{incomingVideoPlaying ? 'play' : 'play-off'} {connected
        ? ''
        : 'hidden'} incoming"
      id="incoming"
      bind:this={incomingVideo}
      autoplay
      playsinline
    ></video>
  </div>
</section>

<style>
  .feed {
    flex-grow: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 0;
    container-type: size;
    position: relative;
    /* border: 1px solid saddlebrown; */
  }

  .incoming-video-container {
    background-color: antiquewhite;
  }

  .outgoing-video-container {
    background-color: var(--muted);
    transform: scaleX(-1);
  }

  .minimize {
    position: absolute;
    bottom: 0.1rem;
    right: 0.1rem;
    width: 12rem;
    /* outline: 1px gainsboro solid; */
    /* background-color: black; */
  }

  .outgoing-video-container:not(.minimize):has(.play) {
    min-width: 50%;
    max-width: 100%;
    max-height: 100%;
  }

  .outgoing-video-container:not(.minimize):has(.play-off) {
    min-width: 100%;
  }

  .incoming-video-container:not(.minimize):has(.play) {
    min-width: 50%;
    max-width: 100%;
    max-height: 100%;
  }

  .incoming-video-container:not(.minimize):has(.play-off) {
    min-width: 100%;
  }

  .incoming-video-container,
  .outgoing-video-container {
    border-radius: 0.6rem;
    display: flex;
    overflow: hidden;
    max-width: 100%;
    max-height: 100%;
  }
  .hidden {
    display: none;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
