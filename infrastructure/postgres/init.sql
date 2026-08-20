CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    product VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO orders (customer_name, product, amount, status)
VALUES
    ('Alice', 'Laptop', 1299.99, 'completed'),
    ('Bob', 'Keyboard', 89.99, 'completed'),
    ('Charlie', 'Monitor', 349.99, 'pending'),
    ('David', 'Mouse', 49.99, 'completed'),
    ('Eve', 'Headphones', 199.99, 'pending');