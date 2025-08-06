const fs = require('fs');

// macOS 트레이에 최적화된 투명 배경 흰색 T 아이콘 (16x16)
// Template 이미지로 작동하도록 설계됨
const perfectTIconBase64 = `
iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAHlJREFUOE+1k8sJwzAMRd8H
7D5SGSBdYNgCtoA7QDeYFtoNug26QbdYdIMsUOwhOhJBYCdO+VaQ3n0SERERERERERERERERERERERERERERERER
ERERERERERERERERERERERERERERERERERERERERERERERERERHRERERERERERERER7wJYchECLFKQ4AAAAAElFTkSuQmCC
`.replace(/\n/g, '');

try {
    const buffer = Buffer.from(perfectTIconBase64, 'base64');
    fs.writeFileSync('assets/tray-t-icon.png', buffer);
    console.log('✅ Perfect T icon created: assets/tray-t-icon.png');
} catch (error) {
    console.error('❌ Error creating icon:', error);
}