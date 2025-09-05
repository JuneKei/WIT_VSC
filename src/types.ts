/**
 * 파일 시스템 아이템 및 코드 심볼의 종류를 정의하는 타입입니다.
 */
export type FsItemType =
    | 'folder'
    | 'file'
    | 'class'
    | 'function'
    | 'variable'
    | 'enum'
    | 'enumMember'
    | 'struct'
    | 'field' // 클래스나 구조체의 멤버 변수
    | 'namespace'
    | 'unknown';

/**
 * 트리 뷰에 표시될 개별 아이템의 데이터 구조입니다.
 */
export interface FsItem {
    name: string;
    path: string;
    type: FsItemType;
    description: string;
}