import * as vscode from 'vscode';
import { WebViewProvider } from './webviewProvider';
import { EventManager } from './eventManager'; // EventManager import 추가

export async function activate(context: vscode.ExtensionContext) {
    const provider = new WebViewProvider(context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(WebViewProvider.viewType, provider)
    );

    // EventManager를 생성하고 초기화합니다.
    const eventManager = new EventManager(context, provider);
    await eventManager.initialize(); 

    context.subscriptions.push(
        vscode.commands.registerCommand('wit.showPanel', () => {
            vscode.commands.executeCommand('witView.focus');
        })
    );
}