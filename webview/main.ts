import { FsItem, FsItemType, WebviewViewData } from '../src/types';


declare function acquireVsCodeApi(): {
    postMessage(message: any): void;
};

const vscode = acquireVsCodeApi();

// --- 로딩 관련 상태가 제거된 단순화된 상태 객체 ---
const state: {
    fileTree: FsItem[];
    selectedSymbol: FsItem | null;
} = {
    fileTree: [],
    selectedSymbol: null,
};

/**
 * UI의 DOM 요소 참조와 화면 상태(비어있음, 정보) 전환을 관리하는 객체입니다.
 */
const UIManager = {
    elements: {
        info: document.getElementById('info-container') as HTMLDivElement,
    },

    /**
     * 현재 상태에 맞는 UI 화면을 표시합니다.
     * @param viewToShow 'empty' 또는 'info'
     */
    showView(viewToShow: 'info'): void {
        this.elements.info.style.display = viewToShow === 'info' ? 'block' : 'none';
    },

    /**
     * 정보 컨테이너를 FsItem 데이터로 채웁니다.
     */
    renderInfo(fileTree: FsItem[], selectedSymbol: FsItem | null): void {
        this.elements.info.innerHTML = '';
        fileTree.forEach((item, index) => {
            const entryDiv = createInfoEntry(item, index, false);
            this.elements.info.appendChild(entryDiv);
        });
        if (selectedSymbol) {
            const symbolDiv = createInfoEntry(selectedSymbol, fileTree.length, true);
            this.elements.info.appendChild(symbolDiv);
        }
    }
};

/**
 * 백엔드(확장 프로그램)로부터 메시지를 수신하는 메인 리스너입니다.
 */
window.addEventListener('message', (event: MessageEvent<{ command: string; data?: WebviewViewData }>) => {
    const message = event.data;
    if (message.command === 'updateInfo' && message.data) {
        state.fileTree = message.data.fileTree || [];
        state.selectedSymbol = message.data.selectedSymbol || null;
        render();
    }
});

/**
 * 현재 `state` 객체를 기반으로 UI를 다시 그리는 메인 함수입니다.
 */
function render(): void {
    UIManager.showView('info');
    UIManager.renderInfo(state.fileTree, state.selectedSymbol);
}

/**
 * FsItem 데이터를 기반으로 정보 항목 UI(DOM 요소)를 생성합니다.
 */
function createInfoEntry(item: FsItem, index: number, isSymbol: boolean): HTMLDivElement {
    const entryDiv = document.createElement('div');
    entryDiv.className = isSymbol ? 'info-entry symbol-entry' : 'info-entry';
    entryDiv.style.paddingLeft = `${index * 20}px`;
    entryDiv.dataset.path = item.path;

    const header = document.createElement('h3');
    header.style.margin = '0';
    header.innerHTML = `${getIconForItem(item)} ${item.name} <span class="path-info">[${item.path}]</span>`;
    
    const descPara = document.createElement('p');
    descPara.style.margin = '0';
    descPara.innerHTML = `<strong>설명:</strong> `;
    descPara.appendChild(createDescriptionElement(item.description, item.path));

    entryDiv.appendChild(header);
    entryDiv.appendChild(descPara);

    return entryDiv;
}

/**
 * 클릭 또는 더블클릭 시 편집 가능한 설명 <span> 요소를 생성하고 관련 이벤트를 바인딩합니다.
 */
function createDescriptionElement(initialValue: string, path: string): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = 'description-editable';
    span.textContent = initialValue || '아직 등록된 설명이 없습니다. 클릭하여 추가하세요.';
    span.dataset.path = path;
    span.tabIndex = 0; 

    const enterEditMode = () => {
        if (span.contentEditable === 'true') return;
        span.contentEditable = 'true';
        span.focus();
    };

    span.addEventListener('click', enterEditMode);
    span.addEventListener('dblclick', enterEditMode);

    span.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            (event.target as HTMLElement).blur();
        }
    });

    // 저장
    span.addEventListener('blur', () => {
        span.contentEditable = 'false';
        const newDescription = span.textContent || '';
        if (span.dataset.path) {
            vscode.postMessage({
                command: 'updateDescription',
                path: span.dataset.path,
                description: newDescription
            });
        }
    });

    return span;
}

/** 항목 타입에 맞는 아이콘 이모지를 반환합니다. */
function getIconForItem(item: FsItem): string {
    const icons: { [key in FsItemType]?: string } = {
        'folder': '📁',
        'file': '📄',
        'function': 'ƒ',
        'variable': 'x',
        'class': 'C'
    };
    return icons[item.type] || '❓';
}

// DOM 로드가 완료되면, 백엔드를 기다리지 않고 즉시 초기 UI(빈 화면)를 표시합니다.
window.addEventListener('DOMContentLoaded', render);

