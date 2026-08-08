<script lang="ts">
  import Icon from "@iconify/svelte";
  let {
    playing,
    stream = $bindable(),
    outgoingVideo,
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    hasPerms,
  }: {
    playing: boolean;
    stream: MediaStream | null;
    outgoingVideo: HTMLVideoElement | undefined;
    audioInputDevices: MediaDeviceInfo[];
    audioOutputDevices: MediaDeviceInfo[];
    videoInputDevices: MediaDeviceInfo[];
    hasPerms: boolean;
  } = $props();

  const toggleFeed = () => {
    console.log("toggleFeed is working...");
    console.log("playing = ", playing);

    if (playing) {
      console.log("Stopping Tracks");

      const tracks = stream?.getTracks();
      // tracks?.forEach((track) => track.stop());
      if (outgoingVideo) outgoingVideo.srcObject = null;
      // hasPerms = false;
    } else {
      if (outgoingVideo) {
        outgoingVideo.srcObject = stream;
      } else {
        console.error("outgoingVideo is undefined");
      }
    }
    playing = !playing;
  };

  const changeAudioInput = async (e: Event) => {
    console.info("changeAudioInput fired!");
    const deviceId = (e.target as HTMLSelectElement).value;
    const newConstraints = {
      audio: { deviceId: { exact: deviceId } },
      video: true,
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia(newConstraints);
      console.log(stream);
      if (outgoingVideo && stream) outgoingVideo.srcObject = stream;
    } catch (error) {
      console.error(error);
    }
  };
  const changeAudioOutput = async (e: Event) => {
    console.info("changeAudioOutput fired!");

    try {
      const selectEle: HTMLSelectElement | null = e.target as HTMLSelectElement;
      if (!selectEle) {
        console.error("Select Element doesn't exist");
        return;
      }
      if (!outgoingVideo) {
        console.error("outgoingVideo doesn't exist");
        return;
      }
      await outgoingVideo.setSinkId(selectEle.value);
      console.log("Device changed to ", selectEle.value);
    } catch (error) {
      console.error(error);
    }
  };
  const changeVideoInput = async (e: Event) => {
    console.info("changeVideoInput fired!");
    const deviceId = (e.target as HTMLSelectElement).value;
    const newConstraints = {
      video: { deviceId: { exact: deviceId } },
      audio: true,
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia(newConstraints);
      console.log(stream);
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
      <button class="audio-toggle-button" onclick={() => {}}>
        {#if playing}
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
      <button class="video-toggle-button" onclick={toggleFeed}>
        {#if playing}
          <Icon height="24px" icon="mdi:camera-outline" />
        {:else}
          <Icon height="24px" icon="mdi:camera-off-outline" />
        {/if}
      </button>
    </span>
  </div>

  <button>
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
    position: fixed;
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
  }
  .dropdown-button-container {
    background-color: rgb(57, 54, 61);
    display: flex;
    border: 1px black solid;
    border-radius: 1.5rem;
    overflow: hidden;

    & button:first-child {
      background-color: transparent;
    }
  }
  .dropdown-menu {
    display: none;
    position: absolute;
    bottom: 3.5rem;
    padding: 0.5rem 1rem;
    background-color: rgb(57, 54, 61);
    border-radius: 1rem;
    select {
      min-width: 10rem;
      min-height: 2rem;
    }
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
</style>
