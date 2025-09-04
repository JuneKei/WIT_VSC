import * as vscode from 'vscode';
import * as path from 'path';

/**
 * 주어진 파일의 절대 경로로부터 프로젝트 루트까지 모든 상위 경로를 계층적으로 계산합니다.
 * 이 함수는 UI에 파일의 컨텍스트(어떤 폴더 구조에 속해 있는지)를 표시하는 데 사용됩니다.
 *
 * @param filePath - 분석할 파일의 절대 경로입니다. (예: /Users/dev/project/src/api/client.ts)
 * @returns 프로젝트 루트부터 현재 파일까지의 상대 경로 배열을 반환합니다.
 * (예: ['src', 'src/api', 'src/api/client.ts'])
 * 워크스페이스에 속하지 않은 파일의 경우, 파일 이름만 포함된 배열을 반환합니다.
 */
export function getAllParentPaths(filePath: string): string[] {
    const fileUri = vscode.Uri.file(filePath);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);

    // 1. 파일이 VS Code 워크스페이스에 속하지 않는 엣지 케이스를 처리합니다.
    if (!workspaceFolder) {
        return [path.basename(filePath)];
    }
    
    // 2. 경로 계산을 위한 초기값 설정
    const rootPath = workspaceFolder.uri.fsPath;
    const paths: string[] = [filePath];
    let currentPath = path.dirname(filePath);

    // 3. 현재 경로가 프로젝트 루트에 도달할 때까지 부모 디렉토리를 순차적으로 배열의 맨 앞에 추가합니다.
    //    `currentPath !== rootPath` 조건은 루프가 루트 폴더에서 멈추도록 합니다.
    while (currentPath.startsWith(rootPath) && currentPath !== rootPath) {
        paths.unshift(currentPath);
        currentPath = path.dirname(currentPath);
    }
    // 4. 마지막으로, 프로젝트 루트 경로를 배열의 가장 앞에 추가합니다.
    paths.unshift(rootPath);
    
    // 5. 모든 절대 경로를 VS Code 워크스페이스 기준의 상대 경로로 변환하여 반환합니다.
    return paths.map(p => vscode.workspace.asRelativePath(p, false));
}

/**
 * 문서의 심볼 트리에서 특정 위치(커서)를 포함하는 가장 안쪽(most specific)의 심볼을
 * 재귀적인 깊이 우선 탐색(DFS)으로 찾습니다.
 *
 * @param symbols - 탐색을 시작할 `DocumentSymbol`의 배열 (또는 자식 심볼 배열)
 * @param position - 찾고자 하는 커서의 위치 (`vscode.Position`)
 * @returns 주어진 위치를 포함하는 가장 안쪽의 `DocumentSymbol`을 반환합니다. 찾지 못하면 `undefined`를 반환합니다.
 */
export function findSymbolAtPosition(symbols: vscode.DocumentSymbol[], position: vscode.Position): vscode.DocumentSymbol | undefined {
    for (const symbol of symbols) {
        // 1. 현재 심볼의 범위가 주어진 위치를 포함하는지 확인합니다.
        if (symbol.range.contains(position)) {
            // 2. 포함한다면, 더 안쪽의 자식 심볼이 있는지 재귀적으로 탐색합니다.
            const deeperSymbol = findSymbolAtPosition(symbol.children, position);
            
            // 3. 재귀 탐색 결과, 더 안쪽의 자식 심볼(deeperSymbol)을 찾았다면 그것이 정답입니다.
            //    찾지 못했다면, 현재 심볼이 이 위치를 포함하는 가장 구체적인 심볼이므로 현재 심볼을 반환합니다.
            return deeperSymbol || symbol;
        }
    }

    // 4. 현재 레벨의 어떤 심볼도 주어진 위치를 포함하지 않으면, 아무것도 반환하지 않습니다.
    return undefined;
}
