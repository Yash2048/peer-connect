<script lang="ts">
  import "../app.css";
  import Icon from "@iconify/svelte";
  let {
    outgoingVideoPlaying = $bindable(),
    outgoingStream = $bindable(),
    outgoingVideo,
    incomingVideo,
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    selectedAudioInput,
    selectedVideoInput,
    pc,
    deviceConstraints,
  }: {
    outgoingVideoPlaying: boolean;
    outgoingStream: MediaStream | null;
    outgoingVideo: HTMLVideoElement | undefined;
    incomingVideo: HTMLVideoElement | undefined;
    audioInputDevices: MediaDeviceInfo[];
    audioOutputDevices: MediaDeviceInfo[];
    videoInputDevices: MediaDeviceInfo[];
    pc: RTCPeerConnection;
    selectedAudioInput: string;
    selectedVideoInput: string;
    deviceConstraints: Record<string, MediaStreamConstraints>;
  } = $props();

  let audioPlaying = $state(true);

  const toggleVideo = async () => {
    console.info("toggleFeed fired!");

    if (outgoingVideoPlaying) {
      const senders = pc.getSenders();
      const videoTracks = outgoingStream?.getVideoTracks();

      videoTracks?.forEach((track) => {
        senders.forEach((sender) => {
          if (sender.track === track) {
            pc.removeTrack(sender);
          }
        });
        track.stop();
        if (outgoingStream) outgoingStream.removeTrack(track);
      });
      if (!outgoingVideo) {
        console.error("outgoingVideo is undefined.");
        return;
      }
      if (!outgoingStream) {
        console.error("stream is undefined.");
        return;
      }
      outgoingVideo.srcObject = outgoingStream;
      outgoingVideoPlaying = false;
    } else {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia(
          deviceConstraints[selectedVideoInput],
        );
        const videoTrack = videoStream.getVideoTracks()[0];

        console.log(outgoingStream);
        if (!outgoingVideo) {
          console.error("outgoingVideo is undefined.");
          return;
        }

        if (!outgoingStream) {
          outgoingStream = videoStream;
        } else {
          outgoingStream.addTrack(videoTrack);
        }
        pc.addTrack(videoTrack, outgoingStream);
        // outgoingVideo.srcObject = stream;
        outgoingVideoPlaying = true;
      } catch (error) {
        console.error(error);
      }
    }
  };

  const toggleAudio = async () => {
    console.info("toggleAudio fired!");
    if (audioPlaying) {
      const senders = pc.getSenders();
      const audioTracks = outgoingStream?.getAudioTracks();

      audioTracks?.forEach((track) => {
        senders.forEach((sender) => {
          if (sender.track === track) {
            pc.removeTrack(sender);
          }
        });
        track.stop();
        if (outgoingStream) outgoingStream.removeTrack(track);
      });
      audioPlaying = false;
    } else {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const audioTrack = audioStream.getAudioTracks()[0];

        if (!outgoingVideo) return;
        if (!outgoingStream) {
          outgoingStream = audioStream;
        } else {
          outgoingStream.addTrack(audioTrack);
        }
        pc.addTrack(audioTrack, outgoingStream);

        audioPlaying = true;
      } catch (error) {
        console.error(error);
        if (outgoingVideo) outgoingVideo.srcObject = outgoingStream;
      }
    }
  };

  const changeAudioInput = async (e: Event) => {
    console.info("changeAudioInput fired!");
    if (!audioPlaying) {
      console.warn("Can't change Audio Input while muted.");
      return;
    }
    const deviceId = (e.target as HTMLSelectElement).value;

    const audioConstraints: MediaStreamConstraints = {
      audio: { deviceId: { exact: deviceId } },
    };

    try {
      const audioStream =
        await navigator.mediaDevices.getUserMedia(audioConstraints);
      const audioTrack = audioStream.getAudioTracks()[0];

      if (!outgoingStream) {
        outgoingStream = audioStream;
      } else {
        const oldAudioTrack = outgoingStream.getAudioTracks()[0];
        oldAudioTrack.stop();
        outgoingStream.removeTrack(oldAudioTrack);
        outgoingStream.addTrack(audioTrack);
      }
      const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
      await sender?.replaceTrack(audioTrack);
      // if (outgoingVideo && stream) outgoingVideo.srcObject = stream;
    } catch (error) {
      console.error(error);
    }
  };
  const changeAudioOutput = async (e: Event) => {
    console.info("changeAudioOutput fired!");
    const deviceId = (e.target as HTMLSelectElement).value;
    if (!incomingVideo) {
      console.error("incomingVideo doesn't exist");
      return;
    }
    if (!("setSinkId" in incomingVideo)) {
      console.error("setSinkId not supported in this browser");
      return;
    }
    try {
      await incomingVideo.setSinkId(deviceId);
      console.log("Device changed to", deviceId);
    } catch (error) {
      console.error(error);
    }
  };
  const changeVideoInput = async (e: Event) => {
    console.info("changeVideoInput fired!");
    if (!outgoingVideoPlaying) {
      console.warn("Can't change Video Input while video is off.");
      return;
    }
    const deviceId = (e.target as HTMLSelectElement).value;

    const videoConstraints: MediaStreamConstraints = {
      video: { deviceId: { exact: deviceId } },
    };

    try {
      let newStream;
      if (deviceConstraints[selectedVideoInput])
        newStream = await navigator.mediaDevices.getUserMedia(
          deviceConstraints[selectedVideoInput],
        );
      else {
        newStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
        const videoCapabilities = newStream
          .getVideoTracks()[0]
          .getCapabilities();

        if (videoCapabilities.deviceId) {
          const { height, width } = videoCapabilities;
          deviceConstraints[videoCapabilities.deviceId] = {
            video: {
              deviceId: { exact: videoCapabilities.deviceId },
              width: width?.max,
              height: height?.max,
            },
          };
        }
        newStream.getTracks().forEach((track) => track.stop());
        if (deviceConstraints[selectedVideoInput])
          newStream = await navigator.mediaDevices.getUserMedia(
            deviceConstraints[selectedVideoInput],
          );
      }
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (!outgoingStream) {
        outgoingStream = newStream;
      } else {
        const oldVideoTrack = outgoingStream.getVideoTracks()[0];

        if (oldVideoTrack) {
          oldVideoTrack.stop();
          outgoingStream.removeTrack(oldVideoTrack);
        }
        outgoingStream.addTrack(newVideoTrack);
      }

      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      await sender?.replaceTrack(newVideoTrack);

      if (outgoingVideo && outgoingStream)
        outgoingVideo.srcObject = outgoingStream;
    } catch (error) {
      console.error(error);
    }
  };
  let audioDropDownOpen = $state(false);
  let videoDropDownOpen = $state(false);

  import IconMdiCameraOutline from "~icons/mdi/camera-outline";
  import IconMdiCameraOffOutline from "~icons/mdi/camera-off-outline";
  import IconMSMicOutline from "~icons/material-symbols/mic-outline";
  import IconMSMicOffOutline from "~icons/material-symbols/mic-off-outline";
  import IconMSScreenShare from "~icons/material-symbols/screen-share";
  import IconMSScreenShareOutline from "~icons/material-symbols/screen-share-outline";
  import IconMSCallEndOutline from "~icons/material-symbols/call-end-outline";
  import IconTablerDots from "~icons/tabler/dots";
