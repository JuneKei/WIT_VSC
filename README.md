# WIT (What Is This)

코드와 파일 구조에 대한 설명을 데이터베이스에 기록하고, 필요할 때마다 확인하여 코드 이해를 돕는 VSCode 익스텐션입니다.

---

## 주요 기능

* **파일 및 심볼 정보 표시**: 현재 열려있는 파일의 경로와 코드 내 심볼(클래스, 함수, 변수 등)의 계층 구조를 WIT 패널에 트리 형태로 보여줍니다.
* **설명 추가 및 수정**: 각 파일 및 심볼 트리의 각 항목을 클릭하여 설명을 추가하거나 수정할 수 있습니다.
* **데이터베이스 연동**: 작성된 설명은 PostgreSQL 데이터베이스에 저장되어 팀원들과 공유하거나 다른 환경에서도 동일한 정보를 확인할 수 있습니다.
* **자동 정보 업데이트**: 파일을 변경하거나 커서 위치를 이동할 때마다 WIT 패널의 정보가 자동으로 업데이트됩니다.

## 요구사항

* **PostgreSQL**: 데이터베이스 서버가 필요합니다.

## 설정

`settings.json` 파일에 다음 설정을 추가하여 데이터베이스에 연결할 수 있습니다:

* `wit.pgHost`: PostgreSQL 호스트 주소
* `wit.pgPort`: PostgreSQL 포트
* `wit.pgUser`: PostgreSQL 사용자 이름
* `wit.pgPassword`: PostgreSQL 비밀번호
* `wit.pgDatabase`: PostgreSQL 데이터베이스
* `wit.pgSchema`: PostgreSQL 스키마