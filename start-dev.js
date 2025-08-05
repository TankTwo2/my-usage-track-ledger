const concurrently = require('concurrently');
const path = require('path');

// 개발 모드 환경 변수 설정
process.env.NODE_ENV = 'development';

// React 개발 서버와 Electron을 동시에 실행
concurrently(
    [
        {
            command: 'npm start',
            name: 'react',
            prefixColor: 'blue',
        },
        {
            command: 'wait-on http://localhost:3000 && electron .',
            name: 'electron',
            prefixColor: 'green',
        },
    ],
    {
        prefix: 'name',
        killOthers: ['failure', 'success'],
        restartTries: 3,
    }
).then(
    () => console.log('모든 프로세스가 성공적으로 완료되었습니다.'),
    (error) => console.error('프로세스 실행 중 오류 발생:', error)
);
