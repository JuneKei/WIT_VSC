import * as vscode from 'vscode';
import db from './db'; // 실제 DB 모듈 import
import type { FsItem, FsItemType } from './types';

// 전역 변수로 현재 Product ID를 저장하여 반복적인 DB 조회를 피합니다.
let currentProductId: number | null = null;

/**
 * Product 이름을 받아 DB에서 ID를 찾아 반환합니다. 없으면 새로 생성합니다.
 * @param productName 찾거나 생성할 Product의 이름
 * @returns Product의 ID
 */
export async function getProductId(productName: string): Promise<number | null> {
    if (currentProductId) {
        return currentProductId;
    }
    try {
        let result = await db.query<{ product_id: number }>(
            'SELECT product_id FROM products WHERE product_name = $1',
            [productName]
        );

        if (result.rows.length > 0) {
            currentProductId = result.rows[0].product_id;
        } else {
            result = await db.query<{ product_id: number }>(
                'INSERT INTO products (product_name) VALUES ($1) RETURNING product_id',
                [productName]
            );
            currentProductId = result.rows[0].product_id;
            vscode.window.showInformationMessage(`WIT: 새로운 제품 '${productName}'이(가) 등록되었습니다.`);
        }
        
        console.log(`Current Product ID: ${currentProductId}`);
        return currentProductId;
    } catch (error) {
        console.error("데이터베이스 오류 (getProductId):", error);
        vscode.window.showErrorMessage('WIT 데이터베이스에 연결하지 못했습니다.');
        return null;
    }
}

/**
 * DB에서 여러 항목의 정보를 조회합니다. DB에 없는 항목은 기본값으로 반환합니다.
 * @param productId 현재 Product의 ID
 * @param items 조회할 항목의 기본 정보 배열
 * @returns 설명이 포함된 전체 FsItem 객체 배열
 */
export async function getInfosFromDB(productId: number, items: { name: string, path: string, type: FsItemType }[]): Promise<FsItem[]> {
    if (items.length === 0) {
        return [];
    }

    const paths = items.map(item => item.path);
    const queryText = `
        SELECT item_path, description
        FROM fs_items
        WHERE product_id = $1 AND item_path = ANY($2::text[])
    `;

    try {
        const { rows } = await db.query<{ item_path: string, description: string }>(queryText, [productId, paths]);

        // DB에서 찾은 설명을 Map으로 변환하여 조회 성능을 높입니다.
        const descriptions = new Map<string, string>(rows.map(row => [row.item_path, row.description]));
        
        // 원본 item 배열에 DB에서 찾은 설명을 합쳐줍니다.
        return items.map(item => ({
            ...item,
            description: descriptions.get(item.path) || '클릭하여 설명을 추가하세요.'
        }));
    } catch (error) {
        console.error("데이터베이스 오류 (getInfosFromDB):", error);
        // 오류가 발생해도 기본 설명으로 UI가 렌더링되도록 처리합니다.
        return items.map(item => ({ ...item, description: 'DB 오류 발생' }));
    }
}

/**
 * DB에 항목의 설명을 추가하거나 업데이트합니다. (UPSERT)
 * @param productId 현재 Product의 ID
 * @param item 업데이트할 항목의 전체 정보
 */
export async function updateInfoInDB(productId: number, item: FsItem): Promise<void> {
    const { path, type, name, description } = item;

    const queryText = `
        INSERT INTO fs_items (product_id, item_path, item_type, item_name, description, parent_id)
        VALUES ($1, $2, $3, $4, $5, (SELECT item_id FROM fs_items WHERE product_id = $1 AND item_path = $6))
        ON CONFLICT (product_id, item_path)
        DO UPDATE SET
            description = EXCLUDED.description
    `;
    
    try {
        // 부모 경로를 계산합니다.
        const parentPath = path.includes('#') ? path.substring(0, path.lastIndexOf('#')) : path.substring(0, path.lastIndexOf('/'));
        
        await db.query(queryText, [productId, path, type, name, description, parentPath || null]);
        console.log(`DB-UPSERT: "${path}" -> "${description}"`);
    } catch (error) {
        console.error("데이터베이스 오류 (updateInfoInDB):", error);
        vscode.window.showErrorMessage(`'${name}' 항목의 설명을 저장하는 데 실패했습니다.`);
    }
}