</script>

<section class="options">
  <div class="dropdown audio">
    <div popover id="dropdown-menu-audio" class="dropdown-menu">
      <select
        bind:value={selectedAudioInput}
        onchange={changeAudioInput}
        name=""
        id=""
      >
        {#each audioInputDevices as audioInputDevice}
          <option value={audioInputDevice.deviceId}
            >{audioInputDevice.label}</option
          >
        {/each}
      </select>
      <select onchange={changeAudioOutput} name="" id="">
        {#each audioOutputDevices as audioOutputDevice}
          <option value={audioOutputDevice.deviceId}
            >{audioOutputDevice.label}</option
          >
        {/each}
      </select>
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
        <!-- <Icon height="24px" icon="tabler:dots" /> -->
        <IconTablerDots height="24px" width="24px" />
      </button>
      <button
        aria-label="audio-toggle"
        class="audio-toggle-button"
        onclick={toggleAudio}
      >
        {#if audioPlaying}
          <IconMSMicOutline height="24px" width="24px" />
        {:else}
          <IconMSMicOffOutline height="24px" width="24px" />
        {/if}
      </button>
    </span>
  </div>

  <div class="dropdown video">
    <div popover id="dropdown-menu-video" class="dropdown-menu">
      <select
        bind:value={selectedVideoInput}
        onchange={changeVideoInput}
        name=""
        id=""
      >
        {#each videoInputDevices as videoInputDevice}
          <option value={videoInputDevice.deviceId}
            >{videoInputDevice.label}</option
          >
        {/each}
      </select>
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
        <IconTablerDots height="24px" width="24px" />
      </button>
      <button
        aria-label="video-toggle"
        class="video-toggle-button"
        onclick={toggleVideo}
      >
        {#if outgoingVideoPlaying}
          <IconMdiCameraOutline width="24" height="24" />
        {:else}
          <IconMdiCameraOffOutline width="24" height="24" />
        {/if}
      </button>
    </span>
  </div>

  <button aria-label="screen-share-toggle" class="screen-share-toggle">
    {#if false}
      <IconMSScreenShare height="24px" width="24px" />
    {:else}
      <IconMSScreenShareOutline height="24px" width="24px" />
    {/if}
  </button>

  <button aria-label="call-end-toggle" class="end-call">
    <IconMSCallEndOutline height="24px" width="24px" />
  </button>
</section>

<style>
  section {
    display: flex;
    justify-content: center;
  }

  .options {
    bottom: 1rem;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
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
      /* min-width: 10rem; */
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
  }
</style>
