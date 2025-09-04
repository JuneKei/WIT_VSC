import { Pool, PoolClient, QueryResult } from 'pg';
import * as vscode from 'vscode'; // vscode 모듈 추가

// VS Code 설정에서 DB 접속 정보를 가져옵니다.
const config = vscode.workspace.getConfiguration('wit');
const host = config.get<string>('pgHost');
const port = config.get<number>('pgPort');
const user = config.get<string>('pgUser');
const password = config.get<string>('pgPassword');
const database = config.get<string>('pgDatabase');
const schema = config.get<string>('pgSchema');

// 필수 정보가 누락된 경우를 처리합니다.
if (!host || !port || !user || !database) {
    // throw new Error('DB connection information is missing in VS Code settings.');
    // 또는 사용자에게 알림을 표시하는 다른 로직을 추가할 수 있습니다.
    vscode.window.showErrorMessage('DB 접속 정보가 누락되었습니다. VS Code 설정을 확인해주세요.');
}

// PostgreSQL 연결 풀을 생성합니다.
const pool = new Pool({
    host,
    port,
    user,
    password,
    database,
});

/**
 * SQL 인젝션을 방지하기 위해 스키마 이름을 안전하게 이스케이프 처리합니다.
 * 허용된 문자(알파벳, 숫자, 밑줄) 외에는 모두 제거합니다.
 */
const safeSchema = (schema || 'public').replace(/[^a-zA-Z0-9_]/g, '');

/**
 * 새로운 클라이언트가 풀에 연결될 때마다,
 * 해당 클라이언트의 세션에 대한 기본 스키마를 설정합니다.
 */
pool.on('connect', (client: PoolClient) => {
    // 따옴표로 스키마 이름을 감싸 PostgreSQL의 표준을 따릅니다.
    client.query(`SET search_path TO "${safeSchema}"`);
});

/**
 * 데이터베이스에 쿼리를 실행하는 중앙 함수입니다.
 */
async function query<T extends object>(text: string, params: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
        const res = await pool.query<T>(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration: `${duration}ms`, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Error executing query', { text, error });
        throw error;
    }
}

// 애플리케이션 전체에서 사용할 DB 모듈
export default {
    query,
    pool
};
