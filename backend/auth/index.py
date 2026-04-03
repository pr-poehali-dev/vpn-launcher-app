import json
import os
import hashlib
import secrets
import psycopg2
from datetime import datetime, timedelta

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p77718230_vpn_launcher_app')

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    return secrets.token_hex(32)

def get_user_by_token(conn, token: str):
    cur = conn.cursor()
    cur.execute(f"""
        SELECT u.id, u.username, u.email, u.balance, u.avatar_url, u.created_at
        FROM {SCHEMA}.sessions s
        JOIN {SCHEMA}.users u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > NOW()
    """, (token,))
    row = cur.fetchone()
    if not row:
        return None
    return {'id': row[0], 'username': row[1], 'email': row[2], 'balance': float(row[3]), 'avatar_url': row[4], 'created_at': str(row[5])}

def handler(event: dict, context) -> dict:
    """Авторизация и регистрация пользователей"""
    cors = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token'}
    
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}
    
    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    
    conn = get_db()
    try:
        # GET /auth/me - получить текущего пользователя
        if method == 'GET' and '/me' in path:
            token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token')
            if not token:
                return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Не авторизован'})}
            user = get_user_by_token(conn, token)
            if not user:
                return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Сессия истекла'})}
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'user': user})}
        
        body = json.loads(event.get('body') or '{}')
        
        # POST /auth/register
        if method == 'POST' and '/register' in path:
            username = body.get('username', '').strip()
            email = body.get('email', '').strip()
            password = body.get('password', '')
            
            if not username or not email or not password:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Все поля обязательны'})}
            if len(username) < 3:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Логин минимум 3 символа'})}
            if len(password) < 6:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Пароль минимум 6 символов'})}
            
            cur = conn.cursor()
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username = %s OR email = %s", (username, email))
            if cur.fetchone():
                return {'statusCode': 409, 'headers': cors, 'body': json.dumps({'error': 'Логин или email уже занят'})}
            
            pw_hash = hash_password(password)
            cur.execute(f"INSERT INTO {SCHEMA}.users (username, email, password_hash) VALUES (%s, %s, %s) RETURNING id, username, email, balance", (username, email, pw_hash))
            user_row = cur.fetchone()
            
            token = generate_token()
            expires = datetime.now() + timedelta(days=30)
            cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)", (user_row[0], token, expires))
            conn.commit()
            
            return {'statusCode': 201, 'headers': cors, 'body': json.dumps({
                'token': token,
                'user': {'id': user_row[0], 'username': user_row[1], 'email': user_row[2], 'balance': float(user_row[3])}
            })}
        
        # POST /auth/login
        if method == 'POST' and '/login' in path:
            username = body.get('username', '').strip()
            password = body.get('password', '')
            
            if not username or not password:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Введите логин и пароль'})}
            
            pw_hash = hash_password(password)
            cur = conn.cursor()
            cur.execute(f"SELECT id, username, email, balance, avatar_url FROM {SCHEMA}.users WHERE (username = %s OR email = %s) AND password_hash = %s", (username, username, pw_hash))
            user_row = cur.fetchone()
            
            if not user_row:
                return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Неверный логин или пароль'})}
            
            token = generate_token()
            expires = datetime.now() + timedelta(days=30)
            cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)", (user_row[0], token, expires))
            conn.commit()
            
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
                'token': token,
                'user': {'id': user_row[0], 'username': user_row[1], 'email': user_row[2], 'balance': float(user_row[3]), 'avatar_url': user_row[4]}
            })}
        
        # POST /auth/logout
        if method == 'POST' and '/logout' in path:
            token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token')
            if token:
                cur = conn.cursor()
                cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE token = %s", (token,))
                conn.commit()
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'ok': True})}
        
        return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Not found'})}
    finally:
        conn.close()
