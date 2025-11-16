SELECT u.id, u.name, p.title, p.content FROM users u JOIN posts p ON u.id = p.user_id WHERE u.status = 'active' AND p.created_at > '2023-01-01' ORDER BY p.created_at DESC LIMIT 10
