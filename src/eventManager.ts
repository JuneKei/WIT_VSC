import * as vscode from 'vscode';
import * as dataService from './dataService';
import * as vscodeUtils from './vscodeUtils';
import { WitViewProvider } from './webviewProvider';
import { FsItem } from './types';

export class EventManager {
    private currentFileTree: FsItem[] = [];
    private currentSelectedSymbol: FsItem | null = null;
    private viewProvider: WitViewProvider;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext, provider: WitViewProvider) {
        this.context = context;
        this.viewProvider = provider;
    }

    public initialize(): void {
        this.context.subscriptions.push(
            this.viewProvider.onDidReceiveMessage((message: { command: string; path?: string; description?: string }) => {
                this.handleWebviewMessage(message);
            }),
            vscode.window.onDidChangeActiveTextEditor(this.handleFileChange.bind(this)),
            vscode.window.onDidChangeTextEditorSelection(this.handleCursorChange.bind(this))
        );
    }

    private async handleFileChange(editor: vscode.TextEditor | undefined): Promise<void> {
        if (!editor) {
            return;
        }

        this.viewProvider.setLoading(true);
        try {
            const filePath = editor.document.uri.fsPath;
            const pathsToQuery = vscodeUtils.getAllParentPaths(filePath);

            this.currentFileTree = await dataService.getInfoFromDB(pathsToQuery);
            this.currentSelectedSymbol = null;
            this.updateView();
        } catch(error) {
            console.error("Error handling file change:", error);
        } finally {
            this.viewProvider.setLoading(false);
        }
    }

    private async handleCursorChange(event: vscode.TextEditorSelectionChangeEvent): Promise<void> {
        const { textEditor: editor, selections } = event;
        if (!editor || selections.length === 0 || this.currentFileTree.length === 0) {
            return;
        }

        const position = selections[0].active;
        const newSymbol = await this.findSymbolAt(editor.document, position);

        if (this.currentSelectedSymbol?.path !== newSymbol?.path) {
            this.currentSelectedSymbol = newSymbol;
            this.updateView();
        }
    }

    private async handleWebviewMessage(message: { command: string; path?: string; description?: string }): Promise<void> {
        if (message.command === 'updateDescription' && message.path && message.description !== undefined) {
            await dataService.updateInfoInDB(message.path, message.description);
            this.updateLocalCache(message.path, message.description);
            this.updateView();
        }
    }

    private async findSymbolAt(document: vscode.TextDocument, position: vscode.Position): Promise<FsItem | null> {
        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            document.uri
        );

        if (!symbols || !Array.isArray(symbols)) return null;

        const symbolAtPosition = vscodeUtils.findSymbolAtPosition(symbols, position);
        if (!symbolAtPosition) return null;
        
        const symbolPath = `${vscode.workspace.asRelativePath(document.uri)}#${symbolAtPosition.name}`;
        const [symbolInfo] = await dataService.getInfoFromDB([symbolPath]);
        return symbolInfo || null;
    }

    private updateLocalCache(path: string, description: string): void {
        const itemInTree = this.currentFileTree.find(item => item.path === path);
        if (itemInTree) {
            itemInTree.description = description;
        }
        if (this.currentSelectedSymbol?.path === path) {
            this.currentSelectedSymbol.description = description;
        }
    }

    private updateView(): void {
        this.viewProvider.updateView({
            fileTree: this.currentFileTree,
            selectedSymbol: this.currentSelectedSymbol
        });
    }
}

