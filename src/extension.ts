import * as vscode from 'vscode';
import { WebViewProvider } from './webviewProvider';
import { EventManager } from './eventManager'; // EventManager import 추가

export async function activate(context: vscode.ExtensionContext) {
    const provider = new WebViewProvider(context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(WebViewProvider.viewType, provider)
    );

    const eventManager = new EventManager(context, provider);
    await eventManager.initialize(); 

    // 생성된 eventManager 인스턴스를 provider에 설정합니다.
    provider.setEventManager(eventManager);

    context.subscriptions.push(
        vscode.commands.registerCommand('wit.showPanel', () => {
            vscode.commands.executeCommand('witView.focus');
        })
    );
}