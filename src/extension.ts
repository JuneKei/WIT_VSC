import * as vscode from 'vscode';
import { WitViewProvider } from './webviewProvider';
import { EventManager } from './eventManager';
import { getProductIdFromDB } from './dataService';

/**
 * 이 함수는 확장이 활성화될 때 호출되는 메인 진입점입니다.
 * @param context 확장 프로그램의 컨텍스트
 */
export function activate(context: vscode.ExtensionContext) {

    // 1. View: 웹뷰 UI를 관리할 WitViewProvider 인스턴스를 생성합니다.
    const provider = new WitViewProvider(context);

    // 2. VS Code에 View를 등록합니다.
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(WitViewProvider.viewType, provider)
    );

    // 3. Controller: View를 제어할 EventManager 인스턴스를 생성하고 초기화합니다.
    // WitViewProvider 인스턴스(provider)를 EventManager의 생성자에 주입(inject)하여
    // Controller가 View를 제어할 수 있도록 합니다.
    const eventManager = new EventManager(context, provider);
    eventManager.initialize();

    getProductIdFromDB();
    
    // 4. 사용자가 패널을 열 수 있도록 명령(Command)을 등록합니다.
    context.subscriptions.push(
        vscode.commands.registerCommand('wit-ts.showPanel', () => {
            // 'witView.focus'는 VS Code가 자동으로 생성해주는 내장 명령어입니다.
            vscode.commands.executeCommand('witView.focus');
        })
    );

    console.log('WIT extension is now active!');
}

/**
 * 이 함수는 확장이 비활성화될 때 호출됩니다.
 * 리소스 정리는 context.subscriptions가 자동으로 처리합니다.
 */
export function deactivate() {}
