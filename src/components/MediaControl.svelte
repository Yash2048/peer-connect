<script lang="ts">
  import "../app.css";
  import Icon from "@iconify/svelte";
  let {
    videoPlaying = $bindable(),
    stream = $bindable(),
    outgoingVideo,
    incomingVideo,
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    constraints = $bindable(),
    pc,
  }: {
    videoPlaying: boolean;
    stream: MediaStream | null;
    outgoingVideo: HTMLVideoElement | undefined;
    incomingVideo: HTMLVideoElement | undefined;
    audioInputDevices: MediaDeviceInfo[];
    audioOutputDevices: MediaDeviceInfo[];
    videoInputDevices: MediaDeviceInfo[];
    constraints: MediaStreamConstraints;
    pc: RTCPeerConnection;
  } = $props();

  let audioPlaying = $state(true);
  $inspect(constraints).with(console.log);

  const toggleVideo = async () => {
    console.info("toggleFeed fired!");

    if (videoPlaying) {
      constraints.video = false;
      const senders = pc.getSenders();
      const videoTracks = stream?.getVideoTracks();

      videoTracks?.forEach((track) => {
        senders.forEach((sender) => {
          if (sender.track === track) {
            pc.removeTrack(sender);
          }
        });
        track.stop();
        if (stream) stream.removeTrack(track);
      });
      if (!outgoingVideo) {
        console.error("outgoingVideo is undefined.");
        return;
      }
      if (!stream) {
        console.error("stream is undefined.");
        return;
      }
      outgoingVideo.srcObject = stream;
      videoPlaying = false;
    } else {
      const videoConstraints = {
        video:
        true, 
        // {
          // width: { ideal: 128000 },
          // height: { ideal: 72000 },
          // aspectRatio: { ideal: 16 / 9 },
        // },
      };
      try {
        const videoStream =
          await navigator.mediaDevices.getUserMedia(videoConstraints);
        const videoTrack = videoStream.getVideoTracks()[0];

        console.log(stream);
        if (!outgoingVideo) {
          console.error("outgoingVideo is undefined.");
          return;
        }

        if (!stream) {
          stream = videoStream;
        } else {
          stream.addTrack(videoTrack);
        }
        pc.addTrack(videoTrack, stream);
        // outgoingVideo.srcObject = stream;
        videoPlaying = true;
      } catch (error) {
        console.error(error);
      }
    }
  };

  const toggleAudio = async () => {
    console.info("toggleAudio fired!");
    if (audioPlaying) {
      const audioTracks = stream?.getAudioTracks();
      audioTracks?.forEach((track) => {
        track.stop();
        stream?.removeTrack(track);
      });
      // if (outgoingVideo) outgoingVideo.srcObject = stream;
      audioPlaying = false;
    } else {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const audioTrack = audioStream.getAudioTracks()[0];

        if (!outgoingVideo) return;
        if (!stream) {
          stream = audioStream;
        } else {
          stream.addTrack(audioTrack);
        }
        pc.addTrack(audioTrack, stream);

        audioPlaying = true;
      } catch (error) {
        console.error(error);
        if (outgoingVideo) outgoingVideo.srcObject = stream;
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

      if (!stream) {
        stream = audioStream;
      } else {
        const oldAudioTrack = stream.getAudioTracks()[0];
        oldAudioTrack.stop();
        stream.removeTrack(oldAudioTrack);
        stream.addTrack(audioTrack);
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
    if (!videoPlaying) {
      console.warn("Can't change Video Input while video is off.");
      return;
    }
    const deviceId = (e.target as HTMLSelectElement).value;

    const videoConstraints: MediaStreamConstraints = {
      video: { deviceId: { exact: deviceId } },
    };

    try {
      const newStream =
        await navigator.mediaDevices.getUserMedia(videoConstraints);
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (!stream) {
        stream = newStream;
      } else {
        const oldVideoTrack = stream.getVideoTracks()[0];

        if (oldVideoTrack) {
          oldVideoTrack.stop();
          stream.removeTrack(oldVideoTrack);
        }
        stream.addTrack(newVideoTrack);
      }

      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      await sender?.replaceTrack(newVideoTrack);

      if (outgoingVideo && stream) outgoingVideo.srcObject = stream;
    } catch (error) {
      console.error(error);
    }
  };
  let audioDropDownOpen = $state(false);
  let videoDropDownOpen = $state(false);
</script>

<section class="options">
  <div class="dropdown audio">
    <div class="dropdown-menu">
      <select onchange={changeAudioInput} name="" id="">
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
        class="dropdown-toggle"
        onclick={() => {
          audioDropDownOpen = !audioDropDownOpen;
        }}
      >
        <Icon height="24px" icon="tabler:dots" />
      </button>
      <button class="audio-toggle-button" onclick={toggleAudio}>
        {#if audioPlaying}
          <Icon height="24px" icon="material-symbols:mic-outline" />
        {:else}
          <Icon height="24px" icon="material-symbols:mic-off-outline" />
        {/if}
      </button>
    </span>
  </div>

  <div class="dropdown video">
    <div class="dropdown-menu">
      <select onchange={changeVideoInput} name="" id="">
        {#each videoInputDevices as videoInputDevice}
          <option value={videoInputDevice.deviceId}
            >{videoInputDevice.label}</option
          >
        {/each}
      </select>
    </div>
    <span class="dropdown-button-container">
      <button
        class="dropdown-toggle"
        onclick={() => {
          videoDropDownOpen = !videoDropDownOpen;
        }}
      >
        <Icon height="24px" icon="tabler:dots" />
      </button>
      <button class="video-toggle-button" onclick={toggleVideo}>
        {#if videoPlaying}
          <Icon height="24px" icon="mdi:camera-outline" />
        {:else}
          <Icon height="24px" icon="mdi:camera-off-outline" />
        {/if}
      </button>
    </span>
  </div>

  <button class="screen-share-toggle">
    {#if false}
      <Icon height="24px" icon="material-symbols:screen-share" />
    {:else}
      <Icon height="24px" icon="material-symbols:screen-share-outline" />
    {/if}
  </button>

  <button class="end-call">
    <Icon height="24px" icon="material-symbols:call-end-outline" />
  </button>
</section>

<style>

  section {
    display: flex;
    justify-content: center;
  }

  .options {
    /* position: fixed; */
    bottom: 1rem;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  button {
    border: none;
    height: 3rem;
    width: 3rem;
    border-radius: 50%;
    background-color: var(--accent);
  }
  .dropdown-button-container {
    background-color: var(--surface);
    display: flex;
    border: 1.5px var(--border) solid;
    border-radius: 1.5rem;
    overflow: hidden;

    & button:first-child {
      background-color: transparent;
    }
  }
  .dropdown-menu {
    display: none;
    position: absolute;
    bottom: 4rem;
    padding: 0.5rem 1rem;
    background-color: var(--surface);
    border-radius: 0.5rem;
    select {
      /* min-width: 10rem; */
      min-height: 2rem;
      background-color: var(--bg);
      border-radius: 0.25rem;
      padding: 0.25rem;
    }
    z-index: 10;
  }
  .dropdown:focus-within .dropdown-menu {
    display: block;
  }

  .end-call {
    background-color: red;
    &:hover {
      border: 1px solid black;
    }
  }

.dropdown-button-container button:nth-child(2), .screen-share-toggle{
  color:var(--accent-clr)
}
</style>
