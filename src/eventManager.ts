import * as vscode from 'vscode';
import * as vscodeUtils from './vscodeUtils';
import * as dataService from './dataService';
import { WebViewProvider } from './webviewProvider'; 
import { FsItem, FsItemType } from './types';

export class EventManager {
    private viewProvider: WebViewProvider; 
    private context: vscode.ExtensionContext;
    private productPath: string | null = null;
    private productId: number | null = null;
    private currentPathTree: { name: string, path: string }[] = [];
    private currentFullTreeData: FsItem[] = []; // DB에서 가져온 전체 데이터를 캐싱

    constructor(context: vscode.ExtensionContext, provider: WebViewProvider) {
        this.context = context;
        this.viewProvider = provider;
        
        // Product Path 초기화
        const workspaceRoot = vscodeUtils.getWorkspaceRootPath();
        if (workspaceRoot) {
            this.productPath = vscodeUtils.getGitRootPath(workspaceRoot);
        }
    }

    public async initialize(): Promise<void> {
        const workspaceRoot = vscodeUtils.getWorkspaceRootPath();
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('WIT: 작업 폴더가 열려있지 않습니다. 먼저 프로젝트 폴더를 열어주세요.');
            return;
        }

        this.productPath = vscodeUtils.getGitRootPath(workspaceRoot);
        if (!this.productPath) {
            vscode.window.showErrorMessage('WIT: 현재 작업 폴더는 Git 저장소가 아닙니다. Git을 초기화해주세요.');
            return;
        }

        const productName = vscodeUtils.getProductNameFromGitConfig(this.productPath);
        if (!productName) {
            vscode.window.showErrorMessage('WIT: .git/config 파일에서 제품 이름을 확인할 수 없습니다. [remote "origin"] 설정을 확인해주세요.');
            return; 
        }

        this.productId = await dataService.getProductId(productName);

        if (this.productId) {
            this.context.subscriptions.push(
                this.viewProvider.onDidReceiveMessage(this.handleWebviewMessage.bind(this)),
                vscode.window.onDidChangeActiveTextEditor(this.handleFileChange.bind(this)),
                vscode.window.onDidChangeTextEditorSelection(this.handleCursorChange.bind(this))
            );
            this.handleFileChange(vscode.window.activeTextEditor);
        } else {
            console.warn("WIT: Product ID를 결정할 수 없어 확장 프로그램이 완전히 활성화되지 않았습니다.");
        }
    }

    private async handleFileChange(editor: vscode.TextEditor | undefined): Promise<void> {
        if (editor && this.productPath) {
            const filePath = editor.document.uri.fsPath;
            const relativePath = vscodeUtils.getRelativePath(this.productPath, filePath);
            this.currentPathTree = vscodeUtils.getPathTree(relativePath);
            await this.updateView([]); 
        }
    }

    private async handleCursorChange(event: vscode.TextEditorSelectionChangeEvent): Promise<void> {
        if (!event.textEditor) return;

        const editor = event.textEditor;
        const position = event.selections[0].active;

        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider', editor.document.uri
        );
        if (!symbols) return;

        // 새로운 함수를 호출하여 심볼 '계층'을 가져옵니다.
        const symbolHierarchy = vscodeUtils.findSymbolHierarchyAtPosition(symbols, position);
        await this.updateView(symbolHierarchy);
    }

    // 웹뷰로부터 메시지를 받는 핸들러
    private async handleWebviewMessage(message: { command: string; path?: string; description?: string }): Promise<void> {
        if (message.command === 'updateDescription' && message.path && message.description !== undefined) {
            // 캐싱된 데이터에서 업데이트할 항목을 찾습니다.
            const itemToUpdate = this.currentFullTreeData.find(item => item.path === message.path);
            if (itemToUpdate && this.productId) {
                itemToUpdate.description = message.description;
                // dataService 호출 시 productId와 전체 item 객체를 넘겨줍니다.
                await dataService.updateInfoInDB(this.productId, itemToUpdate);
            }
        }
    }

    // 뷰 업데이트 로직을 통합
    // 수정 1: 'await'를 사용하므로 함수를 'async'로 선언하고 Promise<void>를 반환하도록 변경
    private async updateView(symbolHierarchy: vscode.DocumentSymbol[]): Promise<void> {
        // 파일 경로 트리를 FsItem 기본 형태로 변환
        let combinedTree: { name: string, path: string, type: FsItemType }[] = this.currentPathTree.map(item => ({
            ...item,
            type: vscodeUtils.determineTypeFromPath(item.path)
        }));

        if (symbolHierarchy.length > 0) {
            let currentSymbolPath = combinedTree[combinedTree.length - 1]?.path || '';
            
            const symbolTree = symbolHierarchy.map(symbol => {
                currentSymbolPath = `${currentSymbolPath}#${symbol.name}`;
                return {
                    name: symbol.name,
                    path: currentSymbolPath,
                    // 심볼 종류를 FsItemType으로 변환하여 할당
                    type: vscodeUtils.convertSymbolKindToFsItemType(symbol.kind)
                };
            });
            combinedTree.push(...symbolTree);
        }
        
        if (this.productId) {
            const fullTreeData = await dataService.getInfosFromDB(this.productId, combinedTree);
            this.currentFullTreeData = fullTreeData; // 결과를 캐싱
            this.viewProvider.updateTree(fullTreeData);
        }
    }
}