interface Alert {
    id: ReturnType<typeof crypto.randomUUID>
    type: 'error' | 'warning' | 'info' | 'success';
    msg: string;
}

const alerts: Alert[] = $state([]);
let timeoutID: ReturnType<typeof setTimeout> | null = null;
const duration = 3 * 1000;

function removeFirst() {
    if (timeoutID !== null) return; // timer already running
    if (alerts.length === 0) return; // nothing to delete

    timeoutID = setTimeout(() => {
        alerts.shift();
        timeoutID = null;
        removeFirst();
    }, duration);
}

function pushAlert(type: Alert['type'], msg: Alert['msg']) {
    alerts.push({ id: crypto.randomUUID(), type, msg });
    removeFirst();
}

export { alerts, pushAlert };
export type { Alert };