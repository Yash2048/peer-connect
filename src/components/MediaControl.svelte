<script lang="ts">
  import "../app.css";
  let {
    localVideoPlaying = $bindable(),
    localStream = $bindable(),
    localVideoElement,
    remoteVideoElement,
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    selectedAudioInput,
    selectedVideoInput,
    pc,
    deviceConstraints,
    endCall,
  }: {
    localVideoPlaying: boolean;
    localStream: MediaStream | null;
    localVideoElement: HTMLVideoElement | undefined;
    remoteVideoElement: HTMLVideoElement | undefined;
    audioInputDevices: MediaDeviceInfo[];
    audioOutputDevices: MediaDeviceInfo[];
    videoInputDevices: MediaDeviceInfo[];
    pc: RTCPeerConnection | null;
    selectedAudioInput: string;
    selectedVideoInput: string;
    deviceConstraints: Record<string, MediaStreamConstraints>;
    endCall: () => void;
  } = $props();

  let localAudioPlaying = $state(true);

  const toggleVideo = async () => {
    console.info("toggleFeed fired!");

    if (localVideoPlaying) {
      const videoTracks = localStream?.getVideoTracks();

      if (pc) {
        const senders = pc.getSenders();
        videoTracks?.forEach((track) => {
          senders.forEach((sender) => {
            if (sender.track === track) {
              pc.removeTrack(sender);
            }
          });
          track.stop();
          if (localStream) localStream.removeTrack(track);
        });
      } else {
        videoTracks?.forEach((track) => {
          track.stop();
          if (localStream) localStream.removeTrack(track);
        });
      }

      if (!localVideoElement) {
        console.error("localVideoElement is undefined.");
        return;
      }
      if (!localStream) {
        console.error("stream is undefined.");
        return;
      }
      localVideoElement.srcObject = localStream;
      localVideoPlaying = false;
    } else {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia(
          deviceConstraints[selectedVideoInput],
        );
        const videoTrack = videoStream.getVideoTracks()[0];

        console.log(localStream);
        if (!localVideoElement) {
          console.error("localVideoElement is undefined.");
          return;
        }

        if (!localStream) {
          localStream = videoStream;
        } else {
          localStream.addTrack(videoTrack);
        }

        if (pc) pc.addTrack(videoTrack, localStream);
        // localVideoElement.srcObject = stream;
        localVideoPlaying = true;
      } catch (error) {
        console.error(error);
      }
    }
  };

  const toggleAudio = async () => {
    console.info("toggleAudio fired!");
    if (localAudioPlaying) {
      const audioTracks = localStream?.getAudioTracks();

      if (pc) {
        const senders = pc.getSenders();
        audioTracks?.forEach((track) => {
          senders.forEach((sender) => {
            if (sender.track === track) {
              pc.removeTrack(sender);
            }
          });
          track.stop();
          if (localStream) localStream.removeTrack(track);
        });
      } else {
        audioTracks?.forEach((track) => {
          track.stop();
          if (localStream) localStream.removeTrack(track);
        });
      }
      localAudioPlaying = false;
    } else {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const audioTrack = audioStream.getAudioTracks()[0];

        if (!localVideoElement) return;
        if (!localStream) {
          localStream = audioStream;
        } else {
          localStream.addTrack(audioTrack);
        }
        if (pc) pc.addTrack(audioTrack, localStream);

        localAudioPlaying = true;
      } catch (error) {
        console.error(error);
        if (localVideoElement) localVideoElement.srcObject = localStream;
      }
    }
  };

  const changeAudioInput = async (e: Event) => {
    console.info("changeAudioInput fired!");
    if (!localAudioPlaying) {
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

      if (!localStream) {
        localStream = audioStream;
      } else {
        const oldAudioTrack = localStream.getAudioTracks()[0];
        oldAudioTrack.stop();
        localStream.removeTrack(oldAudioTrack);
        localStream.addTrack(audioTrack);
      }
      if (pc) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
        await sender?.replaceTrack(audioTrack);
      }
      // if (localVideoElement && stream) localVideoElement.srcObject = stream;
    } catch (error) {
      console.error(error);
    }
  };
  const changeAudioOutput = async (e: Event) => {
    console.info("changeAudioOutput fired!");
    const deviceId = (e.target as HTMLSelectElement).value;
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
  const changeVideoInput = async (e: Event) => {
    console.info("changeVideoInput fired!");
    if (!localVideoPlaying) {
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

      if (!localStream) {
        localStream = newStream;
      } else {
        const oldVideoTrack = localStream.getVideoTracks()[0];

        if (oldVideoTrack) {
          oldVideoTrack.stop();
          localStream.removeTrack(oldVideoTrack);
        }
        localStream.addTrack(newVideoTrack);
      }

      if (pc) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        await sender?.replaceTrack(newVideoTrack);
      }

      if (localVideoElement && localStream)
        localVideoElement.srcObject = localStream;
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
        {#if localAudioPlaying}
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
        {#if localVideoPlaying}
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

  <button onclick={endCall} aria-label="call-end-toggle" class="end-call">
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
