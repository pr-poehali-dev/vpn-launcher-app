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
    """Профиль пользователя и инвентарь"""
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
        
        # GET / — профиль + статистика + инвентарь
        if method == 'GET':
            # Инвентарь
            cur.execute(f"""
                SELECT ui.id, s.id as skin_id, s.name, s.weapon_type, s.rarity, s.rarity_color, s.price, s.image_url, s.exterior, ui.obtained_at, ui.source
                FROM {SCHEMA}.user_inventory ui
                JOIN {SCHEMA}.skins s ON s.id = ui.skin_id
                WHERE ui.user_id = %s AND ui.sold = FALSE
                ORDER BY ui.obtained_at DESC
            """, (user['id'],))
            inv_rows = cur.fetchall()
            inventory = [{'inventory_id': r[0], 'skin_id': r[1], 'name': r[2], 'weapon_type': r[3], 'rarity': r[4], 'rarity_color': r[5], 'price': float(r[6]), 'image_url': r[7], 'exterior': r[8], 'obtained_at': str(r[9]), 'source': r[10]} for r in inv_rows]
            
            # Статистика
            cur.execute(f"SELECT COUNT(*), COALESCE(SUM(price_paid), 0) FROM {SCHEMA}.case_openings WHERE user_id = %s", (user['id'],))
            stat_row = cur.fetchone()
            cases_opened = stat_row[0]
            total_spent = float(stat_row[1])
            
            cur.execute(f"SELECT COUNT(*), COALESCE(SUM(CASE WHEN success THEN 1 ELSE 0 END), 0) FROM {SCHEMA}.upgrades WHERE user_id = %s", (user['id'],))
            upg_row = cur.fetchone()
            upgrades_total = upg_row[0]
            upgrades_won = int(upg_row[1])
            
            inventory_value = sum(item['price'] for item in inventory)
            
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
                'user': user,
                'inventory': inventory,
                'stats': {
                    'cases_opened': cases_opened,
                    'total_spent': total_spent,
                    'upgrades_total': upgrades_total,
                    'upgrades_won': upgrades_won,
                    'inventory_value': round(inventory_value, 2),
                    'inventory_count': len(inventory)
                }
            })}
        
        return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Not found'})}
    finally:
        conn.close()
