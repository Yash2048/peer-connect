<script lang="ts">
  import { onMount } from "svelte";
  import "../app.css";
  let {
    outgoingVideoPlaying,
    incomingVideoPlaying,
    connected,
    onVideoRef,
  }: {
    outgoingVideoPlaying: boolean;
    incomingVideoPlaying: boolean;
    connected: boolean;
    onVideoRef: (iv: HTMLVideoElement, ov: HTMLVideoElement) => void;
  } = $props();
  let iv: HTMLVideoElement | undefined = $state();

  let ov: HTMLVideoElement | undefined = $state();
  onMount(() => {
    if (iv && ov) onVideoRef(iv, ov);
  });
</script>

<section class="feed">
  <div
    class="{connected
      ? 'minimize'
      : ''} outgoing-video-container video-container"
  >
    <video
      class="{outgoingVideoPlaying ? 'play' : 'play-off'} outgoing"
      id="outgoing"
      bind:this={ov}
      autoplay
      muted
      playsinline
      tabindex="-1"
    ></video>
  </div>
  <div
    class="incoming-video-container video-container {connected ? '' : 'hidden'}"
  >
    <video
      class="{incomingVideoPlaying ? 'play' : 'play-off'}  incoming"
      id="incoming"
      bind:this={iv}
      autoplay
      playsinline
      tabindex="-1"
    ></video>
  </div>
</section>

<style>
  .feed {
    flex-direction: column;
    flex-grow: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 0;
    min-width: 0;
    position: relative;
    /* border: 1px solid saddlebrown; */
    &:has(video.play) {
      align-items: center;
    }
  }

  .video-container {
    border-radius: 0.75rem;
    overflow: clip;
    min-height: 0;
    min-width: 0;
    max-width: 100%;
    max-height: 100%;
    &:has(.play-off) {
      flex: 1;
    }
    &:has(.play) {
      flex: 0 0 auto;
      width: fit-content;
      height: fit-content;
    }
  }
  video {
    max-width: 100%;
    max-height: 100%;
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
    video {
      width: min(16rem,40vw);
    }
  }
  .hidden {
    display: none;
  }
</style>
