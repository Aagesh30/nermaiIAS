const fs = require('fs');
const { Jimp } = require('jimp');
const jsQR = require('jsqr');

async function decodeQR(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const image = await Jimp.read(buffer);
    const { data, width, height } = image.bitmap;
    const code = jsQR(data, width, height);
    if (code) {
      console.log(`DECODED [${filePath}]: ${code.data}`);
    } else {
      console.log(`FAILED TO DECODE [${filePath}]`);
    }
  } catch (e) {
    console.error(`ERROR [${filePath}]:`, e);
  }
}

async function run() {
  await decodeQR('C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\d57c220e-4af5-44a6-bd41-8331d72749a6\\media__1786344667059.png');
  await decodeQR('C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\d57c220e-4af5-44a6-bd41-8331d72749a6\\media__1786344667226.png');
}

run();
