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
    """Получение кейсов и их открытие"""
    cors = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token'}
    
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}
    
    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    conn = get_db()
    
    try:
        # GET / — список кейсов
        if method == 'GET' and '/open' not in path and '/skins' not in path:
            cur = conn.cursor()
            cur.execute(f"SELECT id, name, description, image_url, price, sort_order FROM {SCHEMA}.cases WHERE is_active = TRUE ORDER BY sort_order")
            rows = cur.fetchall()
            cases = []
            for r in rows:
                cases.append({'id': r[0], 'name': r[1], 'description': r[2], 'image_url': r[3], 'price': float(r[4]), 'sort_order': r[5]})
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'cases': cases})}
        
        # GET /cases/{id}/skins — скины в кейсе
        if method == 'GET' and '/skins' in path:
            parts = path.strip('/').split('/')
            case_id = None
            for i, p in enumerate(parts):
                if p == 'skins' and i > 0:
                    try:
                        case_id = int(parts[i-1])
                    except:
                        pass
            if not case_id:
                qs = event.get('queryStringParameters') or {}
                case_id = qs.get('case_id')
            if not case_id:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'case_id required'})}
            cur = conn.cursor()
            cur.execute(f"""
                SELECT s.id, s.name, s.weapon_type, s.rarity, s.rarity_color, s.price, s.image_url, s.exterior, cs.drop_chance
                FROM {SCHEMA}.case_skins cs
                JOIN {SCHEMA}.skins s ON s.id = cs.skin_id
                WHERE cs.case_id = %s
                ORDER BY s.price DESC
            """, (case_id,))
            rows = cur.fetchall()
            skins = [{'id': r[0], 'name': r[1], 'weapon_type': r[2], 'rarity': r[3], 'rarity_color': r[4], 'price': float(r[5]), 'image_url': r[6], 'exterior': r[7], 'drop_chance': float(r[8])} for r in rows]
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'skins': skins})}
        
        # POST /cases/open — открыть кейс
        if method == 'POST' and '/open' in path:
            token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token')
            user = get_user_by_token(conn, token)
            if not user:
                return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Требуется авторизация'})}
            
            body = json.loads(event.get('body') or '{}')
            case_id = body.get('case_id')
            if not case_id:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'case_id required'})}
            
            cur = conn.cursor()
            cur.execute(f"SELECT id, name, price FROM {SCHEMA}.cases WHERE id = %s AND is_active = TRUE", (case_id,))
            case_row = cur.fetchone()
            if not case_row:
                return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Кейс не найден'})}
            
            case_price = float(case_row[2])
            if user['balance'] < case_price:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': f'Недостаточно CLD. Нужно {case_price}, у вас {user["balance"]}'})}
            
            # Получаем скины с шансами
            cur.execute(f"""
                SELECT s.id, s.name, s.weapon_type, s.rarity, s.rarity_color, s.price, s.image_url, s.exterior, cs.drop_chance
                FROM {SCHEMA}.case_skins cs
                JOIN {SCHEMA}.skins s ON s.id = cs.skin_id
                WHERE cs.case_id = %s
            """, (case_id,))
            skin_rows = cur.fetchall()
            if not skin_rows:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'В кейсе нет скинов'})}
            
            # Взвешенный случайный выбор
            skins = [{'id': r[0], 'name': r[1], 'weapon_type': r[2], 'rarity': r[3], 'rarity_color': r[4], 'price': float(r[5]), 'image_url': r[6], 'exterior': r[7], 'drop_chance': float(r[8])} for r in skin_rows]
            total = sum(s['drop_chance'] for s in skins)
            rand = random.uniform(0, total)
            cumulative = 0
            won_skin = skins[-1]
            for s in skins:
                cumulative += s['drop_chance']
                if rand <= cumulative:
                    won_skin = s
                    break
            
            # Списываем баланс, добавляем скин в инвентарь
            cur.execute(f"UPDATE {SCHEMA}.users SET balance = balance - %s WHERE id = %s", (case_price, user['id']))
            cur.execute(f"INSERT INTO {SCHEMA}.user_inventory (user_id, skin_id, source) VALUES (%s, %s, 'case')", (user['id'], won_skin['id']))
            cur.execute(f"INSERT INTO {SCHEMA}.case_openings (user_id, case_id, skin_id, price_paid, skin_value) VALUES (%s, %s, %s, %s, %s)", (user['id'], case_id, won_skin['id'], case_price, won_skin['price']))
            
            cur.execute(f"SELECT balance FROM {SCHEMA}.users WHERE id = %s", (user['id'],))
            new_balance = float(cur.fetchone()[0])
            conn.commit()
            
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
                'skin': won_skin,
                'new_balance': new_balance,
                'case_name': case_row[1]
            })}
        
        return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Not found'})}
    finally:
        conn.close()
