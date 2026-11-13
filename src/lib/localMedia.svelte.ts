import { pushAlert } from "./alerts.svelte";
import type { WebRTCConnection } from "./webrtc.svelte";

class LocalMedia {
    #localVideoElement: HTMLVideoElement | null = null;
    #localStream = $state.raw<MediaStream | null>(null);
    #localVideoPlaying = $state(false);
    #localAudioPlaying = $state(false);
    #selectedAudioInput = $state("");
    #selectedAudioOutput = $state("");
    #selectedVideoInput = $state("");
    #audioInputDevices: MediaDeviceInfo[] = $state([]);
    #audioOutputDevices: MediaDeviceInfo[] = $state([]);
    #videoInputDevices: MediaDeviceInfo[] = $state([]);

    set localVideoElement(el: HTMLVideoElement | null) { this.#localVideoElement = el; this.#refreshVideo() }
    get localStream() { return this.#localStream; }
    get localVideoPlaying() { return this.#localVideoPlaying; }
    get localAudioPlaying() { return this.#localAudioPlaying; }
    get selectedAudioInput() { return this.#selectedAudioInput; }
    get selectedAudioOutput() { return this.#selectedAudioOutput; }
    set selectedAudioOutput(deviceID: string) { this.#selectedAudioOutput = deviceID }
    get selectedVideoInput() { return this.#selectedVideoInput; }
    get audioInputDevices() { return this.#audioInputDevices; }
    get audioOutputDevices() { return this.#audioOutputDevices; }
    get videoInputDevices() { return this.#videoInputDevices; }


    #removeFromRtc(rtc: WebRTCConnection, tracks: MediaStreamTrack[]) {
        const senders = rtc.getSenders();
        tracks.forEach((t) => {
            const sender = senders.find((s) => s.track === t);
            if (sender) rtc.removeTrack(sender);
        });
    }
    #refreshVideo() {
        if (this.#localVideoElement) this.#localVideoElement.srcObject = this.#localStream;
    }
    async getStream() {
        try {
            this.#localStream = await navigator.mediaDevices.getUserMedia({
                audio: true, video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },

                }
            });
            this.#localVideoPlaying = true;
            this.#localAudioPlaying = true;
            this.#refreshVideo()
            await this.#getDevices();
        } catch (error) {
            pushAlert("error", "Error while creating stream");
            this.#localVideoPlaying = false;
            this.#localAudioPlaying = false;
        }
    }

    async #getDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.#audioInputDevices = devices.filter((d) => d.kind === "audioinput");
            this.#audioOutputDevices = devices.filter((d) => d.kind === "audiooutput");
            this.#videoInputDevices = devices.filter((d) => d.kind === "videoinput");

            const audioId = this.#localStream?.getAudioTracks()[0]?.getSettings().deviceId;
            const videoId = this.#localStream?.getVideoTracks()[0]?.getSettings().deviceId;

            this.#selectedAudioInput = audioId ?? this.#audioInputDevices[0]?.deviceId ?? "";
            this.#selectedVideoInput = videoId ?? this.#videoInputDevices[0]?.deviceId ?? "";
            this.#selectedAudioOutput = this.#audioOutputDevices[0]?.deviceId ?? "";
        } catch (error) {
            console.error((error as Error).message);
        }
    }
    toggleVideo = async (rtc: WebRTCConnection): Promise<MediaStreamTrack | null> => {
        if (!this.#localStream) {
            console.error("local stream is null.");
            return null;
        }

        if (this.#localVideoPlaying) {
            const tracks = this.#localStream.getVideoTracks();
            this.#removeFromRtc(rtc, tracks);
            tracks.forEach((t) => {
                t.stop();
                this.#localStream!.removeTrack(t);
            });
            this.#localVideoPlaying = false;
            this.#refreshVideo()
            return null;
        }

        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: this.#selectedVideoInput
                    ? {
                        deviceId: { exact: this.#selectedVideoInput },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    }
                    : {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    },
            });
            const track = s.getVideoTracks()[0];
            this.#localStream.addTrack(track);
            this.#refreshVideo()
            this.#localVideoPlaying = true;
            return track;
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    toggleAudio = async (rtc: WebRTCConnection): Promise<MediaStreamTrack | null> => {
        if (!this.#localStream) {
            console.error("local stream is null.");
            return null;
        }

        if (this.#localAudioPlaying) {
            const tracks = this.#localStream.getAudioTracks();
            this.#removeFromRtc(rtc, tracks);

            tracks.forEach((t) => {
                t.stop();
                this.#localStream!.removeTrack(t);
            });
            this.#localAudioPlaying = false;
            return null;
        }

        try {
            const s = await navigator.mediaDevices.getUserMedia({
                audio: this.#selectedAudioInput
                    ? { deviceId: { exact: this.#selectedAudioInput } }
                    : true,
            });
            const track = s.getAudioTracks()[0];
            this.#localStream.addTrack(track);
            this.#localAudioPlaying = true;
            return track;
        } catch (error) {
            console.error(error);
            return null;
        }
    };
    changeAudioInput = async (deviceId: string): Promise<MediaStreamTrack | null> => {
        if (!this.#localAudioPlaying || !this.#localStream) {
            console.warn("Can't change audio input while muted.");
            return null;
        }
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: { exact: deviceId },
                },
            });
            const track = audioStream.getAudioTracks()[0];
            const old = this.#localStream.getAudioTracks()[0];
            old?.stop();
            if (old) this.#localStream.removeTrack(old);
            this.#localStream.addTrack(track);
            this.#selectedAudioInput = deviceId;
            return track;
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    changeVideoInput = async (deviceId: string): Promise<MediaStreamTrack | null> => {
        if (!this.#localVideoPlaying || !this.#localStream) {
            console.warn("Can't change video input while video is off.");
            return null;
        }
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: { exact: deviceId },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
            });
            const track = videoStream.getVideoTracks()[0];
            const old = this.#localStream.getVideoTracks()[0];
            old?.stop();
            if (old) this.#localStream.removeTrack(old);
            this.#localStream.addTrack(track);
            this.#selectedVideoInput = deviceId;
            return track;
        } catch (error) {
            console.error(error);
            return null;
        }
    };
}

export const media = new LocalMedia();

