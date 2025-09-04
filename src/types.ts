/**
 * WIT 패널에 표시될 수 있는 파일 시스템 아이템의 종류를 정의하는 열거형 타입입니다.
 * 문자열 리터럴 유니언 타입을 사용하여 허용된 값의 범위를 엄격하게 제한합니다.
 */
export type FsItemType = 'folder' | 'file' | 'function' | 'variable' | 'class' | 'unknown';

/**
 * 파일, 폴더, 코드 심볼 등 파일 시스템의 개별 아이템을 나타내는 핵심 데이터 구조입니다.
 */
export interface FsItem {
    /** UI에 표시될 아이템의 이름입니다. (예: 'dataService.ts', 'getInfoFromDB') */
    name: string;
    /** 아이템의 종류를 나타냅니다. (FsItemType 중 하나) */
    type: FsItemType;
    /** 프로젝트 루트를 기준으로 하는 상대 경로이며, 아이템의 고유 식별자로 사용됩니다. */
    path: string;
    /** 사용자가 편집할 수 있는 아이템의 설명입니다. */
    description: string;
}

/**
 * 백엔드(확장 프로그램)에서 프론트엔드(웹뷰)로 전달되는 전체 뷰(View)의 상태를 정의합니다.
 * 이 구조는 UI를 렌더링하는 데 필요한 모든 정보를 포함합니다.
 */
export interface WebviewViewData {
    /** 현재 활성화된 파일을 기준으로 한 폴더/파일의 계층 구조입니다. */
    fileTree: FsItem[];
    /** 현재 커서가 위치한 코드 심볼의 정보입니다. 심볼이 없으면 null입니다. */
    selectedSymbol: FsItem | null;
}
