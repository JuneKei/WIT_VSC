-- 'wit' 애플리케이션을 위한 전용 데이터베이스를 생성합니다.
CREATE DATABASE wit_db;

-- 'wit' 사용자를 생성하고 비밀번호를 설정합니다.
CREATE USER wit WITH ENCRYPTED PASSWORD '#';

-- 'wit' 사용자에게 'wit_db' 데이터베이스에 대한 모든 권한을 부여합니다.
GRANT ALL PRIVILEGES ON DATABASE wit_db TO wit;

-- Drop existing objects if they exist, for a clean setup.
DROP TABLE IF EXISTS fs_items;
DROP TABLE IF EXISTS products;
DROP TYPE IF EXISTS fs_item_enum;

-- 1. ENUM 타입 정의
-- 모든 파일 및 심볼 종류를 포함하는 열거형 타입을 생성합니다.
CREATE TYPE fs_item_enum AS ENUM (
    'folder',
    'file',
    'class',
    'function',
    'variable',
    'enum',
    'enumMember',
    'struct',
    'field',
    'namespace',
    'unknown'
);

-- 2. Products 테이블 생성
-- 관리할 각 프로젝트(Product)의 정보를 저장합니다.
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL UNIQUE
);

-- 3. File System Items 테이블 생성
-- 모든 파일, 폴더, 심볼 정보를 계층 구조로 저장합니다.
CREATE TABLE fs_items (
    item_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    
    -- parent_id: 부모 항목의 ID를 가리키는 자기 참조 외래 키입니다.
    -- 최상위 항목(루트)의 경우 NULL 값을 가집니다.
    parent_id INTEGER REFERENCES fs_items(item_id) ON DELETE CASCADE,
    
    item_path TEXT NOT NULL,
    item_type fs_item_enum NOT NULL,
    item_name TEXT NOT NULL,
    description TEXT,
    
    -- 각 Product 내에서 item_path는 고유해야 합니다.
    UNIQUE (product_id, item_path)
);

-- 4. 성능 향상을 위한 인덱스 생성
-- 테이블 간 JOIN 및 계층 구조 검색 속도를 높이기 위해 인덱스를 추가합니다.
CREATE INDEX idx_fs_items_product_id ON fs_items(product_id);
CREATE INDEX idx_fs_items_parent_id ON fs_items(parent_id);
CREATE INDEX idx_fs_items_item_type ON fs_items(item_type);


-- 6. (선택 사항) 초기 데이터 삽입 예시
-- 'WIT-VSC-Extension'이라는 이름의 첫 번째 Product를 추가합니다.
-- INSERT INTO products (product_name) VALUES ('WIT-VSC-Extension');

-- 확인용 SELECT 쿼리
SELECT * FROM products;

-- 스크립트 완료 --