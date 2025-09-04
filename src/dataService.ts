import * as vscode from 'vscode';
import * as path from 'path';
import { FsItem, FsItemType } from './types';
import db from './db'; // DB 모듈 import

// --- 리팩토링된 코드 ---

// 반복 사용되는 값들을 상수로 정의하여 관리 용이성 및 가독성 향상
// const PRODUCT_ID = 1;
const config = vscode.workspace.getConfiguration('wit');
const PRODUCT_NAME = config.get<string>('product_name');
const DEFAULT_DESCRIPTION = '아직 등록된 설명이 없습니다. 클릭하여 추가하세요.';

// product_id를 저장할 전역 변수
let globalProductId: number | null = null;
/**
 * 데이터베이스에서 조회된 행(Row)의 데이터 구조를 정의합니다.
 */
interface FsItemDbRow {
    item_path: string;
    item_name: string;
    item_type: FsItemType;
    description: string | null; // DB의 description은 NULL일 수 있습니다.
}


/**
 * 경로(path)와 설명(description)을 기반으로 FsItem 객체를 생성하는 팩토리 함수입니다.
 * 객체 생성 로직을 중앙에서 관리하여 일관성을 유지합니다.
 * @param p - 파일 시스템 아이템의 상대 경로
 * @param description - 아이템의 설명 (optional)
 * @returns FsItem 객체
 */
function createFsItemFromPath(p: string, description?: string | null): FsItem {
    return {
        path: p,
        name: determineNameFromPath(p),
        type: determineTypeFromPath(p),
        description: description || DEFAULT_DESCRIPTION,
    };
}

/**
 * 주어진 PRODUCT NAME 에 해당하는 PRODUCT ID를 DB에서 조회합니다.
 * @returns 각 경로에 대한 정보 객체의 배열
 */
export async function getProductIdFromDB(): Promise<void> {
    if (!PRODUCT_NAME || PRODUCT_NAME.length === 0) {
        console.warn("Product name is not set.");
        globalProductId = null;
        return;
    }

    try {
        const queryText = `
            SELECT product_id FROM products WHERE product_name = $1
        `;
        const { rows } = await db.query<{ product_id: number }>(queryText, [PRODUCT_NAME]);

        if (rows.length > 0) {
            globalProductId = rows[0].product_id;
            console.log(`Successfully fetched product ID: ${globalProductId}`);
        } else {
            console.warn(`Product '${PRODUCT_NAME}' not found in the database.`);
            globalProductId = null;
        }
    } catch (error) {
        console.error("Error fetching product ID from DB:", error);
        globalProductId = null;
    }
}
/**
 * 주어진 경로 배열에 해당하는 정보를 DB에서 조회합니다.
 * @param paths - 조회할 상대 경로들의 배열
 * @returns 각 경로에 대한 정보 객체의 배열
 */
export async function getInfoFromDB(paths: string[]): Promise<FsItem[]> {
    if (paths.length === 0) {
        return [];
    }

    const queryText = `
        SELECT item_path, item_name, item_type, description
        FROM fs_items
        WHERE product_id = $1 AND item_path = ANY($2::text[])
    `;
    // db.query에 제네릭<FsItemDbRow>을 사용하여 반환 타입을 명시합니다.
    const { rows } = await db.query<FsItemDbRow>(queryText, [globalProductId, paths]);

    // DB에서 찾은 정보를 Map으로 변환하여 조회 성능을 향상시킵니다.
    const foundItems = new Map<string, FsItem>(
        rows.map(row => [row.item_path, createFsItemFromPath(row.item_path, row.description)])
    );
    
    // 요청된 모든 경로에 대해, DB에 정보가 없으면 기본값을 생성하여 반환합니다.
    return paths.map(p => foundItems.get(p) || createFsItemFromPath(p));
}

/**
 * DB의 설명을 업데이트하거나 새로 생성합니다. (Upsert)
 * @param relativePath - 업데이트할 항목의 상대 경로
 * @param newDescription - 새로운 설명 텍스트
 */
export async function updateInfoInDB(relativePath: string, newDescription: string): Promise<void> {
    const type = determineTypeFromPath(relativePath);
    const name = determineNameFromPath(relativePath);

    // PostgreSQL의 UPSERT(INSERT ... ON CONFLICT) 구문을 사용하여 단일 쿼리로 효율적인 데이터 처리를 합니다.
    const queryText = `
        INSERT INTO fs_items (product_id, item_path, item_type, item_name, description)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (product_id, item_path)
        DO UPDATE SET
            description = EXCLUDED.description,
            updated_at = NOW();
    `;
    
    await db.query(queryText, [globalProductId, relativePath, type, name, newDescription]);
    console.log(`DB-GLOBAL-UPSERT: ${relativePath} -> "${newDescription}"`);
}

/**
 * 경로 문자열을 기반으로 아이템의 타입을 결정합니다.
 */
function determineTypeFromPath(p: string): FsItemType {
    if (p.includes('#')) return 'function';
    if (path.extname(p)) return 'file';
    return 'folder';
}

/**
 * 경로 문자열을 기반으로 아이템의 이름을 결정합니다.
 */
function determineNameFromPath(p: string): string {
    if (p.includes('#')) return p.split('#')[1] || '';
    return path.basename(p);
}

