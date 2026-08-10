<script lang="ts">
  let { incomingVideo = $bindable(), outgoingVideo = $bindable(), videoPlaying } = $props();
</script>

<section class="feed">
  <div>
  <!-- {#if videoPlaying == true} -->
    <video   id="outgoing" bind:this={outgoingVideo} autoplay muted playsinline
    ></video>
  <!-- {/if} -->
  </div>
  <!-- <video  id="incoming" bind:this={incomingVideo}  autoplay muted playsinline
    ></video> -->
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

    div {
      aspect-ratio: 16 / 9;
      background-color: antiquewhite;
      border-radius: 1rem;
      overflow: hidden;

      width: min(100%, calc(100cqh * 16 / 9));
      height: auto;
      display: flex;
    }
  }
  
  #outgoing {
    /* display: none; */
    width: 100%;
    /* height: 100%; */
    scale: -1 1;
    object-fit: fill;
  }
</style>
