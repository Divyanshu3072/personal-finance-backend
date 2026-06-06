CREATE USER finance_user WITH PASSWORD 'finance_password' CREATEDB;
CREATE DATABASE personal_finance;
GRANT ALL PRIVILEGES ON DATABASE personal_finance TO finance_user;
ALTER DATABASE personal_finance OWNER TO finance_user;
