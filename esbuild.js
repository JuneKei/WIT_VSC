// esbuild 라이브러리를 가져옵니다.
const esbuild = require("esbuild");

// 커맨드 라인 인자를 확인하여 프로덕션 모드인지, watch 모드인지 결정합니다.
const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/** * VS Code의 문제점(Problems) 패널과 연동하기 위한 esbuild 플러그인입니다.
 * 빌드 중 발생하는 에러를 VS Code가 인식할 수 있는 형식으로 출력해줍니다.
 * @type {import('esbuild').Plugin} 
 */
const esbuildProblemMatcherPlugin = {
    name: 'esbuild-problem-matcher',
    setup(build) {
        // 빌드가 시작될 때 콘솔에 메시지를 출력합니다.
        build.onStart(() => {
            console.log('[watch] build started');
        });
        // 빌드가 끝났을 때 결과를 처리합니다.
        build.onEnd((result) => {
            // 에러가 있다면, 각 에러의 내용과 위치(파일, 줄, 열)를 형식에 맞춰 출력합니다.
            result.errors.forEach(({ text, location }) => {
                console.error(`✘ [ERROR] ${text}`);
                console.error(`    ${location.file}:${location.line}:${location.column}:`);
            });
            // 빌드 완료 메시지를 출력합니다.
            console.log('[watch] build finished');
        });
    },
};

// 백엔드(확장 프로그램) 코드의 빌드 설정 객체
const extensionConfig = {
    entryPoints: ['src/extension.ts'], // 빌드를 시작할 진입점 파일
    bundle: true,                      // 모든 의존성 파일을 하나로 합칩니다.
    format: 'cjs',                     // Node.js 환경에서 사용되는 CommonJS 모듈 형식으로 출력합니다.
    minify: production,                // 프로덕션 모드일 때 코드를 압축(최소화)합니다.
    sourcemap: !production,            // 프로덕션 모드가 아닐 때 디버깅을 위한 소스맵을 생성합니다.
    platform: 'node',                  // 실행 환경을 Node.js로 설정합니다.
    outfile: 'dist/extension.js',      // 최종 번들 파일의 출력 경로와 이름
    external: ['vscode'],              // 'vscode' 모듈은 번들에 포함하지 않고, 실행 시 VS Code 환경에서 제공하는 것을 사용하도록 설정합니다.
    logLevel: 'silent',                // esbuild의 기본 로그를 끄고, 플러그인을 통해 로그를 제어합니다.
    plugins: [esbuildProblemMatcherPlugin], // 위에서 정의한 문제점 매처 플러그인을 사용합니다.
};

// 프론트엔드(웹뷰) 코드의 빌드 설정 객체
const webviewConfig = {
    entryPoints: ['webview/main.ts'],   // 웹뷰의 진입점 파일
    bundle: true,                       // 의존성 파일을 하나로 합칩니다.
    format: 'esm',                      // 브라우저에서 사용되는 ES 모듈 형식으로 출력합니다.
    minify: production,                 // 프로덕션 모드일 때 코드 압축
    sourcemap: !production,             // 개발 모드일 때 소스맵 생성
    platform: 'browser',                // 실행 환경을 브라우저로 설정합니다.
    outfile: 'dist/webview/main.js',    // 최종 번들 파일의 출력 경로
    logLevel: 'silent',                 // esbuild 기본 로그 끄기
    plugins: [esbuildProblemMatcherPlugin], // 문제점 매처 플러그인 사용
};

/**
 * 메인 빌드 함수
 */
async function main() {
    try {
        // 각 설정에 대한 esbuild 컨텍스트를 생성합니다. 컨텍스트는 watch나 rebuild 같은 작업을 수행하는 데 사용됩니다.
        const extensionCtx = await esbuild.context(extensionConfig);
        const webviewCtx = await esbuild.context(webviewConfig);

        if (watch) {
            // watch 모드일 경우, 두 컨텍스트 모두에서 파일 변경 감지를 시작합니다.
            await Promise.all([extensionCtx.watch(), webviewCtx.watch()]);
        } else {
            // watch 모드가 아닐 경우, 한 번만 빌드를 수행합니다.
            await Promise.all([extensionCtx.rebuild(), webviewCtx.rebuild()]);
            // 빌드가 끝난 후 컨텍스트 리소스를 정리합니다.
            await Promise.all([extensionCtx.dispose(), webviewCtx.dispose()]);
        }
    } catch (e) {
        // 에러 발생 시 콘솔에 출력하고 프로세스를 종료합니다.
        console.error(e);
        process.exit(1);
    }
}

// 메인 함수를 실행하여 빌드 프로세스를 시작합니다.
main();