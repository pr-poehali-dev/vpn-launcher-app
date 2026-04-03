import json
import os
import random
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
    """Апгрейдер скинов CS2"""
    cors = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token'}
    
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}
    
    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    conn = get_db()
    
    try:
        # GET /upgrade/skins — список всех скинов для апгрейда
        if method == 'GET':
            cur = conn.cursor()
            cur.execute(f"SELECT id, name, weapon_type, rarity, rarity_color, price, image_url, exterior FROM {SCHEMA}.skins ORDER BY price ASC")
            rows = cur.fetchall()
            skins = [{'id': r[0], 'name': r[1], 'weapon_type': r[2], 'rarity': r[3], 'rarity_color': r[4], 'price': float(r[5]), 'image_url': r[6], 'exterior': r[7]} for r in rows]
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'skins': skins})}
        
        # POST /upgrade — выполнить апгрейд
        if method == 'POST':
            token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token')
            user = get_user_by_token(conn, token)
            if not user:
                return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Требуется авторизация'})}
            
            body = json.loads(event.get('body') or '{}')
            input_inventory_id = body.get('inventory_id')
            target_skin_id = body.get('target_skin_id')
            
            if not input_inventory_id or not target_skin_id:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'inventory_id и target_skin_id обязательны'})}
            
            cur = conn.cursor()
            
            # Проверяем что скин принадлежит юзеру
            cur.execute(f"""
                SELECT ui.id, s.id as skin_id, s.price, s.name
                FROM {SCHEMA}.user_inventory ui
                JOIN {SCHEMA}.skins s ON s.id = ui.skin_id
                WHERE ui.id = %s AND ui.user_id = %s AND ui.sold = FALSE
            """, (input_inventory_id, user['id']))
            inv_row = cur.fetchone()
            if not inv_row:
                return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Скин не найден в инвентаре'})}
            
            input_value = float(inv_row[2])
            
            # Целевой скин
            cur.execute(f"SELECT id, name, price, rarity_color, image_url, rarity, weapon_type, exterior FROM {SCHEMA}.skins WHERE id = %s", (target_skin_id,))
            target_row = cur.fetchone()
            if not target_row:
                return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Целевой скин не найден'})}
            
            target_value = float(target_row[2])
            if target_value <= input_value:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Целевой скин должен стоить больше текущего'})}
            
            # Шанс = input / target * 0.9 (10% маржа)
            chance = min(90.0, round((input_value / target_value) * 90, 2))
            
            success = random.uniform(0, 100) <= chance
            
            # Списываем исходный скин
            cur.execute(f"UPDATE {SCHEMA}.user_inventory SET sold = TRUE WHERE id = %s", (input_inventory_id,))
            
            target_skin = {'id': target_row[0], 'name': target_row[1], 'price': float(target_row[2]), 'rarity_color': target_row[3], 'image_url': target_row[4], 'rarity': target_row[5], 'weapon_type': target_row[6], 'exterior': target_row[7]}
            
            if success:
                cur.execute(f"INSERT INTO {SCHEMA}.user_inventory (user_id, skin_id, source) VALUES (%s, %s, 'upgrade')", (user['id'], target_skin_id))
            
            cur.execute(f"""
                INSERT INTO {SCHEMA}.upgrades (user_id, input_skin_id, target_skin_id, input_value, target_value, chance, success)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (user['id'], inv_row[1], target_skin_id, input_value, target_value, chance, success))
            
            conn.commit()
            
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
                'success': success,
                'chance': chance,
                'target_skin': target_skin,
                'input_value': input_value,
                'target_value': target_value
            })}
        
        return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Not found'})}
    finally:
        conn.close()
