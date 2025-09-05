import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs'; // fs 모듈 추가
import type { FsItemType } from './types';

/**
 * 현재 열려있는 VS Code 작업 공간의 루트 경로를 반환합니다.
 * @returns 프로젝트 루트 경로 문자열 또는 열려있는 폴더가 없으면 null
 */
export function getWorkspaceRootPath(): string | null {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        return workspaceFolders[0].uri.fsPath;
    }
    return null;
}

/**
 * 주어진 경로에서부터 상위로 올라가며 .git 폴더를 찾습니다.
 * @param startPath 검색을 시작할 경로
 * @returns .git 폴더를 포함하는 디렉토리의 절대 경로, 찾지 못하면 null
 */
export function getGitRootPath(startPath: string): string | null {
    let currentPath = startPath;
    // 최상위 디렉토리(/ 또는 C:\)에 도달할 때까지 반복
    while (path.dirname(currentPath) !== currentPath) {
        const gitPath = path.join(currentPath, '.git');
        // .git 폴더가 존재하는지 확인
        if (fs.existsSync(gitPath) && fs.lstatSync(gitPath).isDirectory()) {
            return currentPath; // .git 폴더가 있는 현재 경로를 반환
        }
        currentPath = path.dirname(currentPath); // 한 단계 상위 폴더로 이동
    }
    return null; // .git 폴더를 찾지 못함
}

/**
 * .git/config 파일에서 [remote "origin"]의 URL을 파싱하여 Product 이름을 추출합니다.
 * @param gitRootPath .git 폴더가 있는 최상위 경로
 * @returns Product 이름 (예: 'test') 또는 null
 */
export function getProductNameFromGitConfig(gitRootPath: string): string | null {
    try {
        const configPath = path.join(gitRootPath, '.git', 'config');
        if (!fs.existsSync(configPath)) {
            return null;
        }

        const configContent = fs.readFileSync(configPath, 'utf8');
        const lines = configContent.split(/\r?\n/);
        
        let inOriginSection = false;
        for (const line of lines) {
            if (line.trim() === '[remote "origin"]') {
                inOriginSection = true;
                continue;
            }

            if (inOriginSection) {
                if (line.trim().startsWith('url =')) {
                    const url = line.split('=')[1].trim();
                    const lastPart = url.split('/').pop() || '';
                    return lastPart.replace('.git', '');
                }
                // 다른 섹션이 시작되면 중단
                if (line.trim().startsWith('[')) {
                    break;
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Error reading .git/config:", error);
        return null;
    }
}

/**
 * 기본 경로(basePath)에 대한 대상 경로(targetPath)의 상대 경로를 계산합니다.
 * @param basePath 기준이 되는 경로 (예: Git 루트)
 * @param targetPath 상대 경로를 계산할 대상 파일 경로
 * @returns 계산된 상대 경로
 */
export function getRelativePath(basePath: string, targetPath: string): string {
    return path.relative(basePath, targetPath);
}

/**
 * 파일 경로를 트리 구조에 맞는 객체 배열로 변환합니다.
 * @param relativePath 변환할 상대 경로 (예: 'a/b/c')
 * @returns { name: string, path: string } 형태의 객체 배열
 */
export function getPathTree(relativePath: string): { name: string, path: string }[] {
    const parts = relativePath.split(path.sep);
    let currentPath = '';
    return parts.map(part => {
        currentPath = path.join(currentPath, part);
        return {
            name: part,
            path: currentPath
        };
    });
}

/**
 * 문서의 심볼 트리에서 특정 위치(커서)를 포함하는 가장 안쪽의 심볼을
 * 재귀적인 깊이 우선 탐색(DFS)으로 찾습니다.
 *
 * @param symbols - 탐색을 시작할 `DocumentSymbol`의 배열
 * @param position - 찾고자 하는 커서의 위치 (`vscode.Position`)
 * @returns 주어진 위치를 포함하는 가장 안쪽의 `DocumentSymbol` 또는 `undefined`
 */
export function findSymbolAtPosition(symbols: vscode.DocumentSymbol[], position: vscode.Position): vscode.DocumentSymbol | undefined {
    for (const symbol of symbols) {
        // 1. 현재 심볼의 범위가 주어진 위치를 포함하는지 확인합니다.
        if (symbol.range.contains(position)) {
            // 2. 포함한다면, 더 안쪽의 자식 심볼이 있는지 재귀적으로 탐색합니다.
            const deeperSymbol = findSymbolAtPosition(symbol.children, position);
            // 3. 더 안쪽 심볼이 있으면 그것을 반환하고, 없으면 현재 심볼을 반환합니다.
            return deeperSymbol || symbol;
        }
    }
    return undefined; // 위치를 포함하는 심볼을 찾지 못함
}

/**
 * 문서 심볼 트리에서 특정 위치를 포함하는 모든 심볼의 계층을 재귀적으로 찾습니다.
 * @param symbols 탐색할 `DocumentSymbol` 배열
 * @param position 찾고자 하는 커서의 위치
 * @returns [부모심볼, 자식심볼, ...] 형태의 계층 배열
 */
export function findSymbolHierarchyAtPosition(symbols: vscode.DocumentSymbol[], position: vscode.Position): vscode.DocumentSymbol[] {
    for (const symbol of symbols) {
        if (symbol.range.contains(position)) {
            // 자식 심볼에서 더 깊은 계층을 재귀적으로 탐색합니다.
            const childHierarchy = findSymbolHierarchyAtPosition(symbol.children, position);
            // 현재 심볼과 자식 심볼 계층을 합쳐서 반환합니다.
            return [symbol, ...childHierarchy];
        }
    }
    return []; // 해당 위치를 포함하는 심볼이 없으면 빈 배열 반환
}

/**
 * VS Code의 SymbolKind를 FsItemType으로 변환합니다.
 * @param kind 변환할 SymbolKind
 * @returns FsItemType 문자열
 */
export function convertSymbolKindToFsItemType(kind: vscode.SymbolKind): FsItemType {
    switch (kind) {
        case vscode.SymbolKind.File: return 'file';
        case vscode.SymbolKind.Namespace: return 'namespace';
        case vscode.SymbolKind.Class: return 'class';
        case vscode.SymbolKind.Struct: return 'struct';
        case vscode.SymbolKind.Enum: return 'enum';
        case vscode.SymbolKind.EnumMember: return 'enumMember';
        case vscode.SymbolKind.Function:
        case vscode.SymbolKind.Method:
        case vscode.SymbolKind.Constructor:
            return 'function';
        case vscode.SymbolKind.Variable: return 'variable';
        case vscode.SymbolKind.Field: return 'field';
        default: return 'unknown';
    }
}

/**
 * 경로 문자열을 기반으로 아이템의 타입을 결정합니다. (폴더 또는 파일)
 */
export function determineTypeFromPath(p: string): FsItemType {
    if (p.includes('#')) return 'unknown'; // 심볼은 SymbolKind로 처리해야 함
    if (path.extname(p)) return 'file';
    return 'folder';
}