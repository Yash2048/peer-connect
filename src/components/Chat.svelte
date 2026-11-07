<script lang="ts">
    let {
        chatOpen,
    }: {
        chatOpen: boolean;
    } = $props();
    import { addMessage, messages } from "../lib/chat.svelte";
    const onsubmit = (ev: Event) => {
        ev.preventDefault();
        if (!text) return;
        addMessage(text, new Date(), false);
        text = "";
    };
    let text: string = $state("");
    import SendIcon from "~icons/material-symbols/send";
</script>

<aside class:open={chatOpen}>
    <header>
        <h2>Chat</h2>
    </header>
    <section class="messages">
        {#if messages.length < 1}
            <p class="starter-text">Start a new conversation!</p>
        {/if}
        {#each messages as m (m.msgID)}
            <span class="message {m.fromPeer ? 'incoming' : 'outgoing'}">
                <span class="text">
                    {m.msg}
                </span>
                <time datetime={m.time.toISOString()}>
                    {m.time.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </time>
            </span>
        {/each}
    </section>
    <footer>
        <form {onsubmit}>
            <textarea name="" id="" bind:value={text}></textarea>
            <button><SendIcon height="20px" width="20px" /></button>
        </form>
    </footer>
</aside>

<style>
    aside {
        margin-inline-start: 1rem;
        color: var(--text);
        background-color: var(--muted);
        width: 0rem;
        transition:
            width 0.75s,
            opacity 0.4s;
        border-radius: 0.35rem;
        display: flex;
        flex-direction: column;
        overflow-x: clip;
        min-width: 0;
        opacity: 0;
        &.open {
            width: 30rem;
            opacity: 1;
        }
        .messages {
            overflow-y: scroll;
            display: flex;
            flex-direction: column;
            padding: 1rem;
            flex-grow: 1;
        }
    }
    header {
        background-color: var(--surface);
        padding: 1rem;
        border-bottom: 2px solid var(--text);
    }

    .message {
        --msg-bg: var(--surface);
        --msg-clr: var(--text);
        margin-bottom: 1em;
        position: relative;
        padding: 0.2rem 0.5rem;
        background-color: var(--msg-bg);
        color: var(--msg-clr);
        width: fit-content;
        border-radius: 0.5rem;
        overflow-wrap: anywhere;
        display: flex;
        flex-direction: column;
        row-gap: 0.5ch;
        &::after {
            content: "";
            top: 0;
            /* left: -6px; */
            border: 8px solid transparent;
            border-top-color: var(--msg-bg);
            position: absolute;
        }
        time {
            --isDark: -1;
            font-size: x-small;
            color: oklch(
                from var(--msg-clr) calc(l + var(--isDark) * 0.15) c h
            );
        }
    }
    .outgoing {
        --msg-bg: var(--accent);
        --msg-clr: var(--bg);
        color: var(--bg);
        align-self: end;
        &::after {
            right: -6px;
        }
        time {
            --isDark: 1;
            align-self: flex-end;
        }
    }
    .incoming::after {
        left: -6px;
    }
    footer {
        display: flex;
        padding: 0.25rem;
    }
    form {
        flex: 1;
        gap: 0.25rem;
        display: flex;
        align-items: end;
        textarea {
            flex: 1;
            font-size: 1rem;
            field-sizing: content;
            min-height: 100%;
            max-height: calc(3lh + 0.4rem);
            padding: 0.2rem 0.4rem;
            overflow-wrap: anywhere;
            resize: vertical;
            &::-webkit-resizer {
                background-color: transparent;
            }
        }
        button {
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
        }
    }
    .starter-text {
        align-self: center;
        text-wrap: nowrap;
    }
</style>
