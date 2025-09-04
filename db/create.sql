-- WIT Extension PostgreSQL Schema Setup Script
-- This script creates all necessary types, tables, triggers, and initial data.
-- =================================================================
-- 'wit' 애플리케이션을 위한 전용 데이터베이스를 생성합니다.
CREATE DATABASE wit_db;

-- 'wit' 사용자를 생성하고 비밀번호를 설정합니다.
CREATE USER wit WITH ENCRYPTED PASSWORD '#';

-- 'wit' 사용자에게 'wit_db' 데이터베이스에 대한 모든 권한을 부여합니다.
GRANT ALL PRIVILEGES ON DATABASE wit_db TO wit;

CREATE SCHEMA wit_schema AUTHORIZATION wit;

-- 1. ENUM 타입 정의
CREATE TYPE fs_item_enum AS ENUM (
    'folder',
    'file',
    'function',
    'variable',
    'class',
    'unknown'
);

-- 2. 테이블 생성
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE fs_items (
    item_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    item_path TEXT NOT NULL,          
    item_type fs_item_enum NOT NULL,
    item_name TEXT NOT NULL,
    description TEXT
    
    UNIQUE (product_id, item_path)
);

-- 4. 초기 데이터 삽입
INSERT INTO products (product_name) VALUES ('wit-vscode-extension');
