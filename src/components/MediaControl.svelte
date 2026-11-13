<script lang="ts">
  import { media } from "../lib/localMedia.svelte";
  import { WebRTCConnection } from "../lib/webrtc.svelte";
  let {
    localVideoElement,
    remoteVideoElement,
    rtc,
    toggleChat,
    endCall,
  }: {
    localVideoElement: HTMLVideoElement | null;
    remoteVideoElement: HTMLVideoElement | undefined;
    rtc: WebRTCConnection;
    toggleChat: () => void;
    endCall: () => void;
  } = $props();

  const toggleVideo = async () => {
    if (!media.localStream) return;

    const track = await media.toggleVideo(rtc);
    if (track) rtc.addTrack(track, media.localStream);
  };

  const toggleAudio = async () => {
    if (!media.localStream) return;

    const track = await media.toggleAudio(rtc);
    if (track) rtc.addTrack(track, media.localStream);
  };

  const changeAudioInput = async (e: Event) => {
    const el = e.target as HTMLSelectElement;

    const track = await media.changeAudioInput(el.value);
    if (!track) {
      el.value = media.selectedAudioInput; // revert the <select>
      return;
    }

    try {
      await rtc.replaceTrack("audio", track);
    } catch (error) {
      console.error(error);
    }
  };

  const changeVideoInput = async (e: Event) => {
    const el = e.target as HTMLSelectElement;

    const track = await media.changeVideoInput(el.value);
    if (!track) {
      el.value = media.selectedVideoInput;
      return;
    }

    try {
      await rtc.replaceTrack("video", track);
    } catch (error) {
      console.error(error);
    }

    if (localVideoElement && media.localStream) {
      localVideoElement.srcObject = media.localStream;
    }
  };
  const changeAudioOutput = async (e: Event) => {
    console.info("changeAudioOutput fired!");
    const deviceId = (e.target as HTMLSelectElement).value;
    media.selectedAudioOutput = deviceId;
    if (!remoteVideoElement) {
      console.error("remoteVideoElement doesn't exist");
      return;
    }
    if (!("setSinkId" in remoteVideoElement)) {
      console.error("setSinkId not supported in this browser");
      return;
    }
    try {
      await remoteVideoElement.setSinkId(deviceId);
      console.log("Device changed to", deviceId);
    } catch (error) {
      console.error(error);
    }
  };
  let audioDropDownOpen = $state(false);
  let videoDropDownOpen = $state(false);

  import CameraOutlineIcon from "~icons/mdi/camera-outline";
  import CameraOffOutlineIcon from "~icons/mdi/camera-off-outline";
  import MicOutlineIcon from "~icons/material-symbols/mic-outline";
  import MicOffOutlineIcon from "~icons/material-symbols/mic-off-outline";
  import ScreenShareIcon from "~icons/material-symbols/screen-share";
  import ScreenShareOutlineIcon from "~icons/material-symbols/screen-share-outline";
  import CallEndOutlineIcon from "~icons/material-symbols/call-end-outline";
  import DotsIcon from "~icons/tabler/dots";
  import MicRoundedIcon from "~icons/material-symbols/mic-rounded";
  import VolumeUpRoundedIcon from "~icons/material-symbols/volume-up-rounded";
  import VideocamRoundedIcon from "~icons/material-symbols/videocam-rounded";
  import ChatIcon from "~icons/material-symbols/chat";
</script>

