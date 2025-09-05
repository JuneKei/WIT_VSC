import { FsItem, FsItemType } from '../src/types'; // FsItem 타입 공유

// VS Code API를 사용하기 위한 선언
declare function acquireVsCodeApi(): { postMessage(message: any): void; };
const vscode = acquireVsCodeApi();

window.addEventListener('message', (event: MessageEvent) => {
    const message = event.data;
    if (message.command === 'updateTree') {
        const container = document.getElementById('file-tree-container');
        if (container) {
            container.innerHTML = '';
            message.data.forEach((item: FsItem, index: number) => {
                container.appendChild(createTreeEntry(item, index));
            });
        }
    }
});

/**
 * FsItem 데이터를 기반으로 트리 항목 DOM 요소를 생성합니다.
 */
function createTreeEntry(item: FsItem, index: number): HTMLDivElement {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'tree-entry';
    
    const header = document.createElement('div');
    header.style.paddingLeft = `${index * 20}px`;
    
    const iconClass = getCodiconNameForType(item.type);
    
    // textContent 대신 innerHTML을 사용하여 아이콘 태그를 렌더링합니다.
    header.innerHTML = `<i class="codicon ${iconClass}"></i> ${item.name} <span class="path-info">[${item.path}]</span>`;

    const description = document.createElement('p');
    description.style.paddingLeft = `${index * 20 + 20}px`; // 아이콘 너비만큼 들여쓰기 추가
    description.appendChild(createEditableDescription(item));
    
    entryDiv.appendChild(header);
    entryDiv.appendChild(description);
    return entryDiv;
}


function getCodiconNameForType(type: FsItemType): string {
    switch (type) {
        case 'folder': return 'codicon-folder';
        case 'file': return 'codicon-file-code';
        case 'class': return 'codicon-symbol-class';
        case 'struct': return 'codicon-symbol-structure';
        case 'function': return 'codicon-symbol-method';
        case 'variable': return 'codicon-symbol-variable';
        case 'enum': return 'codicon-symbol-enum';
        case 'enumMember': return 'codicon-symbol-enum-member';
        case 'namespace': return 'codicon-symbol-namespace';
        case 'field': return 'codicon-symbol-field';
        default: return 'codicon-question';
    }
}
/**
 * 편집 가능한 설명 <span> 요소를 생성하고 이벤트를 바인딩합니다.
 */
function createEditableDescription(item: FsItem): HTMLSpanElement {
    const span = document.createElement('span');
    span.textContent = item.description;
    span.className = 'description-editable';
    // 여러 줄 입력을 위해 white-space 스타일 추가
    span.style.whiteSpace = 'pre-wrap';

    // 클릭하면 편집 모드로 변경
    span.addEventListener('click', () => {
        span.contentEditable = 'true';
        span.focus();
    });

    // 포커스를 잃으면(blur) 저장 메시지를 보냄
    span.addEventListener('blur', () => {
        span.contentEditable = 'false';
        vscode.postMessage({
            command: 'updateDescription',
            path: item.path,
            description: span.textContent || ''
        });
    });

    // --- keydown 이벤트 핸들러 수정 ---
    span.addEventListener('keydown', (event: KeyboardEvent) => {
        // Enter 키만 단독으로 눌렸을 때만 저장
        if (event.key === 'Enter' && !event.shiftKey && !event.altKey) {
            event.preventDefault(); // 기본 동작(줄 바꿈) 방지
            span.blur(); // 저장 트리거
        }
        // Shift+Enter 또는 Alt+Enter가 눌리면 기본 동작(줄 바꿈)이 실행됨
    });

    return span;
}