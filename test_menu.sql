CREATE TABLE user_settings (
    id INT PRIMARY KEY,
    user_id INT,
    setting_key VARCHAR(100),
    setting_value TEXT
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);