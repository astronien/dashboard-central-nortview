import fs from 'fs';
import https from 'https';
const download = (url: string, dest: string) => {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      if (res.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => { file.close(resolve); });
      } else {
        reject(`Status: ${res.statusCode}`);
      }
    }).on('error', reject);
  });
};
async function main() {
  await download('https://www.pngall.com/wp-content/uploads/2016/04/Happy-Person-Free-Download-PNG.png', 'public/person1.png').catch(e => console.error(e));
  await download('https://www.pngall.com/wp-content/uploads/2016/04/Happy-Person-Free-PNG-Image.png', 'public/person2.png').catch(e => console.error(e));
  await download('https://www.pngall.com/wp-content/uploads/2016/04/Happy-Person-PNG-Pic.png', 'public/person3.png').catch(e => console.error(e));
  console.log('Done');
}
main();
