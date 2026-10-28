<script lang="ts">
    import { flip } from "svelte/animate";
    import { fly } from "svelte/transition";
    import { alerts } from "../lib/alerts.svelte";
</script>

<aside class="alerts">
    {#each alerts as alr (alr.id)}
        <div
            class="alert"
            data-type={alr.type}
            in:fly={{ x: 50 }}
            out:fly={{ x: 50 }}
            animate:flip={{ duration: 200, delay: 250 }}
        >
            {alr.msg}
        </div>
    {/each}
</aside>

<style>
    .alerts {
        z-index: 10;
        position: absolute;
        top: 0;
        right: 0;
        left: calc(100% - 300px);
        padding: 3rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .alert {
        pointer-events: none;
        color: var(--msg-clr);
        border: 3px solid;
        padding: 0.75rem 0.5rem;
        border-radius: 0.4rem;
        &[data-type="error"] {
            --msg-clr: orangered;
        }
        &[data-type="warning"] {
            --msg-clr: darkorange;
        }
        &[data-type="info"] {
            --msg-clr: cornflowerblue;
        }
        &[data-type="success"] {
            --msg-clr: limegreen;
        }
    }
</style>
