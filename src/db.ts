import { Pool, PoolClient, QueryResult } from 'pg';
import * as vscode from 'vscode';

// VS Code 설정에서 DB 접속 정보를 가져옵니다.
const config = vscode.workspace.getConfiguration('wit');
const host = config.get<string>('pgHost');
const port = config.get<number>('pgPort');
const user = config.get<string>('pgUser');
const password = config.get<string>('pgPassword');
const database = config.get<string>('pgDatabase');
const schema = config.get<string>('pgSchema');

let pool: Pool | null = null;

// 필수 정보가 모두 있는지 확인합니다.
if (host && port && user && database) {
    // 모든 정보가 있을 때만 Pool을 생성합니다.
    pool = new Pool({
        host,
        port,
        user,
        password,
        database,
        // 연결 시도 제한 시간을 설정하여 무한 대기를 방지합니다. (예: 10초)
        connectionTimeoutMillis: 10000,
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

    // DB 연결 에러 핸들링
    pool.on('error', (err, client) => {
        console.error('데이터베이스 풀에서 예기치 않은 오류가 발생했습니다.', err);
    });

} else {
    // 필수 정보가 누락된 경우, 사용자에게 알림을 표시합니다.
    vscode.window.showErrorMessage('DB 접속 정보가 누락되었습니다. VS Code 설정을 확인해주세요. Workspace Settings');
    console.error('DB connection information is missing in VS Code settings.');
}

/**
 * 데이터베이스에 쿼리를 실행하는 중앙 함수입니다.
 * DB 연결(Pool)이 없는 경우 에러를 발생시켜 안전하게 실패 처리합니다.
 */
async function query<T extends object>(text: string, params: any[]): Promise<QueryResult<T>> {
    if (!pool) {
        // Pool이 초기화되지 않은 경우, 즉시 에러를 반환합니다.
        throw new Error('데이터베이스 연결이 설정되지 않았습니다. VS Code 설정을 확인하세요.');
    }

    const start = Date.now();
    try {
        const res = await pool.query<T>(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration: `${duration}ms`, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('쿼리 실행 중 오류 발생', { text, error });
        // 에러를 다시 던져서 호출한 쪽(dataService)에서 처리할 수 있도록 합니다.
        throw error;
    }
}

// 애플리케이션 전체에서 사용할 DB 모듈
export default {
    query,
    // pool 객체도 내보내서 필요시 직접 사용할 수 있도록 합니다.
    pool
};