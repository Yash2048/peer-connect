<script lang="ts">
  import { onMount } from "svelte";
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

  let incomingRatio = $state("16 / 9");
  let outgoingRatio = $state("16 / 9");

  let isIncomingHorizontal = $state(true);
  let isOutgoingHorizontal = $state(true);

  const handleIncomingResize = () => {
    const { videoHeight, videoWidth } = incomingVideo;
    if (videoHeight && videoWidth)
      isIncomingHorizontal = videoWidth / videoHeight > 1;
    incomingRatio = `${videoWidth} / ${videoHeight}`;
  };
  const handleOutgoingResize = () => {
    const { videoHeight, videoWidth } = outgoingVideo;
    if (videoHeight && videoWidth)
      isOutgoingHorizontal = videoWidth / videoHeight > 1;
    outgoingRatio = `${videoWidth} / ${videoHeight}`;
  };
</script>

<section class="feed">
  <div
    style="--outgoing-ratio: {outgoingRatio}"
    class="{connected ? 'minimize' : ''} {isOutgoingHorizontal
      ? 'horizontal'
      : 'vertical'} outgoing-video-container"
  >
    <video
      class="{outgoingVideoPlaying ? 'play' : 'play-off'} outgoing"
      id="outgoing"
      bind:this={outgoingVideo}
      onresize={handleIncomingResize}
      onloadeddata={handleOutgoingResize}
      autoplay
      muted
      playsinline
    ></video>
  </div>
  <div
    style="--incoming-ratio: {incomingRatio}"
    class="incoming-video-container {connected
      ? ''
      : 'hidden'} {isIncomingHorizontal
      ? 'horizontal'
      : 'vertical'}{isIncomingHorizontal ? 'horizontal' : 'vertical'}"
  >
    <video
      class="{incomingVideoPlaying ? 'play' : 'play-off'} incoming"
      id="incoming"
      bind:this={incomingVideo}
      onresize={handleOutgoingResize}
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
  }

  .minimize {
    position: absolute;
    bottom: 1rem;
    right: 0;
    width: 12rem;
    border-radius: 0.5rem;
  }

  .incoming-video-container:has(.play) {
    min-width: 50%;
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
  }

  .incoming-video-container:has(.play-off) {
    /* width: 90%; */
  }

  .outgoing-video-container:not(.minimize):has(.play) {
    min-width: 50%;
    max-width: 100%;
    max-height: 100%;
  }

  .outgoing-video-container:not(.minimize):has(.play-off) {
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
  .vertical:not(.minimize) {
    height: 100%;
  }
  .horizontal:not(.minimize) {
    height: 100%;
    /* border:1rem red solid */
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
