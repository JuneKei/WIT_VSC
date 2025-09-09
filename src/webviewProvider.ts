import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as vscodeUtils from './vscodeUtils'; 
import { FsItem } from './types';
import { EventManager } from './eventManager';

export class WebViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'witView';

    private _view?: vscode.WebviewView;
    private _context: vscode.ExtensionContext;
    private _eventManager?: EventManager;

    // 메시지 전달을 위한 EventEmitter 추가
    private readonly _onDidReceiveMessage = new vscode.EventEmitter<any>();
    public readonly onDidReceiveMessage: vscode.Event<any> = this._onDidReceiveMessage.event;


    constructor(context: vscode.ExtensionContext) {
        this._context = context;
    }

    public setEventManager(eventManager: EventManager): void {
        this._eventManager = eventManager;
    }

    public updateTree(treeData: FsItem[]): void {
        // 웹뷰가 실제로 화면에 보일 때만 메시지를 보냅니다.
        if (this._view?.visible) {
            this._view.webview.postMessage({ command: 'updateTree', data: treeData });
        }
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

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible && this._eventManager) {
                // 패널이 다시 보일 때, EventManager에 캐시된 최신 데이터를 가져와 업데이트합니다.
                const lastData = this._eventManager.getCurrentFullTreeData();
                this.updateTree(lastData);
            }
        });
        
        // 웹뷰가 다시 표시될 때 EventManager에 저장된 마지막 데이터를 가져와 복원합니다.
        if (this._eventManager) {
            const lastData = this._eventManager.getCurrentFullTreeData();
            if (lastData && lastData.length > 0) {
                this.updateTree(lastData);
            }
        }
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