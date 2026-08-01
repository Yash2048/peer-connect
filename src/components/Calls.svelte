<script lang="ts">
  let { incomingVideo  = $bindable(), outgoingVideo = $bindable() } = $props();
</script>

<section class="feed">
  <div>
    <h2>Incoming Feed</h2>
    <video id="incoming" bind:this={incomingVideo} autoplay playsinline></video>
  </div>
  <div>
    <h2>Outgoing Feed</h2>
    <video id="outgoing" bind:this={outgoingVideo} autoplay muted playsinline
    ></video>
  </div>
</section>

<style>
  video {
    background-color: cornflowerblue;
  }
  .feed {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  #outgoing,
  #incoming {
    max-width: 480px;
  }
</style>
