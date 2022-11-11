// Uses logic from the TABLE NFT SVG color generator: https://github.com/tablelandnetwork/table-nft-svg/blob/main/server/findColor.js
const colors = [
  "0x452858",
  "0x5A2F5A",
  "0x6E365B",
  "0x833D5D",
  "0x98445E",
  "0xAC4B60",
  "0xC15261",
  "0xD65963",
  "0xEA6064",
  "0xFF6766",
];

export default function findColor(rows) {
  let i;
  switch (true) {
    case rows < 9 * 3:
      i = 0;
      break;
    case rows < 20 * 3:
      i = 1;
      break;
    case rows < 50 * 3:
      i = 2;
      break;
    case rows < 100 * 3:
      i = 3;
      break;
    case rows < 200 * 3:
      i = 4;
      break;
    case rows < 500 * 3:
      i = 5;
      break;
    case rows < 1000 * 3:
      i = 6;
      break;
    case rows < 5000 * 3:
      i = 7;
      break;
    case rows < 20000 * 3:
      i = 8;
      break;
    case rows >= 20000 * 3:
      i = 9;
      break;
  }
  return colors[i];
}
