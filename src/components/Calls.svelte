<script lang="ts">
  import { onMount } from "svelte";
  import "../app.css";
  let {
    outgoingVideoPlaying,
    incomingVideoPlaying,
    incomingAudioPlaying,
    connected,
    peerName,
    onVideoRef,
  }: {
    outgoingVideoPlaying: boolean;
    incomingVideoPlaying: boolean;
    incomingAudioPlaying: boolean;
    connected: boolean;
    peerName: string;
    onVideoRef: (iv: HTMLVideoElement, ov: HTMLVideoElement) => void;
  } = $props();
  let iv: HTMLVideoElement | undefined = $state();
  let ov: HTMLVideoElement | undefined = $state();
  import IconMSMicOutline from "~icons/material-symbols/mic-outline";
  import IconMSMicOffOutline from "~icons/material-symbols/mic-off-outline";

  const initials = $derived(
    peerName.split(" ").length > 1
      ? peerName.split(" ")[0][0] + peerName.split(" ")[1][0]
      : peerName[0],
  );

  onMount(() => {
    if (iv && ov) onVideoRef(iv, ov);
  });
</script>

<section class="feed">
  <div
    class="outgoing-video-container video-container"
    class:minimize={connected}
  >
    <div class="overlay">
      <div class="name">
        <div class="icon">
          {#if false}
            <IconMSMicOutline height="24px" width="24px" />
          {:else}
            <IconMSMicOffOutline height="24px" width="24px" />
          {/if}
        </div>
        <span>You</span>
      </div>
      <!-- <div class="pfp"></div> -->
    </div>
    <video
      class="outgoing"
      class:play={outgoingVideoPlaying}
      class:playOff={!outgoingVideoPlaying}
      id="outgoing"
      bind:this={ov}
      autoplay
      muted
      playsinline
      tabindex="-1"
    ></video>
  </div>
  <div
    class:hidden={!connected}
    class="incoming-video-container video-container"
  >
    <div class="overlay">
      <div class="name">
        <div class="icon">
          {#if incomingAudioPlaying}
            <IconMSMicOutline height="24px" width="24px" />
          {:else}
            <IconMSMicOffOutline height="24px" width="24px" />
          {/if}
        </div>
        <span>{peerName}</span>
      </div>
      {#if !incomingVideoPlaying}
        <div class="pfp">{initials}</div>
      {/if}
    </div>
    <video
      class="incoming"
      class:play={incomingVideoPlaying}
      class:playOff={!incomingVideoPlaying}
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
    position: relative;
    border-radius: 0.75rem;
    overflow: clip;
    min-height: 0;
    min-width: 0;
    max-width: 100%;
    max-height: 100%;
    &:has(.playOff) {
      flex: 1;
    }
    &:has(.play) {
      flex: 0 0 auto;
      width: fit-content;
      height: fit-content;
    }
  }

  .incoming-video-container {
    /* outline:  1rem blue solid; */
    width: 100%;
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
    video {
      z-index: 0;
      scale: -1 1;
      border-radius: 0.75rem;
    }
  }

  .minimize {
    z-index: 1;
    position: absolute;
    bottom: 0.1rem;
    right: 0.1rem;
    video {
      width: min(16rem, 40vw);
    }
  }
  .hidden {
    display: none;
  }

  .overlay {
    z-index: 1;
    top: 0;
    width: 100%;
    height: 100%;
    position: absolute;
    &:hover {
      .name {
        max-width: 100%;
      }
    }

    & > * {
      position: absolute;
    }
  }
  .name {
    height: 2.5rem;
    display: flex;
    align-items: center;
    gap: 0.7rem;
    background-color: var(--surface);
    border: 1px s + olid var(--border);
    border-radius: 1.6rem;
    position: absolute;
    bottom: min(1rem, 5%);
    left: min(1rem, 5%);
    transition: all 1s ease;
    max-width: 2.5rem;
    overflow: hidden;

    .icon {
      color: var(--accent);
      display: flex;
      padding: 0.5rem;
      background-color: var(--bg);
      border-radius: 50%;
    }
    span {
      text-transform: capitalize;
      text-wrap: nowrap;
      transition: all 5s ease;
      padding-right: 1rem;
    }
  }

  .pfp {
    --pfp-bg: rebeccapurple;
    --pfp-clr: antiquewhite;
    width: 7rem;
    height: 7rem;
    border-radius: 50%;
    background-color: var(--pfp-bg);
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    color: var(--pfp-clr);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: xxx-large;
    text-transform: uppercase;
  }
</style>
