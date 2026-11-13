<script lang="ts">
  let {
    remoteVideoPlaying,
    remoteAudioPlaying,
    connected,
    peerName,
    localVideoElement: lv = $bindable(),
    remoteVideoElement: rv = $bindable(),
    main,
  }: {
    remoteVideoPlaying: boolean;
    remoteAudioPlaying: boolean;
    connected: boolean;
    peerName: string;
    localVideoElement: HTMLVideoElement | null;
    remoteVideoElement: HTMLVideoElement | undefined;
    main: HTMLElement;
  } = $props();
  import IconMSMicOutline from "~icons/material-symbols/mic-outline";
  import IconMSMicOffOutline from "~icons/material-symbols/mic-off-outline";
  import { draggable } from "../lib/draggable";
    import { media } from "../lib/localMedia.svelte";

  const initials = $derived(
    peerName.split(" ").length > 1
      ? peerName.split(" ")[0][0] + peerName.split(" ")[1][0]
      : peerName[0],
  );
</script>

<section class="feed">
  <div
    class={["local-video-container", "video-container", "right", "bottom"]}
    class:minimize={connected}
    use:draggable={{ bounds: main, enabled: connected }}
  >
    <div class="overlay">
      <div class="name">
        <div class="icon">
          {#if media.localAudioPlaying}
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
      class="local"
      class:play={media.localVideoPlaying}
      class:playOff={!media.localVideoPlaying}
      id="local"
      bind:this={lv}
      autoplay
      muted
      playsinline
      tabindex="-1"
    ></video>
  </div>
  <div
    class:hidden={!connected}
    class={["remote-video-container", "video-container"]}
  >
    <div class="overlay">
      <div class="name">
        <div class="icon">
          {#if remoteAudioPlaying}
            <IconMSMicOutline height="24px" width="24px" />
          {:else}
            <IconMSMicOffOutline height="24px" width="24px" />
          {/if}
        </div>
        <span>{peerName}</span>
      </div>
      {#if !remoteVideoPlaying}
        <div class="pfp">{initials}</div>
      {/if}
    </div>
    <video
      class="remote"
      class:play={remoteVideoPlaying}
      class:playOff={!remoteVideoPlaying}
      id="remote"
      bind:this={rv}
      autoplay
      playsinline
      tabindex="-1"
    ></video>
  </div>
</section>

<style>
  .feed {
    position: relative;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    justify-content: center;
    width: 100%;
    min-width: 0;
    min-height: 0;

    &:has(video.play) {
      align-items: center;
    }
  }

  .video-container {
    position: relative;
    min-width: 0;
    min-height: 0;
    max-width: 100%;
    max-height: 100%;
    border-radius: 0.75rem;
    overflow: clip;

    &:has(.playOff) {
      flex: 1;
    }

    &:has(.play) {
      flex: 0 0 auto;
      width: fit-content;
      height: fit-content;
    }
  }

  .remote-video-container {
    width: 100%;
    background-color: antiquewhite;
  }

  .local-video-container {
    background-color: var(--muted);

    video {
      scale: -1 1;
      border-radius: 0.75rem;
    }
  }

  video {
    min-width: 0;
    min-height: 0;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .minimize {
    position: absolute;
    /* right: 0.1rem; */
    /* bottom: 0.1rem; */
    z-index: 10;
    &:global(.left) {
      left: 5px;
    }
    &:global(.right) {
      right: 5px;
    }
    &:global(.top) {
      top: 5px;
    }
    &:global(.bottom) {
      bottom: 5px;
    }
    video {
      width: min(16rem, 40vw);
    }
  }

  .hidden {
    display: none;
  }

  .overlay {
    position: absolute;
    top: 0;
    z-index: 1;
    width: 100%;
    height: 100%;

    & > * {
      position: absolute;
    }

    &:hover .name {
      max-width: 100%;
    }
  }

  .name {
    bottom: min(1rem, 5%);
    left: min(1rem, 5%);
    display: flex;
    align-items: center;
    gap: 0.7rem;
    height: 2.5rem;
    max-width: 2.5rem;
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: 1.6rem;
    overflow: hidden;
    transition: all 1s ease;

    .icon {
      display: flex;
      padding: 0.5rem;
      color: var(--accent);
      background-color: var(--bg);
      border-radius: 50%;
    }

    span {
      padding-right: 1rem;
      text-transform: capitalize;
      text-wrap: nowrap;
      transition: all 5s ease;
    }
  }

  .pfp {
    --pfp-bg: rebeccapurple;
    --pfp-clr: antiquewhite;

    top: 50%;
    left: 50%;
    translate: -50% -50%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 7rem;
    height: 7rem;
    color: var(--pfp-clr);
    background-color: var(--pfp-bg);
    border-radius: 50%;
    font-size: xxx-large;
    text-transform: uppercase;
  }
</style>
