<script lang="ts">
  import { onMount } from "svelte";

  let stream: MediaStream | null = null;
  let myVideo: HTMLMediaElement | null;
  const constraints = { video: true };

  const askPermissions = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {}
  };

  const toggleFeed = () => {
    myVideo = document.querySelector("#incoming");
    console.log("toggleFeed is working");
    if (myVideo) {
      myVideo.srcObject = stream;
    }
  };
  const startVideo = async () => {
    let astream: MediaStream | null = null;

    try {
      astream = await navigator.mediaDevices.getUserMedia(constraints);
      myVideo = document.querySelector("#incoming");
      console.log("startVideo is working");
      console.log(myVideo);
      console.log(astream);
      
      if (myVideo) {
        myVideo.srcObject = astream;
      }
    } catch (error) {}
  };
  // state
</script>

<main>
  <section class="options">
    <button onclick={askPermissions}>Get Permissions</button>
    <button onclick={toggleFeed}>Show my video</button>
    <button onclick={startVideo}>Start Video</button>
  </section>
  <section class="feed">
    <video id="incoming" autoplay></video>
    <video id="outgoing" autoplay></video>
  </section>
</main>

<style>
  video {
    background-color: cornflowerblue;
  }
</style>
