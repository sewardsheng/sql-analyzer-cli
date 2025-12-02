-- 安全问题：敏感数据暴露测试用例
-- 问题描述：明文密码查询、敏感字段无保护、个人隐私数据暴露等

-- 1. 明文密码查询
-- 问题：查询明文存储的密码信息
SELECT password, credit_card FROM users;
SELECT user_id, password_hash, security_answer FROM user_credentials;
SELECT * FROM auth_tokens WHERE token IS NOT NULL;

-- 2. 敏感字段无保护
-- 问题：查询敏感个人信息
SELECT ssn, passport_number, driver_license FROM users;
SELECT credit_card_number, cvv, expiry_date FROM payment_methods;
SELECT bank_account, routing_number FROM financial_accounts;

-- 3. 个人隐私数据暴露
-- 问题：查询个人隐私相关信息
SELECT home_address, phone_number, email, date_of_birth FROM users;
SELECT medical_history, insurance_number FROM patient_records;
SELECT salary, tax_id, bank_account FROM employee_records;

-- 4. API密钥和令牌暴露
-- 问题：查询系统认证信息
SELECT api_key, secret_key, access_token FROM api_credentials;
SELECT session_token, refresh_token FROM user_sessions;
SELECT private_key, certificate FROM ssl_certificates;

-- 5. 系统配置暴露
-- 问题：查询系统敏感配置
SELECT database_password, smtp_password FROM system_config;
SELECT aws_secret_key, azure_secret FROM cloud_config;
SELECT encryption_key, signing_key FROM security_config;

-- 6. 日志中的敏感信息
-- 问题：查询包含敏感信息的日志
SELECT * FROM logs WHERE message LIKE '%password%';
SELECT * FROM error_logs WHERE stack_trace LIKE '%credit_card%';
SELECT * FROM audit_logs WHERE action LIKE '%ssn%';

-- 7. 备份数据暴露
-- 问题：查询未脱敏的备份数据
SELECT * FROM users_backup WHERE password IS NOT NULL;
SELECT * FROM financial_data_backup WHERE account_number IS NOT NULL;

-- 8. 第三方集成数据
-- 问题：查询第三方服务数据
SELECT oauth_token, refresh_token FROM external_services;
SELECT third_party_id, api_secret FROM integrations;

-- 9. 通信内容暴露
-- 问题：查询通信记录中的敏感信息
SELECT message_content, sender_info FROM messages WHERE is_encrypted = 0;
SELECT email_body, attachments FROM email_logs WHERE is_secure = 0;

-- 10. 位置信息暴露
-- 问题：查询精确位置信息
SELECT gps_coordinates, home_address FROM user_locations;
SELECT ip_address, last_location FROM login_history;

-- 11. 健康信息暴露
-- 问题：查询个人健康信息
SELECT medical_conditions, prescriptions, test_results FROM health_records;
SELECT mental_health_notes, therapy_records FROM counseling_sessions;

-- 12. 财务信息暴露
-- 问题：查询详细财务信息
SELECT account_balance, transaction_history, investment_portfolio FROM financial_data;
SELECT credit_score, debt_information, income_details FROM credit_reports;

-- 13. 教育记录暴露
-- 问题：查询教育相关敏感信息
SELECT grades, disciplinary_records, special_needs FROM student_records;
SELECT academic_probation_reason, conduct_violations FROM school_discipline;

-- 14. 法律记录暴露
-- 问题：查询法律相关敏感信息
SELECT case_details, legal_charges, criminal_record FROM legal_documents;
SELECT court_records, settlement_details FROM litigation_history;

-- 15. 生物识别数据暴露
-- 问题：查询生物识别信息
SELECT fingerprint_data, facial_scan, iris_pattern FROM biometric_data;
SELECT voice_signature, dna_sequence FROM biometric_profiles;

-- 16. 调试信息中的敏感数据
-- 问题：调试模式下暴露敏感信息
SELECT * FROM debug_logs WHERE data LIKE '%password%';
SELECT stack_trace, request_data FROM error_details WHERE is_production = 1;