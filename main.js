const OAC = OfflineAudioContext;
const context = new OAC(2, 44100 * 40, 44100);

const canvas = document.createElement("canvas");
canvas.width = 1000 * window.devicePixelRatio;
canvas.height = 1000 * window.devicePixelRatio;
canvas.style.width = "1000px";
canvas.style.height = "1000px";
const ctx = canvas.getContext("2d");
document.body.append(canvas);

const BUCKET_SIZE = Math.round(1 + Math.random() * 10);
// const TRACK =
//   "https://cloudflare-ipfs.com/ipfs/QmWKdCra22zqWv8if8JUhbacQEYVVWqF4Avq2p2ESRNf9Q/";
// const TRACK = "poker-face.mp3";
const TRACK = "offspring.ogg";
// const TRACK = `https://cloudflare-ipfs.com/ipfs/QmXEMtojSQnPb2BKEJEKqUPtTbw25BkfBtgmzDNMwUUmqc`;

function getData() {
  const request = new XMLHttpRequest();

  request.open("GET", TRACK, true);

  request.responseType = "arraybuffer";

  request.onload = function () {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var audioData = request.response;
    context.decodeAudioData(audioData, function (buffer) {
      ctx.strokeStyle = "black";
      ctx.lineWidth = window.devicePixelRatio * 2.5;
      ctx.beginPath();
      const data = buffer.getChannelData(0);
      const step = canvas.width / buffer.duration;
      for (let i = 0; i < canvas.width; i += BUCKET_SIZE) {
        const from = ~~((i * data.length) / canvas.width);
        const to = ~~(((i + 1) * data.length) / canvas.width);
        let sum = 0;
        for (let j = from; j < to; j++) {
          sum += data[j];
        }
        const v = (sum * 100000) / (to - from);
        const h = v;
        ctx.moveTo(i, 0.5 * canvas.height - h);
        ctx.lineTo(i, 0.5 * canvas.height + h);
      }
      ctx.stroke();
    });
  };
  request.send();
}

const SIZE = Math.round(canvas.width / BUCKET_SIZE);
const buckets = new Array(SIZE);
const samples = new Array(SIZE);

for (let i = 0; i < SIZE; i++) {
  buckets[i] = 0;
  samples[i] = 0;
}

const a = document.createElement("audio");
a.muted = true;
a.preload = true;
a.src = TRACK;
let duration;
a.addEventListener("loadedmetadata", (e) => {
  duration = e.target.duration;
  console.log(duration);
  e.target.pause();
  delete e.target;
  fetchData();
});

let readerDone = false;
let total = 0;
let decoded = 0;
let acDuration = 0;

function read(reader) {
  reader.read().then(async ({ done, value }) => {
    if (value && value.buffer && value.byteLength > 0) {
      console.log(value);
      total++;
      try {
        decoded++;
        const buffer = await context.decodeAudioData(value.buffer);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const ts = acDuration + (i * buffer.duration) / data.length;
          const ptr = ~~((ts * SIZE) / duration);
          buckets[ptr] += Math.abs(data[i]);
          samples[ptr]++;
        }
        acDuration += buffer.duration;
        console.log(
          "decoded",
          readerDone,
          decoded,
          total,
          acDuration,
          duration
        );
        draw();
      } catch (e) {
        decoded++;
        console.log("error", e, readerDone, decoded, total);
      }
    }
    if (!done) {
      read(reader);
    } else {
      readerDone = true;
      console.log("done");
    }
    // }
  });
}

function readSafari(reader) {
  reader.read().then(async ({ done, value }) => {
    if (value && value.buffer) {
      total++;
      decoded++;
      context.decodeAudioData(
        value.buffer,
        (buffer) => {
          debugger;
          const data = buffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) {
            const ts = acDuration + (i * buffer.duration) / data.length;
            const ptr = ~~((ts * SIZE) / duration);
            buckets[ptr] += Math.abs(data[i]);
            samples[ptr]++;
          }
          acDuration += buffer.duration;
          console.log(
            "decoded",
            readerDone,
            decoded,
            total,
            acDuration,
            duration
          );
          draw();
        },
        (err) => {
          decoded++;
          console.log("error", err, readerDone, decoded, total);
        }
      );
    }
    if (!done) {
      readSafari(reader);
    } else {
      readerDone = true;
      console.log("done");
    }
    // }
  });
}

function draw() {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "black";
  ctx.lineWidth = window.devicePixelRatio * 2.5;
  ctx.beginPath();
  for (let i = 0; i < SIZE; i++) {
    const h = (1000 * buckets[i]) / samples[i];
    const x = i * BUCKET_SIZE;
    ctx.moveTo(x, 0.5 * canvas.height - h);
    ctx.lineTo(x, 0.5 * canvas.height + h);
  }
  ctx.stroke();
}

function fetchData() {
  fetch(TRACK).then(function (response) {
    const reader = response.body.getReader();
    read(reader);
  });
}

// fetchData();
