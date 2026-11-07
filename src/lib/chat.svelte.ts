interface message {
    msgID: string;
    time: Date;
    msg: string;
    fromPeer: boolean
}

export const messages: message[] = $state([]);

const genId = (len = 6) =>
    Array.from(crypto.getRandomValues(new Uint8Array(len)), (b) =>
        "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]
    ).join("");

export function addMessage(msg: string, time: Date, fromPeer: boolean) {
    console.info('addMessage fired!');
    const msgID = genId();
    messages.push({ msg, time, msgID, fromPeer });
}
