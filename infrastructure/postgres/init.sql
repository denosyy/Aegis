CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    product VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    incident_key VARCHAR(20) UNIQUE NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    affected_service VARCHAR(100),
    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,
    git_commit VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS investigations (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES incidents(id),
    summary TEXT NOT NULL,
    root_cause TEXT,
    evidence TEXT,
    recommended_action TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO orders (customer_name, product, amount, status)
VALUES
    ('Alice', 'Laptop', 1299.99, 'completed'),
    ('Bob', 'Keyboard', 89.99, 'completed'),
    ('Charlie', 'Monitor', 349.99, 'pending'),
    ('David', 'Mouse', 49.99, 'completed'),
    ('Eve', 'Headphones', 199.99, 'pending');

INSERT INTO incidents (
    incident_key,
    severity,
    status,
    title,
    description,
    affected_service,
    git_commit
)
VALUES (
    'INC-0001',
    'low',
    'resolved',
    'Initial Aegis test incident',
    'Test incident used to verify the incident management system.',
    'aegis-api',
    'development'
);