{#snippet io(
  selectedValue: string,
  media: MediaDeviceInfo[],
  changeHandler: (e: Event) => Promise<void>,
  name: string,
)}
  <select
    value={selectedValue}
    onchange={changeHandler}
    {name}
    id="{name}-selector"
  >
    {#if media.length === 0 || !media[0].label}
      <option value="">Permission required</option>
    {:else}
      {#each media as device}
        <option value={device.deviceId}>{device.label}</option>
      {/each}
    {/if}
  </select>
{/snippet}

<section class="options">
  <div class="left"></div>
  <div class="center">
    <div class="dropdown audio">
      <div popover id="dropdown-menu-audio" class="dropdown-menu">
        <MicRoundedIcon height="24px" width="24px" />
        {@render io(
          media.selectedAudioInput,
          media.audioInputDevices,
          changeAudioInput,
          "audio-input",
        )}
        <VolumeUpRoundedIcon height="24px" width="24px" />
        {@render io(
          media.selectedAudioOutput,
          media.audioOutputDevices,
          changeAudioOutput,
          "audio-output",
        )}
      </div>
      <span class="dropdown-button-container">
        <button
          aria-label="audio-dropdown-toggle"
          popovertarget="dropdown-menu-audio"
          class="dropdown-toggle"
          onclick={() => {
            audioDropDownOpen = !audioDropDownOpen;
          }}
        >
          <DotsIcon height="24px" width="24px" />
        </button>
        <button
          aria-label="audio-toggle"
          class="audio-toggle-button"
          onclick={toggleAudio}
        >
          {#if media.localAudioPlaying}
            <MicOutlineIcon height="24px" width="24px" />
          {:else}
            <MicOffOutlineIcon height="24px" width="24px" />
          {/if}
        </button>
      </span>
    </div>

    <div class="dropdown video">
      <div popover id="dropdown-menu-video" class="dropdown-menu">
        <VideocamRoundedIcon height="24px" width="24px" />
        {@render io(
          media.selectedVideoInput,
          media.videoInputDevices,
          changeVideoInput,
          "audio-input",
        )}
      </div>
      <span class="dropdown-button-container">
        <button
          aria-label="video-dropdown-toggle"
          popovertarget="dropdown-menu-video"
          class="dropdown-toggle"
          onclick={() => {
            videoDropDownOpen = !videoDropDownOpen;
          }}
        >
          <DotsIcon height="24px" width="24px" />
        </button>
        <button
          aria-label="video-toggle"
          class="video-toggle-button"
          onclick={toggleVideo}
        >
          {#if media.localVideoPlaying}
            <CameraOutlineIcon width="24" height="24" />
          {:else}
            <CameraOffOutlineIcon width="24" height="24" />
          {/if}
        </button>
      </span>
    </div>

    <button aria-label="screen-share-toggle" class="screen-share-toggle">
      {#if false}
        <ScreenShareIcon height="24px" width="24px" />
      {:else}
        <ScreenShareOutlineIcon height="24px" width="24px" />
      {/if}
    </button>

    <button onclick={endCall} aria-label="call-end-toggle" class="end-call">
      <CallEndOutlineIcon height="24px" width="24px" />
    </button>
  </div>
  <div class="right">
    <button class="toggle-chat" onclick={toggleChat}>
      <ChatIcon height="24px" width="24px" />
    </button>
  </div>
</section>

<style>
  section {
    display: flex;
    justify-content: center;
  }
  .center {
    display: flex;
    gap: 1rem;
  }
  .options {
    width: 100%;
    bottom: 1rem;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .dropdown.audio {
    anchor-name: --anchor-audio;

    .dropdown-menu {
      position-anchor: --anchor-audio;
    }
  }
  .dropdown.video {
    anchor-name: --anchor-video;

    .dropdown-menu {
      position-anchor: --anchor-video;
    }
  }
  .dropdown-menu {
    align-items: center;
    width: fit-content;
    position: absolute;
    position-area: top span-right;
    padding: 0.5rem 1rem;
    background-color: var(--surface);
    border-radius: 0.5rem;
    border: 1px solid var(--border);
    margin: 1rem 0;
    gap: 1rem;
    select {
      min-width: 5rem;
      min-height: 2rem;
      background-color: var(--bg);
      border-radius: 0.25rem;
      padding: 0.25rem;
    }
    z-index: 10;
    &:popover-open {
      display: flex;
    }
  }

  button {
    height: 3rem;
    width: 3rem;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .dropdown-button-container {
    background-color: var(--surface);
    display: flex;
    border: 1.5px var(--border) solid;
    border-radius: 1.6rem;
    overflow: hidden;

    & button:first-child {
      background-color: transparent;
    }
  }

  .end-call {
    --btn-bg: red;
  }

  .dropdown-button-container button:first-child {
    --btn-clr: var(--btn-bg);
    &:focus-visible {
      box-shadow: inset 0 0 2rem -1.5rem white;
    }
  }
</style>
