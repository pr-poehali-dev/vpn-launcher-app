CREATE TABLE IF NOT EXISTS t_p77718230_vpn_launcher_app.sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p77718230_vpn_launcher_app.skins (
    id SERIAL PRIMARY KEY,
    market_hash_name VARCHAR(500) NOT NULL,
    name VARCHAR(500) NOT NULL,
    weapon_type VARCHAR(100),
    rarity VARCHAR(50),
    rarity_color VARCHAR(20),
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    exterior VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p77718230_vpn_launcher_app.cases (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p77718230_vpn_launcher_app.case_skins (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL,
    skin_id INTEGER NOT NULL,
    drop_chance DECIMAL(8,4) NOT NULL DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS t_p77718230_vpn_launcher_app.case_openings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    case_id INTEGER,
    skin_id INTEGER,
    price_paid DECIMAL(10,2) NOT NULL,
    skin_value DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p77718230_vpn_launcher_app.upgrades (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    input_skin_id INTEGER,
    target_skin_id INTEGER,
    input_value DECIMAL(10,2) NOT NULL,
    target_value DECIMAL(10,2) NOT NULL,
    chance DECIMAL(5,2) NOT NULL,
    success BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p77718230_vpn_launcher_app.transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    type VARCHAR(30) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    payment_id VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p77718230_vpn_launcher_app.user_inventory (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    skin_id INTEGER NOT NULL,
    obtained_at TIMESTAMP DEFAULT NOW(),
    source VARCHAR(50) DEFAULT 'case',
    sold BOOLEAN DEFAULT FALSE
);
