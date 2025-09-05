import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as vscodeUtils from './vscodeUtils'; 
import { FsItem } from './types';

export class WebViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'witView';

    private _view?: vscode.WebviewView;
    private _context: vscode.ExtensionContext;

    // 메시지 전달을 위한 EventEmitter 추가
    private readonly _onDidReceiveMessage = new vscode.EventEmitter<any>();
    public readonly onDidReceiveMessage: vscode.Event<any> = this._onDidReceiveMessage.event;


    constructor(context: vscode.ExtensionContext) {
        this._context = context;
    }

    // 파일/심볼 통합 트리를 업데이트하는 메서드
    public updateTree(treeData: FsItem[]): void { // 타입을 FsItem[]으로 변경
        this._view?.webview.postMessage({ command: 'updateTree', data: treeData });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._context.extensionUri, 'dist'),
                vscode.Uri.joinPath(this._context.extensionUri, 'node_modules')
            ]
        };

        webviewView.webview.onDidReceiveMessage(
            (message: any) => this._onDidReceiveMessage.fire(message)
        );

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    }

    /**
     * 웹뷰에 표시할 HTML 콘텐츠를 생성하고 반환하는 private 메서드입니다.
     * @param webview 현재 웹뷰 객체
     * @returns 완성된 HTML 문자열
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        // index.html 파일의 경로를 가져옵니다.
        const codiconUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css')
        );

        const htmlTemplatePath = vscode.Uri.joinPath(this._context.extensionUri, 'webview', 'index.html').fsPath;
        // 파일을 읽어옵니다.
        let htmlContent = fs.readFileSync(htmlTemplatePath, 'utf8');

        // 스크립트 URI를 생성합니다 (다음 단계를 위해 유지).
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'dist', 'webview', 'main.js')
        );

        // HTML 템플릿에 codiconUri를 주입합니다.
        return htmlContent
            .replace('${webviewScriptUri}', scriptUri.toString())
            .replace('${codiconUri}', codiconUri.toString());
    }
}