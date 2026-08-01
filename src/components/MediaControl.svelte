<script lang="ts">
    let { playing, stream, outgoingVideo, hasPerms, height, width, startCall} = $props()
  
    const toggleFeed = () => {
    console.log("toggleFeed is working...");
    console.log("playing = ", playing);
    
    if (playing) {
      console.log("Stopping Tracks");
      
      const tracks = stream?.getTracks();
      tracks?.forEach((track) => track.stop());
      if (outgoingVideo) outgoingVideo.srcObject = null;
      hasPerms = false;
    } else {
      if (outgoingVideo) {
        console.log("outgoing video:",outgoingVideo);
        console.log("outgoing srcobject",outgoingVideo.srcObject);
        console.log("outgoing stream:",stream);
        
        outgoingVideo.srcObject = stream;
      }else{
        console.error("outgoingVideo is undefined");
        
      }
    }
    playing = !playing;
  };
  const changeSize = () => {
    if (!stream) return;
    const tracks = stream.getVideoTracks();
    console.table(tracks);
    tracks.forEach((track) => {
      const capabilities = track.getCapabilities();
      if (capabilities.height && capabilities.height.max)
        height =
          height <= capabilities.height?.max
            ? height
            : capabilities.height?.max;

      if (capabilities.width && capabilities.width.max)
        width =
          width <= capabilities.width?.max ? width : capabilities.width?.max;
      const videoConstraints = {
        height: height,
        width: width,
      };
      track.applyConstraints(videoConstraints);
    });
  };
</script>

<section class="options">
    <button onclick={toggleFeed} disabled={!hasPerms} aria-pressed={playing}
      >{playing ? "Stop" : "Show"} my video</button
    >
    <div class="screen-size">
      <button disabled={!hasPerms} onclick={changeSize}>
        Change screen size</button
      >
      <div role="group">
        <input bind:value={width} type="number" />
        <input bind:value={height} type="number" />
      </div>
      <button onclick={startCall}>Start Call</button>
    </div>
    <!-- <button disabled={!hasPerms} onclick={startRecording}
      >Start Recording</button
    >
    <button disabled={!hasPerms || recording == 0} onclick={pauseRecording}
      >{recording == 2 ? "Unpause" : "Pause"} Recording</button
    >
    <button disabled={!hasPerms || recording == 0} onclick={stopRecording}
      >Stop Recording</button
    >
    <button disabled={!hasPerms} onclick={playRecording}>Play Recording</button>
    <button onclick={shareScreen} aria-pressed={screenSharing}
      >{screenSharing ? "Stop Sharing" : "Share Screen"}</button
    > -->
    <!-- <div class="input">
      <label for="audio-input">Select Audio Input</label>
      <select onchange={changeAudioInput} name="audio-input" id="audio-input"
        ><option value="">Select</option>
        {#each audioInputDevices as audioInputDevice}
          <option value={audioInputDevice.deviceId}
            >{audioInputDevice.label}</option
          >
        {/each}
      </select>
    </div>
    <div class="input">
      <label for="audio-output">Select Audio Output</label>
      <select onchange={changeAudioOutput} name="audio-output" id="audio-output"
        ><option value="">Select</option>
        {#each audioOutputDevices as audioOutputDevice}
          <option value={audioOutputDevice.deviceId}
            >{audioOutputDevice.label}</option
          >
        {/each}
      </select>
    </div>
    <div class="input">
      <label for="video-input">Select Video Input</label>
      <select onchange={changeVideoInput} name="video-input" id="video-input"
        ><option value="">Select</option>
        {#each videoInputDevices as videoInputDevice}
          <option value={videoInputDevice.deviceId}
            >{videoInputDevice.label}</option
          >
        {/each}</select
      >
    </div> -->
  </section>

  <style>
  .options{
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .screen-size {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  [role="group"]{
    gap:1rem;
  }

</style>
