<script lang="ts">
  let {
    incomingVideo = $bindable(),
    outgoingVideo = $bindable(),
    videoPlaying,
    connected,
  } = $props();

</script>

<section class="feed">
  <div>
    <video
      class="{connected ? "minimize" : ""} outgoing"
      id="outgoing"
      bind:this={outgoingVideo}
      autoplay
      muted
      playsinline
    ></video>
    <video
      class="{connected ? "" : "hidden"} incoming"
      id="incoming"
      bind:this={incomingVideo}
      autoplay
      muted
      playsinline
    ></video>
  </div>
</section>

<style>
  .feed {
    flex-grow: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 0;
    container-type: size;
    position: relative;

    div {
      aspect-ratio: 16 / 9;
      background-color: antiquewhite;
      border-radius: 1rem;
      overflow: hidden;

      width: min(100%, calc(100cqh * 16 / 9));
      height: auto;
      display: flex;
      z-index: 1;


    }
  }

  .outgoing {
    /* display: none; */
    width: 100%;

    /* height: 100%; */
    scale: -1 1;
    object-fit: fill;
  }

  .hidden {
    display: none;
  }
  .minimize {
    /* ADDED */
    position: absolute;
    bottom: 1rem;
    right:0;
    width: 10rem;
    /* height: 10rem; */
    aspect-ratio: 16 / 9;
    border-radius: 0.5rem;
    overflow: hidden;
  }
</style>
