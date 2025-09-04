import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as dataService from './dataService';
import * as vscodeUtils from './vscodeUtils';
import { WebviewViewData } from './types';

/**
 * WIT 패널의 웹뷰 UI를 생성하고 관리하는 Provider 클래스입니다.
 */
export class WitViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'witView';

    private _view?: vscode.WebviewView;
    private _context: vscode.ExtensionContext;

    private readonly _onDidReceiveMessage = new vscode.EventEmitter<any>();
    public readonly onDidReceiveMessage: vscode.Event<any> = this._onDidReceiveMessage.event;

    constructor(context: vscode.ExtensionContext) {
        this._context = context;
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): Promise<void> {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this._context.extensionUri, 'dist')]
        };

        webviewView.webview.onDidReceiveMessage(
            (message: any) => this._onDidReceiveMessage.fire(message),
            undefined,
            this._context.subscriptions
        );

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            this.setLoading(true);
            const filePath = editor.document.uri.fsPath;
            const pathsToQuery = vscodeUtils.getAllParentPaths(filePath);
            const fileTree = await dataService.getInfoFromDB(pathsToQuery);
            this.updateView({ fileTree, selectedSymbol: null });
            this.setLoading(false);
        } else {
            this.updateView({ fileTree: [], selectedSymbol: null });
        }
    }

    public setLoading(isLoading: boolean): void {
        this._view?.webview.postMessage({ command: 'setLoading', isLoading });
    }

    public updateView(data: WebviewViewData): void {
        this._view?.webview.postMessage({ command: 'updateInfo', data });
    }
    
    private _getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'dist', 'webview', 'main.js')
        );
        
        const htmlTemplatePath = vscode.Uri.joinPath(this._context.extensionUri, 'webview', 'index.html').fsPath;
        let htmlContent = fs.readFileSync(htmlTemplatePath, 'utf8');

        return htmlContent.replace('${webviewScriptUri}', scriptUri.toString());
    }
}

