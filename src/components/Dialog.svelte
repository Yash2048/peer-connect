<script lang="ts">
    import { onMount } from "svelte";

    let { joinRoom, onFormSubmit, onDialogRef } = $props();
    let roomName = $state("");
    let userName = $state("");
    let dialogRef: HTMLDialogElement | undefined = $state();

    onMount(() => {
        if (dialogRef) onDialogRef(dialogRef);
    });
</script>

<dialog bind:this={dialogRef}>
    <form
        method="dialog"
        onsubmit={() => {
            onFormSubmit(roomName, userName);
            roomName = "";
            userName = "";
            joinRoom();
        }}
    >
        <fieldset>
            <label>
                <span>Room Name</span>
                <input
                    type="text"
                    name="room-name"
                    bind:value={roomName}
                    placeholder="Meeting"
                    minlength="1"
                    autocomplete="off"
                />
            </label>
            <label>
                <span>User Name</span>
                <input
                    type="text"
                    name="user-name"
                    bind:value={userName}
                    placeholder="John Doe"
                    minlength="1"
                    required
                    autocomplete="off"
                />
            </label>
            <button>Start Call</button>
        </fieldset>
    </form>
</dialog>

<style>
    dialog {
        border: 0;
    }

    dialog {
        position: absolute;
        top: 50%;
        left: 50%;
        translate: -50% -50%;
        border-radius: 1rem;
        background: var(--bg);
        color: var(--text);
        width: min(360px, 90vw);
        font-family: system-ui, sans-serif;
    }

    dialog::backdrop {
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(5px);
    }

    dialog form {
        padding: 1.75rem;
    }

    dialog fieldset {
        border: none;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    dialog label {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        font-size: 0.85rem;
        color: var(--muted);
    }

    dialog input {
        border-radius: 8px;
        padding: 0.6rem 0.75rem;
        color: var(--text);
        font-size: 0.95rem;
    }

    dialog button {
        margin-top: 0.5rem;
        border-radius: 0.5rem;
        padding: 0.65rem 1rem;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
    }

    dialog button:active {
        transform: scale(0.98);
    }
</style>
