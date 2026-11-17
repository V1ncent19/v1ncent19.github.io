const musicUrl = "/assets/playground/sundial/uzumakinoharu-loop.mp3";

export function createSundialMusic() {
  const context = new AudioContext();
  const gain = context.createGain();
  const abort = new AbortController();
  let decoded: Promise<AudioBuffer> | undefined;
  let buffer: AudioBuffer | undefined;
  let source: AudioBufferSourceNode | undefined;
  let suspendTimer: number | undefined;
  gain.gain.value = 0;
  gain.connect(context.destination);

  async function load() {
    try {
      const response = await fetch(musicUrl, { signal: abort.signal });
      if (!response.ok) throw new Error(`Playground music returned ${response.status}`);
      return await context.decodeAudioData(await response.arrayBuffer());
    } catch (error) {
      decoded = undefined;
      throw error;
    }
  }

  function fade(volume: number, timeConstant: number) {
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(volume, now, timeConstant);
  }

  async function prepare() {
    window.clearTimeout(suspendTimer);
    [, buffer] = await Promise.all([context.resume(), decoded ??= load()]);
  }

  function startPrepared() {
    if (!buffer || abort.signal.aborted || context.state !== "running") return false;
    if (!source) {
      source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.loopEnd = buffer.duration;
      source.connect(gain);
      source.start();
    }
    fade(.24, .10);
    return true;
  }

  return {
    prepare,
    startPrepared,
    async play() {
      await prepare();
      if (!startPrepared()) throw new Error("Playground music could not start");
    },
    pause(duration = 300) {
      window.clearTimeout(suspendTimer);
      fade(0, duration / 5500);
      suspendTimer = window.setTimeout(() => { void context.suspend().catch(() => {}); }, duration);
    },
    dispose() {
      window.clearTimeout(suspendTimer);
      abort.abort();
      void context.close().catch(() => {});
    },
  };
}
