import json
import os
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p77718230_vpn_launcher_app')

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_user_by_token(conn, token: str):
    if not token:
        return None
    cur = conn.cursor()
    cur.execute(f"""
        SELECT u.id, u.username, u.balance
        FROM {SCHEMA}.sessions s
        JOIN {SCHEMA}.users u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > NOW()
    """, (token,))
    row = cur.fetchone()
    if not row:
        return None
    return {'id': row[0], 'username': row[1], 'balance': float(row[2])}

def handler(event: dict, context) -> dict:
    """Управление балансом: депозит, вывод, история транзакций"""
    cors = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token'}
    
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}
    
    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token')
    
    conn = get_db()
    try:
        user = get_user_by_token(conn, token)
        if not user:
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Требуется авторизация'})}
        
        cur = conn.cursor()
        
        # GET /balance — текущий баланс и история
        if method == 'GET':
            cur.execute(f"""
                SELECT type, amount, status, description, created_at
                FROM {SCHEMA}.transactions
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 20
            """, (user['id'],))
            rows = cur.fetchall()
            txs = [{'type': r[0], 'amount': float(r[1]), 'status': r[2], 'description': r[3], 'created_at': str(r[4])} for r in rows]
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'balance': user['balance'], 'transactions': txs})}
        
        body = json.loads(event.get('body') or '{}')
        
        # POST /balance/deposit — пополнение (симуляция, реальная интеграция ЮКассы будет отдельной функцией)
        if method == 'POST' and '/deposit' in path:
            amount = float(body.get('amount', 0))
            if amount < 10:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Минимальный депозит 10 CLD'})}
            if amount > 100000:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Максимальный депозит 100 000 CLD'})}
            
            # Симуляция — в продакшн здесь будет ЮКасса redirect URL
            cur.execute(f"UPDATE {SCHEMA}.users SET balance = balance + %s WHERE id = %s", (amount, user['id']))
            cur.execute(f"INSERT INTO {SCHEMA}.transactions (user_id, type, amount, status, description) VALUES (%s, 'deposit', %s, 'completed', %s)", 
                       (user['id'], amount, f'Пополнение баланса на {amount} CLD'))
            conn.commit()
            
            cur.execute(f"SELECT balance FROM {SCHEMA}.users WHERE id = %s", (user['id'],))
            new_balance = float(cur.fetchone()[0])
            
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'new_balance': new_balance, 'deposited': amount})}
        
        # POST /balance/withdraw — вывод
        if method == 'POST' and '/withdraw' in path:
            amount = float(body.get('amount', 0))
            payment_details = body.get('payment_details', '')
            
            if amount < 100:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Минимальный вывод 100 CLD'})}
            if user['balance'] < amount:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': f'Недостаточно средств. Доступно: {user["balance"]} CLD'})}
            if not payment_details:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Укажите реквизиты для вывода'})}
            
            cur.execute(f"UPDATE {SCHEMA}.users SET balance = balance - %s WHERE id = %s", (amount, user['id']))
            cur.execute(f"INSERT INTO {SCHEMA}.transactions (user_id, type, amount, status, description) VALUES (%s, 'withdraw', %s, 'pending', %s)",
                       (user['id'], amount, f'Вывод {amount} CLD на {payment_details}'))
            conn.commit()
            
            cur.execute(f"SELECT balance FROM {SCHEMA}.users WHERE id = %s", (user['id'],))
            new_balance = float(cur.fetchone()[0])
            
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'new_balance': new_balance, 'withdrawn': amount, 'status': 'pending'})}
        
        # POST /balance/sell — продать скин из инвентаря
        if method == 'POST' and '/sell' in path:
            inventory_id = body.get('inventory_id')
            if not inventory_id:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'inventory_id required'})}
            
            cur.execute(f"""
                SELECT ui.id, s.price, s.name
                FROM {SCHEMA}.user_inventory ui
                JOIN {SCHEMA}.skins s ON s.id = ui.skin_id
                WHERE ui.id = %s AND ui.user_id = %s AND ui.sold = FALSE
            """, (inventory_id, user['id']))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Скин не найден'})}
            
            skin_price = float(row[1])
            skin_name = row[2]
            
            cur.execute(f"UPDATE {SCHEMA}.user_inventory SET sold = TRUE WHERE id = %s", (inventory_id,))
            cur.execute(f"UPDATE {SCHEMA}.users SET balance = balance + %s WHERE id = %s", (skin_price, user['id']))
            cur.execute(f"INSERT INTO {SCHEMA}.transactions (user_id, type, amount, status, description) VALUES (%s, 'sell', %s, 'completed', %s)",
                       (user['id'], skin_price, f'Продажа {skin_name} за {skin_price} CLD'))
            conn.commit()
            
            cur.execute(f"SELECT balance FROM {SCHEMA}.users WHERE id = %s", (user['id'],))
            new_balance = float(cur.fetchone()[0])
            
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'new_balance': new_balance, 'sold_for': skin_price})}
        
        return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Not found'})}
    finally:
        conn.close()
