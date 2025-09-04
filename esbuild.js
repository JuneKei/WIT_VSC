const esbuild = require("esbuild");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/** @type {import('esbuild').Plugin} */
const esbuildProblemMatcherPlugin = {
    name: 'esbuild-problem-matcher',
    setup(build) {
        build.onStart(() => {
            console.log('[watch] build started');
        });
        build.onEnd((result) => {
            result.errors.forEach(({ text, location }) => {
                console.error(`✘ [ERROR] ${text}`);
                console.error(`    ${location.file}:${location.line}:${location.column}:`);
            });
            console.log('[watch] build finished');
        });
    },
};

// 백엔드(확장 프로그램) 코드 빌드 설정
const extensionConfig = {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'silent',
    plugins: [esbuildProblemMatcherPlugin],
};

// 프론트엔드(웹뷰) 코드 빌드 설정
const webviewConfig = {
    entryPoints: ['webview/main.ts'],
    bundle: true, // CSS 파일을 JS와 함께 번들링하기 위해 true로 설정
    format: 'esm',
    minify: production,
    sourcemap: !production,
    platform: 'browser',
    outfile: 'dist/webview/main.js',
    logLevel: 'silent',
    plugins: [esbuildProblemMatcherPlugin],
};

async function main() {
    try {
        const extensionCtx = await esbuild.context(extensionConfig);
        const webviewCtx = await esbuild.context(webviewConfig);

        if (watch) {
            await Promise.all([extensionCtx.watch(), webviewCtx.watch()]);
        } else {
            await Promise.all([extensionCtx.rebuild(), webviewCtx.rebuild()]);
            await Promise.all([extensionCtx.dispose(), webviewCtx.dispose()]);
        }
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();

