// lib/webrtc.svelte.ts

type SignalMessage =
  | { type: "offer"; offer: RTCSessionDescriptionInit }
  | { type: "answer"; answer: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; candidate: RTCIceCandidateInit };

export interface WebRTCCallbacks {
  onSignal: (data: SignalMessage) => void;
  onRemoteTrack: (stream: MediaStream, kind: "audio" | "video") => void;
  onRemoteTrackRemoved: (kind: "audio" | "video", stream: MediaStream | null) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onConnected: () => void;
  onClosed: () => void;
}

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export class WebRTCConnection {
  #pc: RTCPeerConnection | null = $state(null);
  #connectionState: RTCPeerConnectionState | "NA" = $state("NA");
  #remoteStream: MediaStream | null = $state(null);

  private isInitiator = false;
  private makingOffer = false;
  private ignoreOffer = false;
  private remoteDescSet = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private callbacks: WebRTCCallbacks;

  private get polite() {
    return !this.isInitiator;
  }

  constructor(callbacks: WebRTCCallbacks) {
    this.callbacks = callbacks;
  }

  setInitiator(isInitiator: boolean) {
    this.isInitiator = isInitiator;
  }

  get pc(): RTCPeerConnection | null {
    return this.#pc;
  }


  get connectionState(): RTCPeerConnectionState | "NA" {
    return this.#connectionState;
  }

  get remoteStream(): MediaStream | null {
    return this.#remoteStream;
  }

 
  init() {
    this.#pc = new RTCPeerConnection(rtcConfig);
    this.#pc.onicecandidate = this.handleICECandidateEvent;
    this.#pc.ontrack = this.handleTrackEvent;
    this.#pc.onconnectionstatechange = this.handleConnectionStateChangeEvent;
    this.#pc.onnegotiationneeded = this.handleNegotiationNeededEvent;
    return this.#pc;
  }

  addTrack(track: MediaStreamTrack, stream: MediaStream) {
    if (!this.#pc) this.init();
    return this.#pc!.addTrack(track, stream);
  }

  removeTrack(sender: RTCRtpSender) {
    this.#pc?.removeTrack(sender);
  }

  getSenders() {
    return this.#pc?.getSenders() ?? [];
  }

  async replaceTrack(kind: "audio" | "video", track: MediaStreamTrack) {
    const sender = this.#pc?.getSenders().find((s) => s.track?.kind === kind);
    await sender?.replaceTrack(track);
  }

  async startCall(localStream: MediaStream) {
    if (!this.#pc) this.init();
    localStream.getTracks().forEach((track) => {
      this.#pc!.addTrack(track, localStream);
    });

    const offer = await this.#pc!.createOffer();
    await this.#pc!.setLocalDescription(offer);
    this.callbacks.onSignal({ type: "offer", offer });
  }

  async handleSignal(msg: SignalMessage, localStream: MediaStream | null) {
    if (this.#pc === null) this.init();
    const pc = this.#pc!;

    if (msg.type === "offer") {
      const offerCollision =
        this.makingOffer || pc.signalingState !== "stable";

      this.ignoreOffer = !this.polite && offerCollision;
      if (this.ignoreOffer) return;

      if (offerCollision) {
        await pc.setLocalDescription({ type: "rollback" });
      }

      if (!localStream) {
        console.error("stream is undefined");
        return;
      }

      localStream.getTracks().forEach((track) => {
        const alreadySent = pc.getSenders().some((s) => s.track === track);
        if (!alreadySent) pc.addTrack(track, localStream);
      });

      await pc.setRemoteDescription(msg.offer);
      this.remoteDescSet = true;
      for (const c of this.pendingCandidates) await pc.addIceCandidate(c);
      this.pendingCandidates = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.callbacks.onSignal({ type: "answer", answer: pc.localDescription! });
    } else if (msg.type === "answer") {
      await pc.setRemoteDescription(msg.answer);
      this.remoteDescSet = true;
      for (const c of this.pendingCandidates) await pc.addIceCandidate(c);
      this.pendingCandidates = [];
    } else if (msg.type === "ice-candidate") {
      try {
        if (this.remoteDescSet) {
          await pc.addIceCandidate(msg.candidate);
        } else {
          this.pendingCandidates.push(msg.candidate);
        }
      } catch (err) {
        if (!this.ignoreOffer) throw err;
      }
    }
  }

  close() {
    if (!this.#pc) return;
    this.#pc.onicecandidate = null;
    this.#pc.ontrack = null;
    this.#pc.onconnectionstatechange = null;
    this.#pc.onnegotiationneeded = null;

    this.#remoteStream?.getTracks().forEach((track) => track.stop());
    this.#remoteStream = null;
    this.#connectionState = "NA";
    this.makingOffer = false;
    this.remoteDescSet = false;
    this.pendingCandidates = [];
    this.ignoreOffer = false;

    this.#pc.close();
    this.#pc = null;

    this.callbacks.onClosed();
  }

  private handleICECandidateEvent = (e: RTCPeerConnectionIceEvent) => {
    if (e.candidate) {
      this.callbacks.onSignal({
        type: "ice-candidate",
        candidate: e.candidate.toJSON(),
      });
    }
  };

  private handleTrackEvent = (trackEv: RTCTrackEvent) => {
    if (!this.#remoteStream) this.#remoteStream = trackEv.streams[0];
    const kind = trackEv.track.kind as "audio" | "video";
    this.callbacks.onRemoteTrack(this.#remoteStream, kind);

    this.#remoteStream.onremovetrack = (e) => {
      this.callbacks.onRemoteTrackRemoved(
        e.track.kind as "audio" | "video",
        this.#remoteStream,
      );
    };
  };

  private handleNegotiationNeededEvent = async () => {
    try {
      this.makingOffer = true;
      const offer = await this.#pc!.createOffer();
      await this.#pc!.setLocalDescription(offer);
      this.callbacks.onSignal({ type: "offer", offer });
    } catch (err) {
      console.error(err);
    } finally {
      this.makingOffer = false;
    }
  };

  private handleConnectionStateChangeEvent = () => {
    if (!this.#pc) return;
    this.#connectionState = this.#pc.connectionState;
    this.callbacks.onConnectionStateChange(this.#connectionState);

    switch (this.#connectionState) {
      case "connected":
        this.callbacks.onConnected();
        break;
      case "failed":
        this.#pc.restartIce();
        break;
      case "disconnected":
      case "closed":
        this.close();
        break;
    }
  };
}

export type { SignalMessage };